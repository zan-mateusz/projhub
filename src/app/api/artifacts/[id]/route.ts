import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

async function getArtifactWithAuth(artifactId: string, githubId: string) {
  const user = await prisma.user.findUnique({
    where: { githubId },
  });

  if (!user) return null;

  const artifact = await prisma.artifact.findFirst({
    where: {
      id: artifactId,
      OR: [
        { project: { userId: user.id } },
        { milestone: { project: { userId: user.id } } },
        { task: { milestone: { project: { userId: user.id } } } },
      ],
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
      },
    },
  });

  return artifact;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const artifact = await getArtifactWithAuth(id, session.user.githubId);

  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }

  return NextResponse.json(artifact);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const artifact = await getArtifactWithAuth(id, session.user.githubId);

  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }

  // Delete file from disk
  try {
    const filePath = join(process.cwd(), artifact.storagePath);
    await unlink(filePath);
  } catch (error) {
    console.error("Error deleting file:", error);
    // Continue even if file deletion fails
  }

  // Delete from database (cascades to versions)
  await prisma.artifact.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
