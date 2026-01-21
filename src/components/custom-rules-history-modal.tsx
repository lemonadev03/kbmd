"use client";

import { useState, useEffect, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History, Eye, RotateCcw, ChevronRight } from "lucide-react";
import { getCustomRulesHistory, restoreCustomRulesVersion } from "@/db/actions";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  authorName: string | null;
}

interface CustomRulesHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  onRestore: (content: string) => void;
}

export function CustomRulesHistoryModal({
  open,
  onOpenChange,
  orgSlug,
  onRestore,
}: CustomRulesHistoryModalProps) {
  const confirm = useConfirm();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setSelectedEntry(null);
      getCustomRulesHistory(orgSlug)
        .then((data) => {
          setHistory(data);
        })
        .catch((error) => {
          console.error("Failed to load history:", error);
          toast.error("Failed to load version history");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, orgSlug]);

  const handleRestore = async (entry: HistoryEntry) => {
    const confirmed = await confirm({
      title: "Restore this version?",
      description:
        "The current content will be saved to history before restoring this version.",
      confirmLabel: "Restore",
    });
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await restoreCustomRulesVersion(orgSlug, entry.id);
        onRestore(entry.content);
        toast.success("Version restored successfully");
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to restore version:", error);
        toast.error("Failed to restore version");
      }
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No version history yet</p>
              <p className="text-sm mt-1">
                Previous versions will appear here when you save changes
              </p>
            </div>
          ) : selectedEntry ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEntry(null)}
                >
                  <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                  Back to list
                </Button>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedEntry.createdAt)} by{" "}
                  {selectedEntry.authorName || "Unknown"}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-auto border border-border/60 rounded-xl p-4 bg-background/70">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedEntry.content}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEntry(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleRestore(selectedEntry)}
                  disabled={isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore this version
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 overflow-auto max-h-[60vh] pr-1">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "p-3 rounded-lg border border-border/60 hover:border-border transition-colors",
                    "bg-background/50 hover:bg-background/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {formatDate(entry.createdAt)}
                        </span>
                        <span className="text-muted-foreground">
                          by {entry.authorName || "Unknown"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {truncateContent(entry.content)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(entry)}
                        disabled={isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!selectedEntry && history.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
