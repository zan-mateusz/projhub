import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGitHubActivity } from "@/lib/github";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { githubId: session.user.githubId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id: projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.repoUrl) {
    return NextResponse.json(
      { error: "Project has no linked repository" },
      { status: 400 }
    );
  }

  try {
    const result = await syncGitHubActivity(projectId, user.id);
    return NextResponse.json({
      success: true,
      synced: result,
    });
  } catch (error) {
    console.error("Error syncing GitHub activity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync" },
      { status: 500 }
    );
  }
}
