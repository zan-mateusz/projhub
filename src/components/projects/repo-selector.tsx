"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GitBranch, Search, Star, Lock, Loader2, ExternalLink } from "lucide-react";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  private: boolean;
  updated_at: string;
}

interface RepoSelectorProps {
  projectId: string;
  currentRepoUrl: string | null;
  onRepoChange: (repoUrl: string | null) => void;
}

export function RepoSelector({ projectId, currentRepoUrl, onRepoChange }: RepoSelectorProps) {
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && repos.length === 0) {
      fetchRepos();
    }
  }, [open]);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/github/repos");
      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (repo: Repo) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repo.html_url }),
      });

      if (response.ok) {
        onRepoChange(repo.html_url);
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: null }),
      });

      if (response.ok) {
        onRepoChange(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const currentRepo = currentRepoUrl
    ? currentRepoUrl.replace("https://github.com/", "")
    : null;

  return (
    <div className="space-y-2">
      {currentRepoUrl ? (
        <div className="flex items-center gap-2">
          <a
            href={currentRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <GitBranch className="h-4 w-4" />
            {currentRepo}
            <ExternalLink className="h-3 w-3" />
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnlink}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Unlink"}
          </Button>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <GitBranch className="mr-2 h-4 w-4" />
              Link Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Link GitHub Repository</DialogTitle>
              <DialogDescription>
                Select a repository to track commits and pull requests
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {search ? "No repositories found" : "No repositories available"}
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleSelect(repo)}
                    disabled={saving}
                    className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{repo.name}</span>
                        {repo.private && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span className="text-xs">{repo.stargazers_count}</span>
                      </div>
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
