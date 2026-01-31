"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, GitCommit, GitPullRequest, AlertCircle, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface GitHubEvent {
  id: string;
  type: string;
  eventDate: Date;
  author: string;
  title: string;
  url: string;
  details: string | null;
}

interface ActivityFeedProps {
  projectId: string;
  events: GitHubEvent[];
  hasRepo: boolean;
}

const eventIcons: Record<string, typeof GitCommit> = {
  commit: GitCommit,
  pull_request: GitPullRequest,
  issue: AlertCircle,
};

const eventColors: Record<string, string> = {
  commit: "text-green-600 bg-green-100",
  pull_request: "text-purple-600 bg-purple-100",
  issue: "text-yellow-600 bg-yellow-100",
};

export function ActivityFeed({ projectId, events, hasRepo }: ActivityFeedProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/github/sync`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!hasRepo) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <GitBranch className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No repository linked</h3>
          <p className="text-center text-muted-foreground">
            Link a GitHub repository to track commits, pull requests, and issues
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activity</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No activity yet</p>
            <p className="text-sm">Click Sync to fetch recent activity from GitHub</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const Icon = eventIcons[event.type] || GitCommit;
              const colorClass = eventColors[event.type] || "text-gray-600 bg-gray-100";
              const eventDate = new Date(event.eventDate);

              return (
                <div key={event.id} className="flex gap-3">
                  <div className={`mt-0.5 rounded-full p-1.5 ${colorClass}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-1"
                    >
                      <span className="font-medium group-hover:underline line-clamp-2">
                        {event.title}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                    </a>
                    <p className="text-sm text-muted-foreground">
                      {event.author} •{" "}
                      <span title={format(eventDate, "PPpp")}>
                        {formatDistanceToNow(eventDate, { addSuffix: true })}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
