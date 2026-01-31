import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const parentType = searchParams.get("parentType");
  const parentId = searchParams.get("parentId");

  const where: Record<string, unknown> = {};

  if (parentType === "project" && parentId) {
    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: { id: parentId, userId: user.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    where.projectId = parentId;
  } else if (parentType === "milestone" && parentId) {
    const milestone = await prisma.milestone.findFirst({
      where: { id: parentId, project: { userId: user.id } },
    });
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }
    where.milestoneId = parentId;
  } else if (parentType === "task" && parentId) {
    const task = await prisma.task.findFirst({
      where: { id: parentId, milestone: { project: { userId: user.id } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    where.taskId = parentId;
  }

  const artifacts = await prisma.artifact.findMany({
    where,
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(artifacts);
}

export async function POST(request: NextRequest) {
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

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parentType = formData.get("parentType") as string;
    const parentId = formData.get("parentId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!parentType || !parentId) {
      return NextResponse.json({ error: "Parent type and ID required" }, { status: 400 });
    }

    // Verify ownership
    let projectId: string | null = null;
    let milestoneId: string | null = null;
    let taskId: string | null = null;

    if (parentType === "project") {
      const project = await prisma.project.findFirst({
        where: { id: parentId, userId: user.id },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      projectId = parentId;
    } else if (parentType === "milestone") {
      const milestone = await prisma.milestone.findFirst({
        where: { id: parentId, project: { userId: user.id } },
      });
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }
      milestoneId = parentId;
    } else if (parentType === "task") {
      const task = await prisma.task.findFirst({
        where: { id: parentId, milestone: { project: { userId: user.id } } },
      });
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      taskId = parentId;
    } else {
      return NextResponse.json({ error: "Invalid parent type" }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), "uploads", parentType, parentId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split(".").pop() || "";
    const uniqueName = `${randomUUID()}.${ext}`;
    const filePath = join(uploadDir, uniqueName);
    const storagePath = `uploads/${parentType}/${parentId}/${uniqueName}`;

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create artifact record
    const artifact = await prisma.artifact.create({
      data: {
        parentType,
        projectId,
        milestoneId,
        taskId,
        filename: file.name,
        storagePath,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: buffer.length,
      },
    });

    // For text/markdown files, also create initial version
    if (file.type === "text/markdown" || file.type === "text/plain" || file.name.endsWith(".md")) {
      const content = buffer.toString("utf-8");
      await prisma.artifactVersion.create({
        data: {
          artifactId: artifact.id,
          content,
          versionNumber: 1,
        },
      });
    }

    return NextResponse.json(artifact, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
