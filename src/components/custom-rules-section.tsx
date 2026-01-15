"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { HighlightText } from "./highlight-text";

interface CustomRulesSectionProps {
  content: string;
  onUpdate: (content: string) => void;
  resetSignal: number;
  readOnly?: boolean;
  searchQuery?: string;
  currentMatchId?: string | null;
}

export function CustomRulesSection({
  content,
  onUpdate,
  resetSignal,
  readOnly = false,
  searchQuery = "",
  currentMatchId = null,
}: CustomRulesSectionProps) {
  const canEdit = !readOnly;
  const [editValue, setEditValue] = useState(content);
  const [isPreview, setIsPreview] = useState(false);

  // Reset local state when resetSignal changes (discard was clicked)
  useEffect(() => {
    queueMicrotask(() => setEditValue(content));
  }, [resetSignal, content]);

  const handleChange = (value: string) => {
    setEditValue(value);
    if (canEdit) {
      onUpdate(value);
    }
  };

  return (
    <section className="mb-8">
      <div className="sticky top-24 z-10 bg-background/95 backdrop-blur border-b border-border/60 py-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {searchQuery ? (
            <HighlightText
              text="Custom Rules"
              query={searchQuery}
              currentMatchId={currentMatchId ?? undefined}
              matchIdPrefix="match-title-custom-rules"
            />
          ) : (
            "Custom Rules"
          )}
        </h2>
      </div>

      <Card className="mt-3">
        <CardContent>
          {canEdit && (
            <div className="flex justify-end mb-2">
              <div className="flex gap-1">
                <Button
                  variant={!isPreview ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setIsPreview(false)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant={isPreview ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setIsPreview(true)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
            </div>
          )}

          {isPreview || !canEdit ? (
            <div className="prose prose-sm dark:prose-invert max-w-none border border-border/60 rounded-xl p-4 min-h-[200px] bg-background/70">
              {editValue ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editValue}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">No content yet</p>
              )}
            </div>
          ) : (
            <Textarea
              value={editValue}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Enter custom rules in Markdown format..."
              className="min-h-[200px] font-mono text-sm resize-y"
            />
          )}

          <p className="text-xs text-muted-foreground mt-2">
            Define custom rules and logic that are not bound to specific FAQs.
            Supports Markdown formatting.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
