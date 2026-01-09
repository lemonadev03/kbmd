"use client";

import { useState } from "react";
import { FAQTable } from "./faq-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { HighlightText } from "./highlight-text";

interface Section {
  id: string;
  name: string;
}

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

interface FAQSectionProps {
  section: Section;
  faqs: FAQ[];
  resetSignal: number;
  onUpdateSection: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void;
  onCreateFaq: (sectionId: string, data: FAQFormData) => void;
  onUpdateFaq: (id: string, data: FAQFormData) => void;
  onDeleteFaq: (id: string) => void;
  onReorderFaqs?: (sectionId: string, orderedIds: string[]) => void;
  reorderDisabled?: boolean;
  searchQuery?: string;
  currentMatchId?: string | null;
}

export function FAQSection({
  section,
  faqs,
  resetSignal,
  onUpdateSection,
  onDeleteSection,
  onCreateFaq,
  onUpdateFaq,
  onDeleteFaq,
  onReorderFaqs,
  reorderDisabled,
  searchQuery,
  currentMatchId,
}: FAQSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdateSection(section.id, editName.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(section.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-3 group sticky top-24 z-10 bg-background/95 backdrop-blur-md py-2 border-b border-border/60">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-2xl font-semibold h-10 w-72 max-w-[70vw]"
            />
            <Button size="icon" variant="ghost" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">
              {searchQuery ? (
                <HighlightText
                  text={section.name}
                  query={searchQuery}
                  currentMatchId={currentMatchId ?? undefined}
                  matchIdPrefix={`match-section-name-${section.id}`}
                />
              ) : (
                section.name
              )}
            </h2>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onDeleteSection(section.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </>
        )}
      </div>

      <FAQTable
        sectionId={section.id}
        key={`${section.id}-${resetSignal}`}
        faqs={faqs}
        onCreate={(data) => onCreateFaq(section.id, data)}
        onUpdate={onUpdateFaq}
        onDelete={onDeleteFaq}
        onReorderFaqs={onReorderFaqs}
        reorderDisabled={reorderDisabled}
        searchQuery={searchQuery}
        currentMatchId={currentMatchId}
      />
    </div>
  );
}
