"use client";

import { useState, useEffect } from "react";
import { FAQSection } from "@/components/faq-section";
import { VariablesSection } from "@/components/variables-section";
import { ExportModal } from "@/components/export-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Plus } from "lucide-react";
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
  createdAt: Date;
  updatedAt: Date;
}

export default function Home() {
  const [sections, setSections] = useState<Section[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const refreshData = async () => {
    const [vars, sects, faqList] = await Promise.all([
      getVariables(),
      getSections(),
      getFaqs(),
    ]);
    setVariables(vars);
    setSections(sects);
    setFaqs(faqList);
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  const filteredFaqs = searchQuery
    ? faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.notes.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  const getFaqsForSection = (sectionId: string) => {
    return filteredFaqs.filter((faq) => faq.sectionId === sectionId);
  };

  // Variable handlers
  const handleCreateVariable = async (key: string, value: string) => {
    await createVariable(key, value);
    refreshData();
  };

  const handleUpdateVariable = async (id: string, key: string, value: string) => {
    await updateVariable(id, key, value);
    refreshData();
  };

  const handleDeleteVariable = async (id: string) => {
    await deleteVariable(id);
    refreshData();
  };

  // Section handlers
  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;
    await createSection(newSectionName.trim());
    setNewSectionName("");
    setShowNewSection(false);
    refreshData();
  };

  const handleUpdateSection = async (id: string, name: string) => {
    await updateSection(id, name);
    refreshData();
  };

  const handleDeleteSection = async (id: string) => {
    const sectionFaqs = faqs.filter((f) => f.sectionId === id);
    const message =
      sectionFaqs.length > 0
        ? `Delete "${sections.find((s) => s.id === id)?.name}" and its ${sectionFaqs.length} FAQ(s)?`
        : `Delete "${sections.find((s) => s.id === id)?.name}"?`;

    if (confirm(message)) {
      await deleteSection(id);
      refreshData();
    }
  };

  // FAQ handlers
  const handleCreateFaq = async (
    sectionId: string,
    data: { question: string; answer: string; notes: string }
  ) => {
    await createFaq(sectionId, data.question, data.answer, data.notes);
    refreshData();
  };

  const handleUpdateFaq = async (
    id: string,
    data: { question: string; answer: string; notes: string }
  ) => {
    await updateFaq(id, data.question, data.answer, data.notes);
    refreshData();
  };

  const handleDeleteFaq = async (id: string) => {
    if (confirm("Delete this FAQ?")) {
      await deleteFaq(id);
      refreshData();
    }
  };

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

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
