import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        phone: { label: "Telefon", type: "text" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string;
        const password = credentials?.password as string;

        if (!phone || !password) return null;

        const client = await prisma.client.findUnique({ where: { phone } });
        if (!client || !client.isAdmin || !client.passwordHash) return null;

        const valid = await verifyPassword(password, client.passwordHash);
        if (!valid) return null;

        return { id: client.id, name: client.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
