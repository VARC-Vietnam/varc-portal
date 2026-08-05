import type { NextAuthConfig } from "next-auth";
import { normalizeRoleKey } from "@/lib/roles";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeRoleKey(user.role as string | undefined);
      } else if (token.role) {
        token.role = normalizeRoleKey(token.role as string);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = normalizeRoleKey(token.role as string | undefined);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
