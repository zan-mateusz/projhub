"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Target, ChevronDown, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { TaskBoard } from "./task-board";

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  order: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  tasks: Task[];
}

const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-800",
  at_risk: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

export function MilestoneList({
  projectId,
  milestones: initialMilestones,
}: {
  projectId: string;
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initialMilestones);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        const milestone = await response.json();
        setMilestones([...milestones, milestone]);
        setNewTitle("");
        setShowCreateDialog(false);
        setExpandedIds(new Set([...expandedIds, milestone.id]));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/milestones/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setMilestones(milestones.filter((m) => m.id !== id));
    }
  };

  const handleTasksUpdate = (milestoneId: string, tasks: Task[]) => {
    setMilestones(
      milestones.map((m) =>
        m.id === milestoneId ? { ...m, tasks } : m
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Milestones</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Milestone</DialogTitle>
              <DialogDescription>
                Create a new milestone to track progress on your project.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Milestone title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || !newTitle.trim()}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {milestones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No milestones yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Create your first milestone to start breaking down your project
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const isExpanded = expandedIds.has(milestone.id);
            const completedTasks = milestone.tasks.filter(
              (t) => t.status === "done"
            ).length;

            return (
              <Card key={milestone.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleExpanded(milestone.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-base">{milestone.title}</CardTitle>
                      <Badge className={statusColors[milestone.status]}>
                        {milestone.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {completedTasks}/{milestone.tasks.length} tasks
                      </span>
                      {(milestone.startDate || milestone.endDate) && (
                        <span className="text-sm text-muted-foreground">
                          {milestone.startDate &&
                            format(new Date(milestone.startDate), "MMM d")}
                          {milestone.startDate && milestone.endDate && " - "}
                          {milestone.endDate &&
                            format(new Date(milestone.endDate), "MMM d")}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(milestone.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <TaskBoard
                      milestoneId={milestone.id}
                      tasks={milestone.tasks}
                      onTasksUpdate={(tasks) =>
                        handleTasksUpdate(milestone.id, tasks)
                      }
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
