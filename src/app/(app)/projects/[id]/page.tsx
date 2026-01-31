import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Calendar,
  GitBranch,
  Plus,
  Target,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { MilestoneList } from "@/components/milestones/milestone-list";
import { ProjectActions } from "@/components/projects/project-actions";

const stageColors: Record<string, string> = {
  idea: "bg-purple-100 text-purple-800",
  planning: "bg-blue-100 text-blue-800",
  execution: "bg-yellow-100 text-yellow-800",
  monitoring: "bg-orange-100 text-orange-800",
  done: "bg-green-100 text-green-800",
};

const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-800",
  at_risk: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { githubId: session?.user?.githubId },
  });

  if (!user) {
    notFound();
  }

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
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
        take: 10,
      },
    },
  });

  if (!project) {
    notFound();
  }

  const totalTasks = project.milestones.reduce(
    (acc, m) => acc + m.tasks.length,
    0
  );
  const completedTasks = project.milestones.reduce(
    (acc, m) => acc + m.tasks.filter((t) => t.status === "done").length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge className={stageColors[project.stage] || "bg-gray-100 text-gray-800"}>
              {project.stage}
            </Badge>
          </div>
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <ProjectActions project={project} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} of {totalTasks} tasks done
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.milestones.length}</div>
            <p className="text-xs text-muted-foreground">
              {project.milestones.filter((m) => m.status === "completed").length}{" "}
              completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {project.startDate
                  ? format(project.startDate, "MMM d, yyyy")
                  : "Not set"}
              </span>
            </div>
            {project.endDate && (
              <p className="text-xs text-muted-foreground">
                → {format(project.endDate, "MMM d, yyyy")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Repository</CardTitle>
          </CardHeader>
          <CardContent>
            {project.repoUrl ? (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <GitBranch className="h-4 w-4" />
                <span className="truncate">
                  {project.repoUrl.replace("https://github.com/", "")}
                </span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">Not linked</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="space-y-4">
          <MilestoneList projectId={project.id} milestones={project.milestones} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {project.events.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No activity yet</h3>
                <p className="text-center text-muted-foreground">
                  {project.repoUrl
                    ? "Sync your repository to see commits and pull requests"
                    : "Link a GitHub repository to track activity"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div
                        className={`mt-1 h-2 w-2 rounded-full ${
                          event.type === "commit"
                            ? "bg-green-500"
                            : "bg-purple-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          {event.title}
                        </a>
                        <p className="text-sm text-muted-foreground">
                          {event.author} •{" "}
                          {format(event.eventDate, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
