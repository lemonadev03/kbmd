"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { HighlightText } from "./highlight-text";
import { cn } from "@/lib/utils";

interface Variable {
  id: string;
  key: string;
  value: string;
}

interface VariablesSectionProps {
  variables: Variable[];
  onCreate: (key: string, value: string) => void;
  onUpdate: (id: string, key: string, value: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
  searchQuery?: string;
  currentMatchId?: string | null;
}

export function VariablesSection({
  variables,
  onCreate,
  onUpdate,
  onDelete,
  readOnly = false,
  searchQuery = "",
  currentMatchId = null,
}: VariablesSectionProps) {
  const canEdit = !readOnly;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const startEdit = (variable: Variable) => {
    if (!canEdit) return;
    setEditingId(variable.id);
    setEditKey(variable.key);
    setEditValue(variable.value);
  };

  const saveEdit = () => {
    if (editingId && editKey.trim()) {
      onUpdate(editingId, editKey.trim(), editValue.trim());
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditKey("");
    setEditValue("");
  };

  const handleAdd = () => {
    if (!canEdit) return;
    if (newKey.trim()) {
      onCreate(newKey.trim(), newValue.trim());
      setNewKey("");
      setNewValue("");
      setIsAdding(false);
    }
  };

  return (
    <section className="mb-8">
      <div className="sticky top-24 z-10 bg-background/95 backdrop-blur border-b border-border/60 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {searchQuery ? (
              <HighlightText
                text="Variables"
                query={searchQuery}
                currentMatchId={currentMatchId ?? undefined}
                matchIdPrefix="match-title-variables"
              />
            ) : (
              "Variables"
            )}
          </h2>
          <span className="text-xs text-muted-foreground">({variables.length})</span>
        </div>
      </div>

      <div className="mt-3 border rounded-2xl bg-card/80 shadow-sm">
        {/* Variable rows */}
        {variables.map((variable) => (
          <div
            key={variable.id}
            className="flex items-center gap-2 p-3 px-4 border-b border-border/60 last:border-b-0 group hover:bg-muted/30"
          >
            {editingId === variable.id ? (
              <>
                <Input
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  placeholder="KEY"
                  className="w-48 font-mono text-sm h-8"
                  autoFocus
                />
                <span className="text-muted-foreground">=</span>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  placeholder="value"
                  className="flex-1 font-mono text-sm h-8"
                />
                <Button size="sm" variant="ghost" onClick={saveEdit}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <code
                  className={cn(
                    "bg-muted/60 px-2 py-1 rounded text-sm font-mono",
                    canEdit ? "cursor-pointer hover:bg-muted/80" : "cursor-default"
                  )}
                  onClick={() => startEdit(variable)}
                >
                  {variable.key}
                </code>
                <span className="text-muted-foreground">=</span>
                <span
                  className={cn(
                    "flex-1 font-mono text-sm",
                    canEdit ? "cursor-pointer hover:text-foreground/80" : "cursor-default"
                  )}
                  onClick={() => startEdit(variable)}
                >
                  {variable.value || (
                    <span className="text-muted-foreground italic">empty</span>
                  )}
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(variable.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add new variable */}
        {canEdit && isAdding ? (
          <div className="flex items-center gap-2 p-3 px-4 bg-muted/20">
            <Input
              value={newKey}
              onChange={(e) =>
                setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewKey("");
                  setNewValue("");
                }
              }}
              placeholder="KEY_NAME"
              className="w-48 font-mono text-sm h-8"
              autoFocus
            />
            <span className="text-muted-foreground">=</span>
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewKey("");
                  setNewValue("");
                }
              }}
              placeholder="value"
              className="flex-1 font-mono text-sm h-8"
            />
            <Button size="sm" onClick={handleAdd} disabled={!newKey.trim()}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setNewKey("");
                setNewValue("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : canEdit ? (
          <div
            className="flex items-center gap-2 p-3 px-4 text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add variable</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
