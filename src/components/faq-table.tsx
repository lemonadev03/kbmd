"use client";

import { useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { HighlightText } from "./highlight-text";
import { copyToClipboard } from "@/lib/clipboard";

interface FAQ {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  notes: string;
  order: number;
}

interface FAQFormData {
  question: string;
  answer: string;
  notes: string;
}

interface FAQTableProps {
  sectionId: string;
  faqs: FAQ[];
  onUpdate: (id: string, data: FAQFormData) => void;
  onCreate: (data: FAQFormData) => void;
  onDelete: (id: string) => void;
  onReorderFaqs?: (sectionId: string, orderedIds: string[]) => void;
  reorderDisabled?: boolean;
  searchQuery?: string;
  currentMatchId?: string | null;
}

interface EditingCell {
  id: string;
  field: "question" | "answer" | "notes";
}

function FAQCell({
  faq,
  field,
  widthClass,
  isEditing,
  editValue,
  onStartEdit,
  onEditChange,
  onFinishEdit,
  onKeyDown,
  searchQuery,
  currentMatchId,
}: {
  faq: FAQ;
  field: EditingCell["field"];
  widthClass: string;
  isEditing: boolean;
  editValue: string;
  onStartEdit: (faq: FAQ, field: EditingCell["field"]) => void;
  onEditChange: (faq: FAQ, value: string) => void;
  onFinishEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  searchQuery: string;
  currentMatchId: string | null;
}) {
  const value = faq[field] || "";
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const copied = copiedValue === value;

  if (isEditing) {
    return (
      <div className={`${widthClass} p-3 border-r border-border/60`}>
        <Textarea
          value={editValue}
          onChange={(e) => onEditChange(faq, e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onFinishEdit}
          autoFocus
          className="min-h-[100px] font-mono text-sm resize-none bg-background/70"
          placeholder={`Enter ${field}...`}
        />
        <div className="text-xs text-muted-foreground mt-1">
          ⌘+Enter to apply · Esc to cancel
        </div>
      </div>
    );
  }

  const matchIdPrefix = `match-${faq.id}-${field}`;
  const copyDisabled = !value.trim();

  return (
    <div
      className={`${widthClass} p-4 border-r border-border/60 cursor-text hover:bg-muted/40 transition-colors relative group/cell focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30`}
      onClick={() => onStartEdit(faq, field)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStartEdit(faq, field);
        }
      }}
    >
      <div
        className="prose prose-sm dark:prose-invert max-w-none min-h-[1.5em] whitespace-pre-wrap pr-28"
      >
        {searchQuery ? (
          <HighlightText
            text={value || "Click to add"}
            query={searchQuery}
            currentMatchId={currentMatchId ?? undefined}
            matchIdPrefix={matchIdPrefix}
          />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {value || "*Click to add*"}
          </ReactMarkdown>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-2 bottom-2 opacity-0 group-hover/cell:opacity-100 group-focus/cell:opacity-100 group-focus-within/cell:opacity-100 transition-opacity">
          <div className="pointer-events-auto">
            <Button
              variant="outline"
              size="sm"
              className="bg-background/70 backdrop-blur-sm"
              title={copied ? "Copied" : "Copy"}
              aria-label={copied ? "Copied" : "Copy"}
              disabled={copyDisabled}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (copyDisabled) return;
                const ok = await copyToClipboard(value);
                if (ok) {
                  setCopiedValue(value);
                  window.setTimeout(() => setCopiedValue(null), 1000);
                }
              }}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableFAQRow({
  faq,
  children,
  onDelete,
  reorderEnabled,
  reorderDisabledReason,
}: {
  faq: FAQ;
  children: ReactNode;
  onDelete: () => void;
  reorderEnabled: boolean;
  reorderDisabledReason: string;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id, disabled: !reorderEnabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex border-b border-border/60 last:border-b-0 group/row",
        isDragging && "opacity-70"
      )}
    >
      {children}
      <div className="w-12 p-2 flex flex-col items-center justify-center gap-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
            reorderEnabled
              ? "opacity-0 group-hover/row:opacity-100 hover:bg-muted/60 cursor-grab active:cursor-grabbing"
              : "opacity-0 group-hover/row:opacity-60 cursor-not-allowed"
          )}
          title={reorderEnabled ? "Drag to reorder" : reorderDisabledReason}
          aria-label={reorderEnabled ? "Drag to reorder" : reorderDisabledReason}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...(reorderEnabled ? listeners : {})}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover/row:opacity-100 transition-opacity"
          title="Delete"
          aria-label="Delete"
          onClick={() => onDelete()}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function FAQTable({
  sectionId,
  faqs,
  onUpdate,
  onCreate,
  onDelete,
  onReorderFaqs,
  reorderDisabled,
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

  const startEdit = (faq: FAQ, field: "question" | "answer" | "notes") => {
    setEditingCell({ id: faq.id, field });
    setEditValue(faq[field]);
  };

  const handleEditChange = (faq: FAQ, value: string) => {
    setEditValue(value);
    // Immediately update the draft so changes can be saved
    if (editingCell) {
      onUpdate(faq.id, {
        question: editingCell.field === "question" ? value : faq.question,
        answer: editingCell.field === "answer" ? value : faq.answer,
        notes: editingCell.field === "notes" ? value : faq.notes,
      });
    }
  };

  const finishEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      cancelEdit();
    } else if (e.key === "Enter" && e.metaKey) {
      finishEdit();
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
      const next = { ...prev };
      delete next[tempId];
      return next;
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

  const canUseDnD = Boolean(onReorderFaqs);
  const reorderEnabled =
    canUseDnD &&
    !reorderDisabled &&
    searchQuery.trim().length === 0 &&
    editingCell === null &&
    newRows.length === 0 &&
    faqs.length > 1;

  const reorderDisabledReason = useMemo(() => {
    if (!canUseDnD) return "Reordering unavailable";
    if (reorderDisabled) return "Reordering disabled";
    if (searchQuery.trim().length > 0) return "Clear search to reorder";
    if (editingCell !== null) return "Finish editing to reorder";
    if (newRows.length > 0) return "Finish adding new FAQs to reorder";
    if (faqs.length <= 1) return "Not enough rows to reorder";
    return "Reordering disabled";
  }, [canUseDnD, reorderDisabled, searchQuery, editingCell, newRows.length, faqs.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canUseDnD) return;
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const ids = faqs.map((f) => f.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const orderedIds = arrayMove(ids, oldIndex, newIndex);
    onReorderFaqs?.(sectionId, orderedIds);
  };

  return (
    <div className="rounded-2xl border bg-card/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Header */}
          <div className="flex bg-muted/40 border-b border-border/60 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <div className="w-[30%] p-3 px-4 border-r border-border/60">
              Question
            </div>
            <div className="w-[40%] p-3 px-4 border-r border-border/60">
              Answer
            </div>
            <div className="w-[calc(30%-3rem)] p-3 px-4 border-r border-border/60">
              Notes
            </div>
            <div className="w-12 p-3 px-2" />
          </div>

          {/* Rows */}
          {canUseDnD ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={faqs.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {faqs.map((faq) => (
                  <SortableFAQRow
                    key={faq.id}
                    faq={faq}
                    reorderEnabled={reorderEnabled}
                    reorderDisabledReason={reorderDisabledReason}
                    onDelete={() => onDelete(faq.id)}
                  >
                    <FAQCell
                      faq={faq}
                      field="question"
                      widthClass="w-[30%]"
                      isEditing={
                        editingCell?.id === faq.id &&
                        editingCell?.field === "question"
                      }
                      editValue={editValue}
                      onStartEdit={startEdit}
                      onEditChange={handleEditChange}
                      onFinishEdit={finishEdit}
                      onKeyDown={handleKeyDown}
                      searchQuery={searchQuery}
                      currentMatchId={currentMatchId}
                    />
                    <FAQCell
                      faq={faq}
                      field="answer"
                      widthClass="w-[40%]"
                      isEditing={
                        editingCell?.id === faq.id &&
                        editingCell?.field === "answer"
                      }
                      editValue={editValue}
                      onStartEdit={startEdit}
                      onEditChange={handleEditChange}
                      onFinishEdit={finishEdit}
                      onKeyDown={handleKeyDown}
                      searchQuery={searchQuery}
                      currentMatchId={currentMatchId}
                    />
                    <FAQCell
                      faq={faq}
                      field="notes"
                      widthClass="w-[calc(30%-3rem)]"
                      isEditing={
                        editingCell?.id === faq.id && editingCell?.field === "notes"
                      }
                      editValue={editValue}
                      onStartEdit={startEdit}
                      onEditChange={handleEditChange}
                      onFinishEdit={finishEdit}
                      onKeyDown={handleKeyDown}
                      searchQuery={searchQuery}
                      currentMatchId={currentMatchId}
                    />
                  </SortableFAQRow>
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            faqs.map((faq) => (
              <div
                key={faq.id}
                className="flex border-b border-border/60 last:border-b-0 group/row"
              >
                <FAQCell
                  faq={faq}
                  field="question"
                  widthClass="w-[30%]"
                  isEditing={
                    editingCell?.id === faq.id && editingCell?.field === "question"
                  }
                  editValue={editValue}
                  onStartEdit={startEdit}
                  onEditChange={handleEditChange}
                  onFinishEdit={finishEdit}
                  onKeyDown={handleKeyDown}
                  searchQuery={searchQuery}
                  currentMatchId={currentMatchId}
                />
                <FAQCell
                  faq={faq}
                  field="answer"
                  widthClass="w-[40%]"
                  isEditing={
                    editingCell?.id === faq.id && editingCell?.field === "answer"
                  }
                  editValue={editValue}
                  onStartEdit={startEdit}
                  onEditChange={handleEditChange}
                  onFinishEdit={finishEdit}
                  onKeyDown={handleKeyDown}
                  searchQuery={searchQuery}
                  currentMatchId={currentMatchId}
                />
                <FAQCell
                  faq={faq}
                  field="notes"
                  widthClass="w-[calc(30%-3rem)]"
                  isEditing={
                    editingCell?.id === faq.id && editingCell?.field === "notes"
                  }
                  editValue={editValue}
                  onStartEdit={startEdit}
                  onEditChange={handleEditChange}
                  onFinishEdit={finishEdit}
                  onKeyDown={handleKeyDown}
                  searchQuery={searchQuery}
                  currentMatchId={currentMatchId}
                />
                <div className="w-12 p-2 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity"
                    title="Delete"
                    aria-label="Delete"
                    onClick={() => onDelete(faq.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {/* New Rows (draft entry) */}
          {newRows.map((row) => {
            const showError = newRowErrorsById[row.tempId] === true;
            const isQuestionMissing = showError && !row.question.trim();
            const isAnswerMissing = showError && !row.answer.trim();
            return (
              <div
                key={row.tempId}
                className="flex border-t border-border/60 bg-muted/15"
                onBlurCapture={(e) => handleNewRowBlurCapture(e, row)}
              >
                <div className="w-[30%] p-3 border-r border-border/60">
                  <Textarea
                    value={row.question}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewRows((prev) =>
                        prev.map((r) =>
                          r.tempId === row.tempId ? { ...r, question: value } : r
                        )
                      );
                      if (showError) {
                        setNewRowErrorsById((prev) => {
                          if (!prev[row.tempId]) return prev;
                          const next = { ...prev };
                          delete next[row.tempId];
                          return next;
                        });
                      }
                    }}
                    onKeyDown={(e) => handleNewRowKeyDown(e, row)}
                    autoFocus={autoFocusNewRowId === row.tempId}
                    aria-invalid={isQuestionMissing}
                    className="min-h-[60px] font-mono text-sm resize-none bg-background/70"
                    placeholder="Enter question..."
                  />
                </div>
                <div className="w-[40%] p-3 border-r border-border/60">
                  <Textarea
                    value={row.answer}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewRows((prev) =>
                        prev.map((r) =>
                          r.tempId === row.tempId ? { ...r, answer: value } : r
                        )
                      );
                      if (showError) {
                        setNewRowErrorsById((prev) => {
                          if (!prev[row.tempId]) return prev;
                          const next = { ...prev };
                          delete next[row.tempId];
                          return next;
                        });
                      }
                    }}
                    onKeyDown={(e) => handleNewRowKeyDown(e, row)}
                    aria-invalid={isAnswerMissing}
                    className="min-h-[60px] font-mono text-sm resize-none bg-background/70"
                    placeholder="Enter answer..."
                  />
                </div>
                <div className="w-[calc(30%-3rem)] p-3 border-r border-border/60">
                  <Textarea
                    value={row.notes}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewRows((prev) =>
                        prev.map((r) =>
                          r.tempId === row.tempId ? { ...r, notes: value } : r
                        )
                      );
                      if (showError) {
                        setNewRowErrorsById((prev) => {
                          if (!prev[row.tempId]) return prev;
                          const next = { ...prev };
                          delete next[row.tempId];
                          return next;
                        });
                      }
                    }}
                    onKeyDown={(e) => handleNewRowKeyDown(e, row)}
                    className="min-h-[60px] font-mono text-sm resize-none bg-background/70"
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
                <div className="w-12 p-3" />
              </div>
            );
          })}

          {/* Add Row */}
          <div
            className="flex items-center gap-2 p-3 px-4 text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={addNewRow}
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add FAQ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
