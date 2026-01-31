import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.enum(["on_track", "at_risk", "overdue", "completed"]).optional(),
});

async function getMilestoneWithAuth(milestoneId: string, githubId: string) {
  const user = await prisma.user.findUnique({
    where: { githubId },
  });

  if (!user) return null;

  const milestone = await prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      project: { userId: user.id },
    },
    include: {
      tasks: {
        orderBy: { order: "asc" },
      },
    },
  });

  return milestone;
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
  const milestone = await getMilestoneWithAuth(id, session.user.githubId);

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  return NextResponse.json(milestone);
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
  const milestone = await getMilestoneWithAuth(id, session.user.githubId);

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = updateMilestoneSchema.parse(body);

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        tasks: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating milestone:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
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
  const milestone = await getMilestoneWithAuth(id, session.user.githubId);

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  await prisma.milestone.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
