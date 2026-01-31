import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  stage: z.enum(["idea", "planning", "execution", "monitoring", "done"]).default("idea"),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  repoUrl: z.string().url().optional().nullable(),
});

export async function GET() {
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

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      milestones: {
        include: {
          tasks: true,
        },
      },
      _count: {
        select: {
          events: true,
          artifacts: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
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
    const body = await request.json();
    const data = createProjectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description || null,
        stage: data.stage,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        repoUrl: data.repoUrl || null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
