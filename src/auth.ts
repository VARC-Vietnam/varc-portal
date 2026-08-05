import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { connectDb } from "@/lib/db";
import {
  getGoogleClientId,
  getGoogleClientSecret,
  isGoogleAuthConfigured,
} from "@/lib/google-auth";
import { isAdminRole, normalizeRoleKey, type Role } from "@/lib/roles";
import { User } from "@/models/User";
import { ensureDefaultRoles } from "@/lib/app-roles";

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

const googleClientId = getGoogleClientId();
const googleClientSecret = getGoogleClientSecret();

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
        await ensureDefaultRoles();
        const user = await User.findOne({ email });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        const role = normalizeRoleKey(user.role);
        if (user.role !== role) {
          user.role = role;
          await user.save();
        }
        if (!isAdminRole(role)) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          image: user.image,
          role,
        };
      },
    }),
    ...(isGoogleAuthConfigured() && googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
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
      await ensureDefaultRoles();
      const email = user.email.toLowerCase().trim();
      const existing = await User.findOne({ email });
      if (existing) {
        // Same email = same account (credentials + Google share one user).
        if (user.name && existing.name !== user.name) {
          existing.name = user.name;
        }
        if (user.image && existing.image !== user.image) {
          existing.image = user.image;
        }
        const role = normalizeRoleKey(existing.role);
        if (existing.role !== role) {
          existing.role = role;
        }
        await existing.save();
        user.id = String(existing._id);
        user.role = role;
        return true;
      }

      const created = await User.create({
        email,
        name: user.name || email,
        image: user.image ?? null,
        role: "reader",
        passwordHash: null,
      });
      user.id = String(created._id);
      user.role = "reader";
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeRoleKey(user.role as string | undefined);
        if (user.email) token.email = String(user.email).toLowerCase();
      }

      const email = token.email ? String(token.email).toLowerCase() : null;
      if (
        email &&
        (account?.provider === "google" ||
          trigger === "signIn" ||
          !token.role ||
          !token.id)
      ) {
        await connectDb();
        await ensureDefaultRoles();
        const dbUser = await User.findOne({ email });
        if (dbUser) {
          token.id = String(dbUser._id);
          token.role = normalizeRoleKey(dbUser.role);
        }
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
});
