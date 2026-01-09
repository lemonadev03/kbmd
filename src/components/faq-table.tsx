"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";

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
}

interface EditingCell {
  id: string;
  field: "question" | "answer" | "notes";
}

export function FAQTable({ faqs, onUpdate, onCreate, onDelete }: FAQTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newRow, setNewRow] = useState<FAQFormData | null>(null);

  const startEdit = (faq: FAQ, field: "question" | "answer" | "notes") => {
    setEditingCell({ id: faq.id, field });
    setEditValue(faq[field]);
  };

  const saveEdit = (faq: FAQ) => {
    if (!editingCell) return;
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

  const startNewRow = () => {
    setNewRow({ question: "", answer: "", notes: "" });
  };

  const saveNewRow = () => {
    if (!newRow || !newRow.question.trim() || !newRow.answer.trim()) return;
    onCreate(newRow);
    setNewRow(null);
  };

  const cancelNewRow = () => {
    setNewRow(null);
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
            ⌘+Enter to save · Esc to cancel
          </div>
        </div>
      );
    }

    return (
      <div
        className={`${width} p-3 border-r last:border-r-0 cursor-text hover:bg-muted/50 transition-colors`}
        onClick={() => startEdit(faq, field)}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none min-h-[1.5em]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {faq[field] || (field === "notes" ? "*Click to add*" : "")}
          </ReactMarkdown>
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
                    ⌘+Enter to save · Esc to cancel
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none min-h-[1.5em]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {faq.notes || "*Click to add*"}
                  </ReactMarkdown>
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

      {/* New Row */}
      {newRow ? (
        <div className="flex border-t bg-muted/20">
          <div className="w-[30%] p-2 border-r">
            <Textarea
              value={newRow.question}
              onChange={(e) => setNewRow({ ...newRow, question: e.target.value })}
              autoFocus
              className="min-h-[60px] font-mono text-sm resize-none"
              placeholder="Enter question..."
            />
          </div>
          <div className="w-[40%] p-2 border-r">
            <Textarea
              value={newRow.answer}
              onChange={(e) => setNewRow({ ...newRow, answer: e.target.value })}
              className="min-h-[60px] font-mono text-sm resize-none"
              placeholder="Enter answer..."
            />
          </div>
          <div className="w-[30%] p-2">
            <Textarea
              value={newRow.notes}
              onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })}
              className="min-h-[60px] font-mono text-sm resize-none"
              placeholder="Notes (optional)..."
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={saveNewRow} disabled={!newRow.question.trim() || !newRow.answer.trim()}>
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={cancelNewRow}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 p-2 px-3 text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors"
          onClick={startNewRow}
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Add FAQ</span>
        </div>
      )}
    </div>
  );
}
