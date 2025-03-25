import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextRequest } from 'next/server'; // ✅ for App Router compatibility

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' },
      },
      async authorize(credentials: Record<"email" | "password" | "userType", string> | undefined) {
        if (!credentials) return null;
      
        const { email, password, userType } = credentials;
      
        const res = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, userType }),
        });
      
        const user = await res.json();
        if (res.ok && user) return user;
        return null;
      }
      
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }) {
      (session as any).user = token.user;
      return session;
    }
  },
});

const GET = handler;
const POST = handler;

export { GET, POST };

