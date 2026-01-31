import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createMilestoneSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.enum(["on_track", "at_risk", "overdue", "completed"]).default("on_track"),
});

export async function GET(
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

  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    include: {
      tasks: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(milestones);
}

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

  try {
    const body = await request.json();
    const data = createMilestoneSchema.parse(body);

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        title: data.title,
        description: data.description || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status,
      },
      include: {
        tasks: true,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating milestone:", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}
