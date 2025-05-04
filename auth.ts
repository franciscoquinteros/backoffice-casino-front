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
      // No necesitas 'credentials' aquí si usas tu propio formulario,
      // pero 'authorize' es esencial.
      name: "Credentials", // Nombre para el proveedor
      credentials: {
        // Define los campos que tu formulario envía, ayuda a NextAuth
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<User | null> {
        console.log("[NextAuth Authorize] Attempting authorization...");
        try {
          // 1. Validar las credenciales de entrada (email/password)
          // Usamos safeParse para manejar errores de validación explícitamente
          const validationResult = await signInSchema.safeParseAsync(credentials);
          if (!validationResult.success) {
            console.warn("[NextAuth Authorize] Input validation failed:", validationResult.error.flatten());
            // Podrías lanzar un error específico o devolver null
            // Devolver null generalmente resulta en un error genérico de credenciales
            return null;
          }
          const { email, password } = validationResult.data;
          console.log(`[NextAuth Authorize] Input validated for email: ${email}`);

          // 2. Llamar al backend NestJS para el login real
          const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`;
          console.log(`[NextAuth Authorize] Calling backend login: POST ${backendUrl}`);
          const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });

          console.log(`[NextAuth Authorize] Backend response status: ${response.status}`);

          // 3. Parsear la respuesta del backend
          let data;
          try {
            data = await response.json();
            // --- LOG CLAVE: Muestra la respuesta completa del backend ---
            console.log("[NextAuth Authorize] RAW Backend Response Data:", JSON.stringify(data, null, 2));
          } catch (e) {
            console.error("[NextAuth Authorize] Failed to parse backend JSON response:", e);
            // Si no podemos parsear Y el status no fue OK, es un error de servidor/respuesta
            if (!response.ok) {
              console.error(`[NextAuth Authorize] Backend returned status ${response.status} but response is not valid JSON.`);
              // Podrías lanzar un error específico para debugging
              throw new Error(`server_error_invalid_json_status_${response.status}`);
            }
            // Si fue OK pero no es JSON (raro), es un problema
            throw new Error('invalid_backend_response_format');
          }

          // 4. Validar la respuesta del backend y extraer datos
          // --- Si la respuesta NO fue exitosa (status no es 2xx) ---
          if (!response.ok) {
            const backendErrorMsg = data?.message || `Backend returned status ${response.status}`;
            console.warn("[NextAuth Authorize] Backend login failed:", backendErrorMsg);
            // Mapear errores conocidos del backend a errores de NextAuth si es necesario
            if (backendErrorMsg.toLowerCase().includes('inactive')) {
              throw new Error('inactive_user'); // Error específico para usuario inactivo
            }
            // Para otros errores (ej: credenciales inválidas devueltas por NestJS),
            // devolver null es lo estándar para CredentialsProvider
            return null; // Indica a NextAuth que las credenciales no son válidas
          }

          // --- Si la respuesta FUE exitosa (status 2xx) ---
          // Verificar que la estructura esperada exista
          if (!data || !data.user || !data.accessToken || !data.user.officeId) {
            console.error("[NextAuth Authorize] Backend response OK, but missing expected data (accessToken, user.id, user.email, user.officeId):", data);
            // Esto indica un problema en cómo el backend NestJS formatea su respuesta exitosa
            throw new Error('invalid_backend_response_structure');
          }

          // 5. Construir y RETORNAR el objeto 'User' para NextAuth
          // Este objeto DEBE incluir TODO lo que necesiten los callbacks jwt/session
          // y DEBE coincidir con la interfaz 'User' en next-auth.d.ts
          const userForNextAuth: User = {
            id: data.user.id.toString(),
            email: data.user.email,
            name: data.user.name ?? null,
            role: data.user.role ?? null,
            officeId: data.user.officeId,   // <-- Incluido
            accessToken: data.accessToken, // <-- Incluido
            // No incluir status aquí si no se necesita persistir en el token/sesión
          };

          console.log("[NextAuth Authorize] Authorization successful. Returning user object to NextAuth:", userForNextAuth);
          return userForNextAuth; // Devuelve el objeto completo

        } catch (error: any) {
          // Capturar errores lanzados explícitamente (inactive_user, etc.) o errores de fetch/parseo
          console.error("[NextAuth Authorize] Error during authorization process:", error.message || error);
          // Devolver null indica fallo de credenciales a NextAuth,
          // excepto si lanzas un error específico que quieras manejar diferente.
          // Para errores como 'inactive_user', puedes manejarlo en la página de login
          // basándote en el parámetro ?error= en la URL si no usas redirect:false.
          // Si usas redirect:false, el error se devuelve en el resultado de signIn().
          // Re-lanzar el error puede ser útil si tienes una página de error personalizada.
          // throw error; // O simplemente devuelve null para error genérico
          return null;
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