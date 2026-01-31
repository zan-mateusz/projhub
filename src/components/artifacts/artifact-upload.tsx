"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, File, Image, FileText } from "lucide-react";

interface ArtifactUploadProps {
  parentType: "project" | "milestone" | "task";
  parentId: string;
  onUpload: () => void;
}

export function ArtifactUpload({ parentType, parentId, onUpload }: ArtifactUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("parentType", parentType);
        formData.append("parentId", parentId);

        await fetch("/api/artifacts", {
          method: "POST",
          body: formData,
        });
      }
      onUpload();
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => handleUpload(e.target.files)}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={uploading}
      />
      <div className="flex flex-col items-center gap-2">
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="flex gap-2">
              <Image className="h-6 w-6 text-muted-foreground" />
              <FileText className="h-6 w-6 text-muted-foreground" />
              <File className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Images, Markdown, and other files
            </p>
          </>
        )}
      </div>
    </div>
  );
}
