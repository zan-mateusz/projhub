import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createVersionSchema = z.object({
  content: z.string(),
});

async function getArtifactWithAuth(artifactId: string, githubId: string) {
  const user = await prisma.user.findUnique({
    where: { githubId },
  });

  if (!user) return null;

  return prisma.artifact.findFirst({
    where: {
      id: artifactId,
      OR: [
        { project: { userId: user.id } },
        { milestone: { project: { userId: user.id } } },
        { task: { milestone: { project: { userId: user.id } } } },
      ],
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: artifactId } = await params;
  const artifact = await getArtifactWithAuth(artifactId, session.user.githubId);

  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }

  const versions = await prisma.artifactVersion.findMany({
    where: { artifactId },
    orderBy: { versionNumber: "desc" },
  });

  return NextResponse.json(versions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: artifactId } = await params;
  const artifact = await getArtifactWithAuth(artifactId, session.user.githubId);

  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = createVersionSchema.parse(body);

    // Get latest version number
    const latestVersion = await prisma.artifactVersion.findFirst({
      where: { artifactId },
      orderBy: { versionNumber: "desc" },
    });

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    const version = await prisma.artifactVersion.create({
      data: {
        artifactId,
        content: data.content,
        versionNumber: newVersionNumber,
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating version:", error);
    return NextResponse.json({ error: "Failed to create version" }, { status: 500 });
  }
}
