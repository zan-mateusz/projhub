import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Calendar, GitBranch } from "lucide-react";
import { MilestoneList } from "@/components/milestones/milestone-list";
import { ProjectActions } from "@/components/projects/project-actions";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ProjectRepoCard } from "@/components/projects/project-repo-card";
import { ArtifactGallery } from "@/components/artifacts/artifact-gallery";
import { ProjectTimeline } from "@/components/timeline/project-timeline";

const stageColors: Record<string, string> = {
  idea: "bg-purple-100 text-purple-800",
  planning: "bg-blue-100 text-blue-800",
  execution: "bg-yellow-100 text-yellow-800",
  monitoring: "bg-orange-100 text-orange-800",
  done: "bg-green-100 text-green-800",
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
        take: 20,
      },
    },
  });

  if (!project) {
    notFound();
  }

  let totalTasks = 0;
  let completedTasks = 0;
  for (const milestone of project.milestones) {
    totalTasks += milestone.tasks.length;
    for (const task of milestone.tasks) {
      if (task.status === "done") completedTasks++;
    }
  }

  const completedMilestones = project.milestones.filter(
    (m) => m.status === "completed"
  ).length;

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
              {completedMilestones} completed
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
        <ProjectRepoCard projectId={project.id} repoUrl={project.repoUrl} />
      </div>

      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="space-y-4">
          <ProjectTimeline
            milestones={project.milestones}
            projectStartDate={project.startDate}
            projectEndDate={project.endDate}
          />
          <MilestoneList projectId={project.id} milestones={project.milestones} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityFeed
            projectId={project.id}
            events={project.events}
            hasRepo={!!project.repoUrl}
          />
        </TabsContent>

        <TabsContent value="artifacts" className="space-y-4">
          <ArtifactGallery parentType="project" parentId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
