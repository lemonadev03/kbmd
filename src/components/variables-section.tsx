"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";

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
}

export function VariablesSection({
  variables,
  onCreate,
  onUpdate,
  onDelete,
}: VariablesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const startEdit = (variable: Variable) => {
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
    if (newKey.trim()) {
      onCreate(newKey.trim(), newValue.trim());
      setNewKey("");
      setNewValue("");
      setIsAdding(false);
    }
  };

  return (
    <div className="mb-6 border rounded-lg">
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="font-medium">Variables</span>
        <span className="text-muted-foreground text-sm">({variables.length})</span>
      </div>

      {isExpanded && (
        <div className="border-t">
          {/* Variable rows */}
          {variables.map((variable) => (
            <div
              key={variable.id}
              className="flex items-center gap-2 p-2 px-3 border-b last:border-b-0 group hover:bg-muted/30"
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
                    className="bg-muted px-2 py-1 rounded text-sm font-mono cursor-pointer hover:bg-muted/80"
                    onClick={() => startEdit(variable)}
                  >
                    {variable.key}
                  </code>
                  <span className="text-muted-foreground">=</span>
                  <span
                    className="flex-1 font-mono text-sm cursor-pointer hover:text-foreground/80"
                    onClick={() => startEdit(variable)}
                  >
                    {variable.value || <span className="text-muted-foreground italic">empty</span>}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(variable.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* Add new variable */}
          {isAdding ? (
            <div className="flex items-center gap-2 p-2 px-3 bg-muted/20">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
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
          ) : (
            <div
              className="flex items-center gap-2 p-2 px-3 text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add variable</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
