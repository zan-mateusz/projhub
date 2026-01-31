import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, Calendar } from "lucide-react";
import { format } from "date-fns";

const stageColors: Record<string, string> = {
  idea: "bg-purple-100 text-purple-800",
  planning: "bg-blue-100 text-blue-800",
  execution: "bg-yellow-100 text-yellow-800",
  monitoring: "bg-orange-100 text-orange-800",
  done: "bg-green-100 text-green-800",
};

export default async function ProjectsPage() {
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
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track all your projects
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
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
          {projects.map((project) => {
            const totalTasks = project.milestones.reduce(
              (acc, m) => acc + m.tasks.length,
              0
            );
            const completedTasks = project.milestones.reduce(
              (acc, m) => acc + m.tasks.filter((t) => t.status === "done").length,
              0
            );

            return (
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
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{project.milestones.length} milestones</span>
                      <span>
                        {completedTasks}/{totalTasks} tasks done
                      </span>
                    </div>
                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {project.startDate && format(project.startDate, "MMM d")}
                          {project.startDate && project.endDate && " - "}
                          {project.endDate && format(project.endDate, "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    {totalTasks > 0 && (
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${(completedTasks / totalTasks) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
