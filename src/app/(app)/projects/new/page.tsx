"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const stages = [
  { value: "idea", label: "Idea", description: "Initial concept or brainstorming" },
  { value: "planning", label: "Planning", description: "Defining scope and requirements" },
  { value: "execution", label: "Execution", description: "Active development" },
  { value: "monitoring", label: "Monitoring", description: "Testing and refinement" },
  { value: "done", label: "Done", description: "Completed or archived" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stage: "idea",
    repoUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          stage: formData.stage,
          repoUrl: formData.repoUrl || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }

      const project = await response.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Project</h1>
          <p className="text-muted-foreground">Create a new project to track</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Fill in the basic information about your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Awesome Project"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this project about?"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Stage</label>
              <div className="grid gap-2">
                {stages.map((stage) => (
                  <label
                    key={stage.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      formData.stage === stage.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="stage"
                      value={stage.value}
                      checked={formData.stage === stage.value}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="sr-only"
                    />
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        formData.stage === stage.value
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    />
                    <div>
                      <div className="font-medium">{stage.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {stage.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="repoUrl" className="text-sm font-medium">
                GitHub Repository URL
              </label>
              <Input
                id="repoUrl"
                type="url"
                value={formData.repoUrl}
                onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                placeholder="https://github.com/username/repo"
              />
              <p className="text-xs text-muted-foreground">
                Link a GitHub repository to track commits and pull requests
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading || !formData.name}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
