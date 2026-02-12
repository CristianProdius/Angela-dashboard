import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const password = credentials?.password as string;
        if (password === process.env.BARBER_PASSWORD) {
          return { id: "barber", name: "Barbeiro" };
        }
        return null;
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
    async jwt({ token }) {
      token.id = "barber";
      return token;
    },
    async session({ session }) {
      if (session.user) {
        session.user.id = "barber";
      }
      return session;
    },
  },
});
