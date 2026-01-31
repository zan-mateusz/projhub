import { prisma } from "./prisma";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
  author?: {
    login: string;
    avatar_url: string;
  };
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  state: string;
  merged_at: string | null;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
}

export async function getGitHubToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubToken: true },
  });
  return user?.githubToken ?? null;
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchRepoCommits(
  token: string,
  owner: string,
  repo: string,
  since?: Date
): Promise<GitHubCommit[]> {
  const params = new URLSearchParams({ per_page: "30" });
  if (since) {
    params.set("since", since.toISOString());
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchRepoPullRequests(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "all"
): Promise<GitHubPullRequest[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&sort=updated&per_page=30`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function syncGitHubActivity(
  projectId: string,
  userId: string
): Promise<{ commits: number; pullRequests: number }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { repoUrl: true },
  });

  if (!project?.repoUrl) {
    throw new Error("Project has no linked repository");
  }

  const repoInfo = parseRepoUrl(project.repoUrl);
  if (!repoInfo) {
    throw new Error("Invalid repository URL");
  }

  const token = await getGitHubToken(userId);
  if (!token) {
    throw new Error("No GitHub token available");
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [commits, pullRequests] = await Promise.all([
    fetchRepoCommits(token, repoInfo.owner, repoInfo.repo, thirtyDaysAgo),
    fetchRepoPullRequests(token, repoInfo.owner, repoInfo.repo, "all"),
  ]);

  let commitCount = 0;
  let prCount = 0;

  for (const commit of commits) {
    await prisma.gitHubEvent.upsert({
      where: {
        projectId_githubId: {
          projectId,
          githubId: commit.sha,
        },
      },
      update: {},
      create: {
        projectId,
        type: "commit",
        githubId: commit.sha,
        eventDate: new Date(commit.commit.author.date),
        author: commit.author?.login || commit.commit.author.name,
        title: commit.commit.message.split("\n")[0],
        url: commit.html_url,
        details: JSON.stringify({
          sha: commit.sha,
          authorAvatar: commit.author?.avatar_url,
        }),
      },
    });
    commitCount++;
  }

  for (const pr of pullRequests) {
    const prDate = new Date(pr.created_at);
    if (prDate < thirtyDaysAgo) continue;

    await prisma.gitHubEvent.upsert({
      where: {
        projectId_githubId: {
          projectId,
          githubId: `pr-${pr.id}`,
        },
      },
      update: {
        title: pr.title,
        details: JSON.stringify({
          number: pr.number,
          state: pr.state,
          merged: pr.merged_at !== null,
          authorAvatar: pr.user.avatar_url,
        }),
      },
      create: {
        projectId,
        type: "pull_request",
        githubId: `pr-${pr.id}`,
        eventDate: prDate,
        author: pr.user.login,
        title: pr.title,
        url: pr.html_url,
        details: JSON.stringify({
          number: pr.number,
          state: pr.state,
          merged: pr.merged_at !== null,
          authorAvatar: pr.user.avatar_url,
        }),
      },
    });
    prCount++;
  }

  return { commits: commitCount, pullRequests: prCount };
}
