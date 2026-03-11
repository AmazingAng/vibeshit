import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/lib/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const githubClientId = runtimeEnv.GITHUB_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID;
  const githubClientSecret =
    runtimeEnv.GITHUB_CLIENT_SECRET ?? process.env.GITHUB_CLIENT_SECRET;
  const authSecret = runtimeEnv.AUTH_SECRET ?? process.env.AUTH_SECRET;
  const authUrl = runtimeEnv.AUTH_URL ?? process.env.AUTH_URL;
  const nodeEnv = runtimeEnv.NODE_ENV ?? process.env.NODE_ENV;
  const authTrustHostRaw =
    runtimeEnv.AUTH_TRUST_HOST ?? process.env.AUTH_TRUST_HOST ?? "true";
  const trustHost =
    authTrustHostRaw === "true" ||
    authTrustHostRaw === "1" ||
    authTrustHostRaw.toLowerCase() === "yes";
  const canonicalAuthOrigin =
    authUrl?.replace(/\/$/, "") ??
    (nodeEnv === "production" ? "https://vibeshit.org" : "http://localhost:3000");
  const githubCallbackUrl = `${canonicalAuthOrigin}/api/auth/callback/github`;

  return {
    secret: authSecret,
    trustHost,
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [
      GitHub({
        clientId: githubClientId ?? "",
        clientSecret: githubClientSecret ?? "",
        authorization: {
          params: {
            redirect_uri: githubCallbackUrl,
          },
        },
        profile(profile) {
          return {
            id: profile.id.toString(),
            name: profile.name ?? profile.login,
            username: profile.login,
            email: profile.email,
            image: profile.avatar_url,
          };
        },
      }),
    ],
    pages: {
      signIn: "/signin",
    },
    callbacks: {
      async signIn({ user, profile }) {
        if (user.id && profile?.login) {
          try {
            await db
              .update(users)
              .set({ username: profile.login as string })
              .where(eq(users.id, user.id!));
          } catch {
            // Ignore errors during username update
          }
        }
        return true;
      },
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
          session.user.username = (user as typeof user & { username?: string | null }).username ?? null;
        }
        return session;
      },
    },
  };
});
