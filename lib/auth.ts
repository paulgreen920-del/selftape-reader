
import { NextAuthOptions, Session, User } from "next-auth";

// Type augmentation for session.user.id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    id: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    async session({ session, user }) {
      // Add user.id to session.user
      if (session.user && user && user.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
