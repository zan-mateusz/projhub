"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { File, FileText, Image, Trash2, Eye, History, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ArtifactUpload } from "./artifact-upload";
import { MarkdownEditor } from "./markdown-editor";

interface ArtifactVersion {
  id: string;
  content: string | null;
  versionNumber: number;
  createdAt: string;
}

interface Artifact {
  id: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  versions: ArtifactVersion[];
}

interface ArtifactGalleryProps {
  parentType: "project" | "milestone" | "task";
  parentId: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "text/markdown" || mimeType === "text/plain") return FileText;
  return File;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArtifactGallery({ parentType, parentId }: ArtifactGalleryProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchArtifacts = async () => {
    try {
      const response = await fetch(
        `/api/artifacts?parentType=${parentType}&parentId=${parentId}`
      );
      if (response.ok) {
        const data = await response.json();
        setArtifacts(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, [parentType, parentId]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setArtifacts(artifacts.filter((a) => a.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleViewArtifact = (artifact: Artifact) => {
    if (
      artifact.mimeType === "text/markdown" ||
      artifact.mimeType === "text/plain" ||
      artifact.filename.endsWith(".md")
    ) {
      setSelectedArtifact(artifact);
      setShowEditor(true);
    } else if (artifact.mimeType.startsWith("image/")) {
      // Open image in new tab
      window.open(`/api/${artifact.storagePath}`, "_blank");
    } else {
      // Download file
      window.open(`/api/${artifact.storagePath}`, "_blank");
    }
  };

  const isMarkdown = (artifact: Artifact) =>
    artifact.mimeType === "text/markdown" ||
    artifact.mimeType === "text/plain" ||
    artifact.filename.endsWith(".md");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ArtifactUpload
        parentType={parentType}
        parentId={parentId}
        onUpload={fetchArtifacts}
      />

      {artifacts.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No artifacts uploaded yet
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artifacts.map((artifact) => {
            const Icon = getFileIcon(artifact.mimeType);
            const isImage = artifact.mimeType.startsWith("image/");

            return (
              <Card key={artifact.id} className="overflow-hidden">
                {isImage && (
                  <div className="aspect-video bg-muted">
                    <img
                      src={`/api/${artifact.storagePath}`}
                      alt={artifact.filename}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardContent className={isImage ? "pt-3" : "pt-4"}>
                  <div className="flex items-start gap-3">
                    {!isImage && (
                      <div className="rounded-lg bg-muted p-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={artifact.filename}>
                        {artifact.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(artifact.sizeBytes)} •{" "}
                        {format(new Date(artifact.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewArtifact(artifact)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      {isMarkdown(artifact) ? "Edit" : "View"}
                    </Button>
                    {isMarkdown(artifact) && artifact.versions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedArtifact(artifact);
                          setShowVersions(true);
                        }}
                      >
                        <History className="mr-1 h-3 w-3" />
                        v{artifact.versions[0]?.versionNumber || 1}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(artifact.id)}
                      disabled={deleting === artifact.id}
                      className="ml-auto text-destructive hover:text-destructive"
                    >
                      {deleting === artifact.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Markdown Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedArtifact?.filename}</DialogTitle>
          </DialogHeader>
          {selectedArtifact && (
            <MarkdownEditor
              artifactId={selectedArtifact.id}
              initialContent={selectedArtifact.versions[0]?.content || ""}
              onSave={() => {
                fetchArtifacts();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          {selectedArtifact && (
            <div className="space-y-2">
              {selectedArtifact.versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">Version {version.versionNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedArtifact({
                        ...selectedArtifact,
                        versions: [version],
                      });
                      setShowVersions(false);
                      setShowEditor(true);
                    }}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
