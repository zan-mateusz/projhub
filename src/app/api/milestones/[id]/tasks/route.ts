import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum(["task", "bug", "improvement", "idea"]).default("task"),
  status: z.enum(["todo", "in_progress", "blocked", "done"]).default("todo"),
  description: z.string().max(1000).optional(),
});

async function getMilestoneWithAuth(milestoneId: string, githubId: string) {
  const user = await prisma.user.findUnique({
    where: { githubId },
  });

  if (!user) return null;

  return prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      project: { userId: user.id },
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

  const { id: milestoneId } = await params;
  const milestone = await getMilestoneWithAuth(milestoneId, session.user.githubId);

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  const tasks = await prisma.task.findMany({
    where: { milestoneId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: milestoneId } = await params;
  const milestone = await getMilestoneWithAuth(milestoneId, session.user.githubId);

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = createTaskSchema.parse(body);

    const maxOrder = await prisma.task.aggregate({
      where: { milestoneId },
      _max: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        milestoneId,
        title: data.title,
        type: data.type,
        status: data.status,
        description: data.description || null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
