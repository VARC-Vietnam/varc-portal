import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { connectDb } from "@/lib/db";
import { isAdminRole, type Role } from "@/lib/roles";
import { User } from "@/models/User";

declare module "next-auth" {
  interface User {
    role?: Role;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        await connectDb();
        const user = await User.findOne({ email });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        if (!isAdminRole(user.role)) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      await connectDb();
      const email = user.email.toLowerCase();
      const existing = await User.findOne({ email });
      if (existing) {
        if (user.name && existing.name !== user.name) {
          existing.name = user.name;
        }
        if (user.image && existing.image !== user.image) {
          existing.image = user.image;
        }
        await existing.save();
        return true;
      }

      await User.create({
        email,
        name: user.name || email,
        image: user.image ?? null,
        role: "user",
        passwordHash: null,
      });
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      const email = token.email ? String(token.email).toLowerCase() : null;
      if (
        email &&
        (account?.provider === "google" || trigger === "signIn" || !token.role)
      ) {
        await connectDb();
        const dbUser = await User.findOne({ email });
        if (dbUser) {
          token.id = String(dbUser._id);
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role as Role) ?? "user";
      }
      return session;
    },
  },
});
