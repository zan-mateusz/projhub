import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(["task", "bug", "improvement", "idea"]).optional(),
  status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
  description: z.string().max(1000).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

async function getTaskWithAuth(taskId: string, githubId: string) {
  const user = await prisma.user.findUnique({
    where: { githubId },
  });

  if (!user) return null;

  return prisma.task.findFirst({
    where: {
      id: taskId,
      milestone: {
        project: { userId: user.id },
      },
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

  const { id } = await params;
  const task = await getTaskWithAuth(id, session.user.githubId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
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
  const task = await getTaskWithAuth(id, session.user.githubId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = updateTaskSchema.parse(body);

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
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
  const task = await getTaskWithAuth(id, session.user.githubId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
