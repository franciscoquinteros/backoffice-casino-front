import "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * El objeto User devuelto por la función `authorize` de CredentialsProvider.
   * Debe incluir todos los datos que quieres pasar inicialmente al callback `jwt`.
   */
  interface User {
    id: string;
    role: string | null;
    email: string;
    name: string | null;
    officeId: string;     // <-- Añadido: La oficina del usuario (del backend)
    accessToken: string;  // <-- Añadido: El token JWT del backend
  }

  /**
   * El objeto Session que se expone al cliente a través de `useSession` o `getSession`.
   */
  interface Session {
    user: {
      id: string;
      role: string | null;
      email: string;
      name: string | null;
      officeId: string;     // <-- Añadido: Exponer la oficina al cliente
    };
    accessToken?: string; // <-- Añadido: Exponer el token del backend al cliente
                          // Lo ponemos como opcional (?) por si acaso, aunque debería estar
  }
}

declare module "next-auth/jwt" {
  /**
   * El token JWT interno de NextAuth, tal como se procesa en el callback `jwt`.
   * Aquí es donde persistes los datos entre peticiones.
   */
  interface JWT {
    id: string;           // Usualmente mapeado desde user.id o payload.sub
    role: string | null;
    email: string;
    name: string | null;
    officeId: string;     // <-- Añadido: Persistir la oficina en el token
    accessToken: string;  // <-- Añadido: Persistir el token del backend
    // Podrías añadir aquí también la expiración del accessToken si necesitas gestionarla
    // accessTokenExpires?: number;
  }
}