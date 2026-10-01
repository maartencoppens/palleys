import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/db/client";
import { isAllowedAdminEmail } from "./utils";

export const auth = betterAuth({
  appName: "Palleys Admin",
  telemetry: { enabled: false },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account",
      requireEmailVerification: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 30,
  },

  advanced: {
    cookiePrefix: "palleys",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },

  account: {
    encryptOAuthTokens: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    storage: "database",
    customRules: {
      "/sign-in/social": { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAllowedAdminEmail(user.email)) return false;
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { email: true },
          });
          if (!user || !isAllowedAdminEmail(user.email)) return false;
        },
      },
    },
  },
  onAPIError: {
    errorURL: "/admin/login?error=1",
  },

  plugins: [nextCookies()],
});
