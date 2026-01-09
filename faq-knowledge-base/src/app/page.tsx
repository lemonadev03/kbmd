"use client";

import { useState, useEffect, useCallback } from "react";
import { FAQSection } from "@/components/faq-section";
import { VariablesSection } from "@/components/variables-section";
import { ExportModal } from "@/components/export-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  getVariables,
  createVariable,
  updateVariable,
  deleteVariable,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
} from "@/db/actions";

interface Variable {
  id: string;
  key: string;
  value: string;
}

interface Section {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
}

interface FAQ {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  notes: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function Home() {
  const [sections, setSections] = useState<Section[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const loadData = useCallback(async () => {
    const [vars, sects, faqList] = await Promise.all([
      getVariables(),
      getSections(),
      getFaqs(),
    ]);
    setVariables(vars);
    setSections(sects);
    setFaqs(faqList);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredFaqs = searchQuery
    ? faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.notes.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  const getFaqsForSection = (sectionId: string) => {
    const inSection = filteredFaqs.filter((faq) => faq.sectionId === sectionId);
    return [...inSection].sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
  };

  // Variable handlers - optimistic
  const handleCreateVariable = async (key: string, value: string) => {
    const tempId = uuidv4();
    const newVar: Variable = { id: tempId, key, value };

    // Optimistic update
    setVariables((prev) => [...prev, newVar]);

    try {
      const created = await createVariable(key, value);
      // Replace temp with real
      setVariables((prev) =>
        prev.map((v) => (v.id === tempId ? created : v))
      );
    } catch {
      // Revert on error
      setVariables((prev) => prev.filter((v) => v.id !== tempId));
    }
  };

  const handleUpdateVariable = async (id: string, key: string, value: string) => {
    const prev = variables.find((v) => v.id === id);
    if (!prev) return;

    // Optimistic update
    setVariables((vars) =>
      vars.map((v) => (v.id === id ? { ...v, key, value } : v))
    );

    try {
      await updateVariable(id, key, value);
    } catch {
      // Revert on error
      setVariables((vars) =>
        vars.map((v) => (v.id === id ? prev : v))
      );
    }
  };

  const handleDeleteVariable = async (id: string) => {
    const prev = variables.find((v) => v.id === id);

    // Optimistic update
    setVariables((vars) => vars.filter((v) => v.id !== id));

    try {
      await deleteVariable(id);
    } catch {
      // Revert on error
      if (prev) {
        setVariables((vars) => [...vars, prev]);
      }
    }
  };

  // Section handlers - optimistic
  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;

    const tempId = uuidv4();
    const newSect: Section = {
      id: tempId,
      name: newSectionName.trim(),
      order: sections.length,
      createdAt: new Date(),
    };

    // Optimistic update
    setSections((prev) => [...prev, newSect]);
    setNewSectionName("");
    setShowNewSection(false);

    try {
      const created = await createSection(newSectionName.trim());
      // Replace temp with real
      setSections((prev) =>
        prev.map((s) => (s.id === tempId ? created : s))
      );
    } catch {
      // Revert on error
      setSections((prev) => prev.filter((s) => s.id !== tempId));
    }
  };

  const handleUpdateSection = async (id: string, name: string) => {
    const prev = sections.find((s) => s.id === id);
    if (!prev) return;

    // Optimistic update
    setSections((sects) =>
      sects.map((s) => (s.id === id ? { ...s, name } : s))
    );

    try {
      await updateSection(id, name);
    } catch {
      // Revert on error
      setSections((sects) =>
        sects.map((s) => (s.id === id ? prev : s))
      );
    }
  };

  const handleDeleteSection = async (id: string) => {
    const sectionFaqs = faqs.filter((f) => f.sectionId === id);
    const message =
      sectionFaqs.length > 0
        ? `Delete "${sections.find((s) => s.id === id)?.name}" and its ${sectionFaqs.length} FAQ(s)?`
        : `Delete "${sections.find((s) => s.id === id)?.name}"?`;

    if (!confirm(message)) return;

    const prevSection = sections.find((s) => s.id === id);
    const prevFaqs = faqs.filter((f) => f.sectionId === id);

    // Optimistic update
    setSections((sects) => sects.filter((s) => s.id !== id));
    setFaqs((f) => f.filter((faq) => faq.sectionId !== id));

    try {
      await deleteSection(id);
    } catch {
      // Revert on error
      if (prevSection) {
        setSections((sects) => [...sects, prevSection]);
        setFaqs((f) => [...f, ...prevFaqs]);
      }
    }
  };

  // FAQ handlers - optimistic
  const handleCreateFaq = async (
    sectionId: string,
    data: { question: string; answer: string; notes: string }
  ) => {
    const tempId = uuidv4();
    const now = new Date();
    const nextOrder =
      Math.max(
        -1,
        ...faqs.filter((f) => f.sectionId === sectionId).map((f) => f.order)
      ) + 1;
    const newFaq: FAQ = {
      id: tempId,
      sectionId,
      question: data.question,
      answer: data.answer,
      notes: data.notes,
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    setFaqs((prev) => [...prev, newFaq]);

    try {
      const created = await createFaq(sectionId, data.question, data.answer, data.notes);
      // Replace temp with real
      setFaqs((prev) =>
        prev.map((f) => (f.id === tempId ? created : f))
      );
    } catch {
      // Revert on error
      setFaqs((prev) => prev.filter((f) => f.id !== tempId));
    }
  };

  const handleUpdateFaq = async (
    id: string,
    data: { question: string; answer: string; notes: string }
  ) => {
    const prev = faqs.find((f) => f.id === id);
    if (!prev) return;

    // Optimistic update
    setFaqs((faqList) =>
      faqList.map((f) =>
        f.id === id ? { ...f, ...data, updatedAt: new Date() } : f
      )
    );

    try {
      await updateFaq(id, data.question, data.answer, data.notes);
    } catch {
      // Revert on error
      setFaqs((faqList) =>
        faqList.map((f) => (f.id === id ? prev : f))
      );
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;

    const prev = faqs.find((f) => f.id === id);

    // Optimistic update
    setFaqs((faqList) => faqList.filter((f) => f.id !== id));

    try {
      await deleteFaq(id);
    } catch {
      // Revert on error
      if (prev) {
        setFaqs((faqList) => [...faqList, prev]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Click any cell to edit · Markdown supported
          </p>
        </header>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export MD
          </Button>
        </div>

        {/* Variables */}
        <VariablesSection
          variables={variables}
          onCreate={handleCreateVariable}
          onUpdate={handleUpdateVariable}
          onDelete={handleDeleteVariable}
        />

        {/* Sections */}
        {sections.map((section) => (
          <FAQSection
            key={section.id}
            section={section}
            faqs={getFaqsForSection(section.id)}
            resetSignal={0}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onCreateFaq={handleCreateFaq}
            onUpdateFaq={handleUpdateFaq}
            onDeleteFaq={handleDeleteFaq}
          />
        ))}

        {/* Add Section */}
        {showNewSection ? (
          <div className="flex items-center gap-2 mb-8">
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSection();
                if (e.key === "Escape") {
                  setShowNewSection(false);
                  setNewSectionName("");
                }
              }}
              placeholder="Section name..."
              autoFocus
              className="w-64"
            />
            <Button onClick={handleCreateSection} disabled={!newSectionName.trim()}>
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewSection(false);
                setNewSectionName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowNewSection(true)}
            className="mb-8"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        )}

        {sections.length === 0 && !showNewSection && (
          <div className="text-center py-12 text-muted-foreground">
            No sections yet. Create your first section to get started!
          </div>
        )}

        {/* Export Modal */}
        <ExportModal
          open={showExportModal}
          onOpenChange={setShowExportModal}
          variables={variables}
          sections={sections}
          faqs={faqs}
        />
      </div>
    </div>
  );
}
