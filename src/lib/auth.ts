import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && profile) {
        const githubProfile = profile as {
          id: number;
          login: string;
          avatar_url: string;
          email: string;
        };

        await prisma.user.upsert({
          where: { githubId: String(githubProfile.id) },
          update: {
            name: githubProfile.login,
            email: githubProfile.email || `${githubProfile.login}@github.local`,
            avatarUrl: githubProfile.avatar_url,
            githubToken: account.access_token,
          },
          create: {
            githubId: String(githubProfile.id),
            name: githubProfile.login,
            email: githubProfile.email || `${githubProfile.login}@github.local`,
            avatarUrl: githubProfile.avatar_url,
            githubToken: account.access_token,
          },
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { githubId: token.sub },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.githubId = dbUser.githubId;
        }
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const githubProfile = profile as { id: number };
        token.sub = String(githubProfile.id);
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
