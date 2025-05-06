// Posible ruta: app/api/auth/[...nextauth]/route.ts
// O si usas Pages Router: pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"; // Importa directamente CredentialsProvider
import { signInSchema } from "@/lib/zod"; // Asegúrate que la ruta a tu schema Zod sea correcta
// Importa la interfaz User AUMENTADA de tu archivo de declaraciones
// Ajusta la ruta si tu archivo next-auth.d.ts está en otro lugar (ej: 'types/next-auth.d.ts')
import type { Account, NextAuthConfig, Profile, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";

// Configuración de NextAuth
const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // --- Opcional pero recomendado: Añade viewOfficeId aquí para claridad ---
        viewOfficeId: { label: "View Office ID", type: "text" }
      },
      async authorize(credentials): Promise<User | null> {
        // --- Log para ver qué credenciales llegan ---
        console.log("[NextAuth Authorize] 1. Received credentials:", credentials);

        try {
          // Valida email y password (Zod u otra)
          // const validationResult = await signInSchema.safeParseAsync(credentials); ...
          // if (!validationResult.success) return null;
          // const { email, password } = validationResult.data;
          // O validación simple si Zod no incluye viewOfficeId:
          if (!credentials?.email || !credentials?.password) {
            console.error("[NextAuth Authorize] Missing email or password in credentials.");
            return null;
          }
          const email = credentials.email as string;
          const password = credentials.password as string;
          // Guarda el viewOfficeId si existe
          const viewOfficeId = credentials.viewOfficeId as string | undefined; // Obtiene el ID opcional


          // --- CORRECCIÓN: Construye el payload para el backend ---
          const bodyPayload: Record<string, string> = {
            email,
            password
          };
          // Añade viewOfficeId si existe
          if (viewOfficeId) {
            bodyPayload.viewOfficeId = viewOfficeId;
          }
          console.log("[NextAuth Authorize] 2. Sending this body to backend:", bodyPayload);
          // --- FIN CORRECCIÓN ---


          // Llamada al backend
          const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`;
          const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(bodyPayload) // <-- Envía el payload correcto
          });

          console.log(`[NextAuth Authorize] 3. Backend response status: ${response.status}`);
          let data;
          try { data = await response.json(); } catch (e) { data = null; } // Manejo básico de parseo
          console.log("[NextAuth Authorize] 4. Backend response data:", JSON.stringify(data, null, 2));

          // Validar respuesta del backend
          if (!response.ok || !data?.user || !data?.accessToken || !data.user.officeId) {
            const backendErrorMsg = data?.message || `Backend returned status ${response.status}`;
            console.warn("[NextAuth Authorize] Backend login failed:", backendErrorMsg);
            // Lanza error para que signIn reciba el mensaje
            throw new Error(backendErrorMsg);
          }

          // Construir y retornar el objeto User para NextAuth
          const userForNextAuth: User = {
            id: data.user.id.toString(),
            email: data.user.email,
            name: data.user.name ?? null,
            role: data.user.role ?? null,
            officeId: data.user.officeId,   // <-- El officeId devuelto por el backend
            accessToken: data.accessToken, // <-- El token del backend
          };
          console.log("[NextAuth Authorize] 5. Returning user object to NextAuth:", userForNextAuth);
          return userForNextAuth;

        } catch (error: unknown) {
          console.error("[NextAuth Authorize] Error:", error);
          // Lanza el error para que signIn lo maneje
          // Puedes personalizar el mensaje aquí si quieres
          throw new Error(error instanceof Error ? error.message : "Authentication process failed");
          // Devolver null también funciona, pero lanzar da más info
          // return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login", // Tu página de login
    error: "/auth/error"   // Página para mostrar errores (ej: /auth/error?error=CredentialsSignin)
  },
  session: {
    strategy: "jwt",        // Esencial para usar callbacks jwt/session
    maxAge: 24 * 60 * 60,   // 24 horas (opcional)
  },
  // cookies: { ... } // Tu configuración de cookies
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }: {
      token: JWT;
      user?: User;
      account?: Account | null;
      profile?: Profile;
      isNewUser?: boolean;
    }): Promise<JWT> {

      if (user) {
        console.log("[NextAuth JWT Callback] Initial sign in. Merging user data into token:", user);
        // Make sure these values exist before assigning
        token.id = typeof user.id === 'string' ? user.id : ''; // O usa user.id! si estás MUY seguro
        token.email = typeof user.email === 'string' ? user.email : '';
        // Add null checks or non-null assertions
        token.name = user.name || null;
        token.role = user.role || null;
        token.officeId = user.officeId || ""; // Convert undefined to empty string
        token.accessToken = user.accessToken || ""; // Convert undefined to empty string
      }

      return token;
    },

    async session({ session, token }: {
      session: Session;
      token: JWT;
    }): Promise<Session> {

      if (token) {
        // Add null checks for all properties that might be undefined
        session.user.id = token.id || "";
        session.user.name = token.name || null;
        session.user.email = token.email || "";
        session.user.role = token.role || null;
        session.user.officeId = token.officeId || ""; // Use empty string instead of undefined
        session.accessToken = token.accessToken || ""; // Use empty string instead of undefined
      } else {
        console.warn("[NextAuth Session Callback] Warning: Token object was unexpectedly empty.");
      }

      return session;
    }
  },
  trustHost: true, // Puede ser necesario en algunos entornos
  // debug: process.env.NODE_ENV === 'development', // Activa logs detallados de NextAuth
};

// Exportación para App Router (route.ts)
// Si usas Pages Router, la exportación es diferente (export default NextAuth(authOptions))
export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);

// Si usas Pages Router (pages/api/auth/[...nextauth].ts), la exportación sería:
// export default NextAuth(authOptions);