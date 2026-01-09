"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import { HighlightText } from "./highlight-text";

interface FAQ {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  notes: string;
}

interface FAQFormData {
  question: string;
  answer: string;
  notes: string;
}

interface FAQTableProps {
  faqs: FAQ[];
  onUpdate: (id: string, data: FAQFormData) => void;
  onCreate: (data: FAQFormData) => void;
  onDelete: (id: string) => void;
  resetSignal: number;
  searchQuery?: string;
  currentMatchId?: string | null;
}

interface EditingCell {
  id: string;
  field: "question" | "answer" | "notes";
}

export function FAQTable({
  faqs,
  onUpdate,
  onCreate,
  onDelete,
  resetSignal,
  searchQuery = "",
  currentMatchId = null,
}: FAQTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newRows, setNewRows] = useState<
    Array<{ tempId: string } & FAQFormData>
  >([]);
  const [autoFocusNewRowId, setAutoFocusNewRowId] = useState<string | null>(
    null
  );
  const [newRowErrorsById, setNewRowErrorsById] = useState<Record<string, true>>(
    {}
  );

  useEffect(() => {
    setEditingCell(null);
    setEditValue("");
    setNewRows([]);
    setAutoFocusNewRowId(null);
    setNewRowErrorsById({});
  }, [resetSignal]);

  const startEdit = (faq: FAQ, field: "question" | "answer" | "notes") => {
    setEditingCell({ id: faq.id, field });
    setEditValue(faq[field]);
  };

  const saveEdit = (faq: FAQ) => {
    if (!editingCell) return;

    const original = faq[editingCell.field];
    if (editValue === original) {
      setEditingCell(null);
      setEditValue("");
      return;
    }

    onUpdate(faq.id, {
      question: editingCell.field === "question" ? editValue : faq.question,
      answer: editingCell.field === "answer" ? editValue : faq.answer,
      notes: editingCell.field === "notes" ? editValue : faq.notes,
    });
    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, faq: FAQ) => {
    if (e.key === "Escape") {
      cancelEdit();
    } else if (e.key === "Enter" && e.metaKey) {
      saveEdit(faq);
    }
  };

  const addNewRow = () => {
    const tempId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setNewRows((prev) => [...prev, { tempId, question: "", answer: "", notes: "" }]);
    setAutoFocusNewRowId(tempId);
  };

  const removeNewRow = (tempId: string) => {
    setNewRows((prev) => prev.filter((r) => r.tempId !== tempId));
    setNewRowErrorsById((prev) => {
      if (!prev[tempId]) return prev;
      const { [tempId]: _removed, ...rest } = prev;
      return rest;
    });
    setAutoFocusNewRowId((prev) => (prev === tempId ? null : prev));
  };

  const commitNewRow = (row: { tempId: string } & FAQFormData) => {
    const question = row.question.trim();
    const answer = row.answer.trim();
    const notes = row.notes.trim();

    if (!question && !answer && !notes) {
      removeNewRow(row.tempId);
      return;
    }

    if (!question || !answer) {
      setNewRowErrorsById((prev) => ({ ...prev, [row.tempId]: true }));
      return;
    }

    onCreate({ question, answer, notes });
    removeNewRow(row.tempId);
  };

  const handleNewRowBlurCapture = (
    e: React.FocusEvent<HTMLDivElement>,
    row: { tempId: string } & FAQFormData
  ) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    commitNewRow(row);
  };

  const handleNewRowKeyDown = (
    e: React.KeyboardEvent,
    row: { tempId: string } & FAQFormData
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      removeNewRow(row.tempId);
      return;
    }
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      commitNewRow(row);
    }
  };

  const renderCell = (
    faq: FAQ,
    field: "question" | "answer" | "notes",
    width: string
  ) => {
    const isEditing = editingCell?.id === faq.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <div className={`${width} p-2 border-r last:border-r-0`}>
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, faq)}
            onBlur={() => saveEdit(faq)}
            autoFocus
            className="min-h-[100px] font-mono text-sm resize-none"
            placeholder={`Enter ${field}...`}
          />
          <div className="text-xs text-muted-foreground mt-1">
            ⌘+Enter to apply · Esc to cancel
          </div>
        </div>
      );
    }

    const matchIdPrefix = `match-${faq.id}-${field}`;

    return (
      <div
        className={`${width} p-3 border-r last:border-r-0 cursor-text hover:bg-muted/50 transition-colors`}
        onClick={() => startEdit(faq, field)}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none min-h-[1.5em] whitespace-pre-wrap">
          {searchQuery ? (
            <HighlightText
              text={faq[field] || "Click to add"}
              query={searchQuery}
              currentMatchId={currentMatchId ?? undefined}
              matchIdPrefix={matchIdPrefix}
            />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {faq[field] || "*Click to add*"}
            </ReactMarkdown>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex bg-muted/50 border-b font-medium text-sm">
        <div className="w-[30%] p-2 px-3 border-r">Question</div>
        <div className="w-[40%] p-2 px-3 border-r">Answer</div>
        <div className="w-[30%] p-2 px-3">Notes</div>
      </div>

      {/* Rows */}
      {faqs.map((faq) => (
        <div key={faq.id} className="flex border-b last:border-b-0 group">
          {renderCell(faq, "question", "w-[30%]")}
          {renderCell(faq, "answer", "w-[40%]")}
          <div className="w-[30%] flex">
            <div
              className="flex-1 p-3 cursor-text hover:bg-muted/50 transition-colors"
              onClick={() => startEdit(faq, "notes")}
            >
              {editingCell?.id === faq.id && editingCell?.field === "notes" ? (
                <div>
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, faq)}
                    onBlur={() => saveEdit(faq)}
                    autoFocus
                    className="min-h-[100px] font-mono text-sm resize-none"
                    placeholder="Enter notes..."
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    ⌘+Enter to apply · Esc to cancel
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none min-h-[1.5em] whitespace-pre-wrap">
                  {searchQuery ? (
                    <HighlightText
                      text={faq.notes || "Click to add"}
                      query={searchQuery}
                      currentMatchId={currentMatchId ?? undefined}
                      matchIdPrefix={`match-${faq.id}-notes`}
                    />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {faq.notes || "*Click to add*"}
                    </ReactMarkdown>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity m-2 shrink-0"
              onClick={() => onDelete(faq.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      {/* New Rows (draft entry) */}
      {newRows.map((row) => {
        const showError = newRowErrorsById[row.tempId] === true;
        const isQuestionMissing = showError && !row.question.trim();
        const isAnswerMissing = showError && !row.answer.trim();
        return (
          <div
            key={row.tempId}
            className="flex border-t bg-muted/20"
            onBlurCapture={(e) => handleNewRowBlurCapture(e, row)}
          >
            <div className="w-[30%] p-2 border-r">
              <Textarea
                value={row.question}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewRows((prev) =>
                    prev.map((r) => (r.tempId === row.tempId ? { ...r, question: value } : r))
                  );
                  if (showError) {
                    setNewRowErrorsById((prev) => {
                      if (!prev[row.tempId]) return prev;
                      const { [row.tempId]: _removed, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                onKeyDown={(e) => handleNewRowKeyDown(e, row)}
                autoFocus={autoFocusNewRowId === row.tempId}
                aria-invalid={isQuestionMissing}
                className="min-h-[60px] font-mono text-sm resize-none"
                placeholder="Enter question..."
              />
            </div>
            <div className="w-[40%] p-2 border-r">
              <Textarea
                value={row.answer}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewRows((prev) =>
                    prev.map((r) => (r.tempId === row.tempId ? { ...r, answer: value } : r))
                  );
                  if (showError) {
                    setNewRowErrorsById((prev) => {
                      if (!prev[row.tempId]) return prev;
                      const { [row.tempId]: _removed, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                onKeyDown={(e) => handleNewRowKeyDown(e, row)}
                aria-invalid={isAnswerMissing}
                className="min-h-[60px] font-mono text-sm resize-none"
                placeholder="Enter answer..."
              />
            </div>
            <div className="w-[30%] p-2">
              <Textarea
                value={row.notes}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewRows((prev) =>
                    prev.map((r) => (r.tempId === row.tempId ? { ...r, notes: value } : r))
                  );
                  if (showError) {
                    setNewRowErrorsById((prev) => {
                      if (!prev[row.tempId]) return prev;
                      const { [row.tempId]: _removed, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                onKeyDown={(e) => handleNewRowKeyDown(e, row)}
                className="min-h-[60px] font-mono text-sm resize-none"
                placeholder="Notes (optional)..."
              />
              <div className="text-xs text-muted-foreground mt-2">
                Auto-adds when you click away · ⌘+Enter to add · Esc to discard
              </div>
              {showError && (
                <div className="text-xs text-destructive mt-1">
                  Question and answer are required
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add Row */}
      <div
        className="flex items-center gap-2 p-2 px-3 text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={addNewRow}
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm">Add FAQ</span>
      </div>
    </div>
  );
}
