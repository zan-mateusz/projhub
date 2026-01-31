import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, Target, CheckCircle2 } from "lucide-react";

const stageColors: Record<string, string> = {
  idea: "bg-purple-100 text-purple-800",
  planning: "bg-blue-100 text-blue-800",
  execution: "bg-yellow-100 text-yellow-800",
  monitoring: "bg-orange-100 text-orange-800",
  done: "bg-green-100 text-green-800",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { githubId: session?.user?.githubId },
  });

  if (!user) {
    return null;
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      milestones: {
        include: {
          tasks: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  let activeMilestones = 0;
  let completedTasks = 0;
  for (const project of projects) {
    for (const milestone of project.milestones) {
      if (milestone.status !== "completed") {
        activeMilestones++;
      }
      for (const task of milestone.tasks) {
        if (task.status === "done") {
          completedTasks++;
        }
      }
    }
  }
  const stats = {
    totalProjects: projects.length,
    activeMilestones,
    completedTasks,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name}
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Milestones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMilestones}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Button variant="ghost" asChild>
            <Link href="/projects">View all</Link>
          </Button>
        </div>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No projects yet</h3>
              <p className="mb-4 text-center text-muted-foreground">
                Create your first project to start tracking your work
              </p>
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge className={stageColors[project.stage] || "bg-gray-100 text-gray-800"}>
                        {project.stage}
                      </Badge>
                    </div>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{project.milestones.length} milestones</span>
                      <span>
                        {project.milestones.reduce((acc, m) => acc + m.tasks.length, 0)} tasks
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
