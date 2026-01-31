import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;

  const sig = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return `sha256=${sig}` === signature;
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  // Verify signature if webhook secret is configured
  if (WEBHOOK_SECRET && !verifySignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  const data = JSON.parse(payload);

  // Find project by repository URL
  const repoUrl = data.repository?.html_url;
  if (!repoUrl) {
    return NextResponse.json({ error: "No repository URL" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { repoUrl },
  });

  if (!project) {
    // Repository not linked to any project, ignore
    return NextResponse.json({ status: "ignored" });
  }

  try {
    if (event === "push") {
      // Handle push events (commits)
      for (const commit of data.commits || []) {
        await prisma.gitHubEvent.upsert({
          where: {
            projectId_githubId: {
              projectId: project.id,
              githubId: commit.id,
            },
          },
          update: {},
          create: {
            projectId: project.id,
            type: "commit",
            githubId: commit.id,
            eventDate: new Date(commit.timestamp),
            author: commit.author?.username || commit.author?.name || "unknown",
            title: commit.message.split("\n")[0],
            url: commit.url,
            details: JSON.stringify({
              sha: commit.id,
              added: commit.added?.length || 0,
              modified: commit.modified?.length || 0,
              removed: commit.removed?.length || 0,
            }),
          },
        });
      }
    } else if (event === "pull_request") {
      // Handle pull request events
      const pr = data.pull_request;
      const action = data.action;

      await prisma.gitHubEvent.upsert({
        where: {
          projectId_githubId: {
            projectId: project.id,
            githubId: `pr-${pr.id}`,
          },
        },
        update: {
          title: pr.title,
          details: JSON.stringify({
            number: pr.number,
            state: pr.state,
            action,
            merged: pr.merged,
            authorAvatar: pr.user?.avatar_url,
          }),
        },
        create: {
          projectId: project.id,
          type: "pull_request",
          githubId: `pr-${pr.id}`,
          eventDate: new Date(pr.created_at),
          author: pr.user?.login || "unknown",
          title: pr.title,
          url: pr.html_url,
          details: JSON.stringify({
            number: pr.number,
            state: pr.state,
            action,
            merged: pr.merged,
            authorAvatar: pr.user?.avatar_url,
          }),
        },
      });
    } else if (event === "issues") {
      // Handle issue events
      const issue = data.issue;

      await prisma.gitHubEvent.upsert({
        where: {
          projectId_githubId: {
            projectId: project.id,
            githubId: `issue-${issue.id}`,
          },
        },
        update: {
          title: issue.title,
          details: JSON.stringify({
            number: issue.number,
            state: issue.state,
            action: data.action,
          }),
        },
        create: {
          projectId: project.id,
          type: "issue",
          githubId: `issue-${issue.id}`,
          eventDate: new Date(issue.created_at),
          author: issue.user?.login || "unknown",
          title: issue.title,
          url: issue.html_url,
          details: JSON.stringify({
            number: issue.number,
            state: issue.state,
            action: data.action,
          }),
        },
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
