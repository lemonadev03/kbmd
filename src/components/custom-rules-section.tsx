"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, Eye, Edit } from "lucide-react";
import { HighlightText } from "./highlight-text";

interface CustomRulesSectionProps {
  content: string;
  onUpdate: (content: string) => void;
  resetSignal: number;
  searchQuery?: string;
  currentMatchId?: string | null;
}

export function CustomRulesSection({
  content,
  onUpdate,
  resetSignal,
  searchQuery = "",
  currentMatchId = null,
}: CustomRulesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editValue, setEditValue] = useState(content);
  const [isPreview, setIsPreview] = useState(false);

  // Reset local state when resetSignal changes (discard was clicked)
  useEffect(() => {
    setEditValue(content);
  }, [resetSignal, content]);

  const handleChange = (value: string) => {
    setEditValue(value);
    onUpdate(value);
  };

  return (
    <Card className="mb-6">
      <CardHeader
        className="cursor-pointer select-none py-3 sticky top-12 z-10 bg-card rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-lg">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          <FileText className="h-5 w-5" />
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
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="flex justify-end mb-2">
            <div className="flex gap-1">
              <Button
                variant={!isPreview ? "secondary" : "ghost"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreview(false);
                }}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant={isPreview ? "secondary" : "ghost"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreview(true);
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </div>
          </div>

          {isPreview ? (
            <div className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-4 min-h-[200px]">
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
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter custom rules in Markdown format..."
              className="min-h-[200px] font-mono text-sm resize-y"
            />
          )}

          <p className="text-xs text-muted-foreground mt-2">
            Define custom rules and logic that are not bound to specific FAQs. Supports Markdown formatting.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
