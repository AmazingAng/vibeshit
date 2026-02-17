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

  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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
      signIn: "/",
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
