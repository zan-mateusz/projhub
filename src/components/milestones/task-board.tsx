"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  order: number;
}

const columns = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

const typeColors: Record<string, string> = {
  task: "bg-gray-100 text-gray-800",
  bug: "bg-red-100 text-red-800",
  improvement: "bg-blue-100 text-blue-800",
  idea: "bg-purple-100 text-purple-800",
};

export function TaskBoard({
  milestoneId,
  tasks: initialTasks,
  onTasksUpdate,
}: {
  milestoneId: string;
  tasks: Task[];
  onTasksUpdate: (tasks: Task[]) => void;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleCreateTask = async (status: string) => {
    if (!newTaskTitle.trim()) return;
    setIsCreating(true);

    try {
      const response = await fetch(`/api/milestones/${milestoneId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          status,
        }),
      });

      if (response.ok) {
        const task = await response.json();
        const newTasks = [...tasks, task];
        setTasks(newTasks);
        onTasksUpdate(newTasks);
        setNewTaskTitle("");
        setNewTaskColumn(null);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      const newTasks = tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      setTasks(newTasks);
      onTasksUpdate(newTasks);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      const newTasks = tasks.filter((t) => t.id !== taskId);
      setTasks(newTasks);
      onTasksUpdate(newTasks);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map((column) => (
        <div key={column.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">
              {column.label}
            </h4>
            <span className="text-xs text-muted-foreground">
              {tasksByStatus[column.id].length}
            </span>
          </div>
          <div className="min-h-[100px] space-y-2 rounded-lg bg-muted/50 p-2">
            {tasksByStatus[column.id].map((task) => (
              <div
                key={task.id}
                className="group rounded-md bg-background p-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm">{task.title}</span>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge className={`text-xs ${typeColors[task.type]}`}>
                    {task.type}
                  </Badge>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="text-xs bg-transparent border-none p-0 text-muted-foreground cursor-pointer"
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            {newTaskColumn === column.id ? (
              <div className="space-y-2">
                <Input
                  autoFocus
                  placeholder="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateTask(column.id);
                    if (e.key === "Escape") {
                      setNewTaskColumn(null);
                      setNewTaskTitle("");
                    }
                  }}
                  className="h-8 text-sm"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCreateTask(column.id)}
                    disabled={isCreating || !newTaskTitle.trim()}
                  >
                    {isCreating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setNewTaskColumn(null);
                      setNewTaskTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setNewTaskColumn(column.id)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add task
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
