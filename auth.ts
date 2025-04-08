import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { signInSchema } from "./lib/zod"
import type { User } from "next-auth"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        try {
          const { email, password } = await signInSchema.parseAsync(credentials);
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });

          // Parse response
          let data;
          try {
            data = await response.json();
          } catch (e) {
            throw new Error('server_error');
          }

          // Check for inactive user in response
          if (data.message === 'User account is inactive' || 
              (data.statusCode === 401 && data.message === 'User account is inactive')) {
            throw new Error('inactive_user');
          }

          // Check for general response issues
          if (!response.ok || !data.user) {
            throw new Error('invalid_credentials');
          }

          // Validate response format
          if (!data.user.id || !data.user.email) {
            throw new Error('invalid_response');
          }

          // Check user status from user object
          if (data.user.status === 'inactive') {
            throw new Error('inactive_user');
          }

          // Return user data
          return {
            id: data.user.id.toString(),
            email: data.user.email,
            name: data.user.name ?? null,
            role: data.user.role ?? null,
            status: data.user.status ?? 'active'
          } as User;

        } catch (error) {
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && 'id' in user && 'email' in user) {
        token.id = user.id as string;
        token.role = user.role ?? null;
        token.name = user.name ?? null;
        token.email = user.email as string;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.id,
          role: token.role,
          name: token.name,
          email: token.email
        }
      };
    }
  },
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
})