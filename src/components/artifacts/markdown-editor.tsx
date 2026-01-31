"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, Eye, Edit } from "lucide-react";

interface MarkdownEditorProps {
  artifactId: string;
  initialContent: string;
  onSave?: () => void;
}

// Simple markdown to HTML conversion
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, "<code>$1</code>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    // Unordered lists
    .replace(/^\s*[-*+] (.*$)/gm, "<li>$1</li>")
    // Horizontal rules
    .replace(/^---$/gm, "<hr />")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br />");

  // Wrap in paragraph
  html = `<p>${html}</p>`;

  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, "<ul>$&</ul>");

  return html;
}

export function MarkdownEditor({
  artifactId,
  initialContent,
  onSave,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("edit");

  useEffect(() => {
    setHasChanges(content !== initialContent);
  }, [content, initialContent]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/artifacts/${artifactId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setHasChanges(false);
        onSave?.();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="edit">
              <Edit className="mr-1 h-3 w-3" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
          {hasChanges && " *"}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border">
        {activeTab === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm focus:outline-none"
            placeholder="Write your markdown here..."
          />
        ) : (
          <div
            className="prose prose-sm h-full max-w-none overflow-auto p-4 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
          />
        )}
      </div>
    </div>
  );
}
