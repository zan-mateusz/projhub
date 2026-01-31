"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepoSelector } from "./repo-selector";

interface ProjectRepoCardProps {
  projectId: string;
  repoUrl: string | null;
}

export function ProjectRepoCard({ projectId, repoUrl: initialRepoUrl }: ProjectRepoCardProps) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState(initialRepoUrl);

  const handleRepoChange = (newRepoUrl: string | null) => {
    setRepoUrl(newRepoUrl);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Repository</CardTitle>
      </CardHeader>
      <CardContent>
        <RepoSelector
          projectId={projectId}
          currentRepoUrl={repoUrl}
          onRepoChange={handleRepoChange}
        />
      </CardContent>
    </Card>
  );
}
