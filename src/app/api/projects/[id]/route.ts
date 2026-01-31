import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  stage: z.enum(["idea", "planning", "execution", "monitoring", "done"]).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  repoUrl: z.string().url().optional().nullable(),
});

async function getUserAndProject(projectId: string, githubId: string) {
  const user = await prisma.user.findUnique({
    where: { githubId },
  });

  if (!user) return { user: null, project: null };

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      milestones: {
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { startDate: "asc" },
      },
      events: {
        orderBy: { eventDate: "desc" },
        take: 20,
      },
      artifacts: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return { user, project };
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
  const { project } = await getUserAndProject(id, session.user.githubId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { user, project } = await getUserAndProject(id, session.user.githubId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.stage !== undefined && { stage: data.stage }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.repoUrl !== undefined && { repoUrl: data.repoUrl }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
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
  const { project } = await getUserAndProject(id, session.user.githubId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
