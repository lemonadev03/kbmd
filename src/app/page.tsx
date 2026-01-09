"use client";

import { useMemo, useState, useEffect } from "react";
import { FAQSection } from "@/components/faq-section";
import { VariablesSection } from "@/components/variables-section";
import { CustomRulesSection } from "@/components/custom-rules-section";
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
  applyFaqBatch,
  getCustomRules,
  saveCustomRules,
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
  createdAt?: Date;
  updatedAt?: Date;
}

export default function Home() {
  const [sections, setSections] = useState<Section[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqDraftById, setFaqDraftById] = useState<Record<string, FAQ>>({});
  const [deletedFaqIds, setDeletedFaqIds] = useState<Set<string>>(new Set());
  const [faqDraftResetSignal, setFaqDraftResetSignal] = useState(0);
  const [isSavingFaqBatch, setIsSavingFaqBatch] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [customRulesContent, setCustomRulesContent] = useState("");
  const [customRulesDraft, setCustomRulesDraft] = useState<string | null>(null);
  const [customRulesResetSignal, setCustomRulesResetSignal] = useState(0);
  const [isSavingCustomRules, setIsSavingCustomRules] = useState(false);

  const refreshData = async () => {
    const [vars, sects, faqList, rules] = await Promise.all([
      getVariables(),
      getSections(),
      getFaqs(),
      getCustomRules(),
    ]);
    setVariables(vars);
    setSections(sects);
    setFaqs(faqList);
    setCustomRulesContent(rules?.content ?? "");
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  const baseFaqById = useMemo(() => {
    return new Map(faqs.map((f) => [f.id, f]));
  }, [faqs]);

  const effectiveFaqs = useMemo(() => {
    const out: FAQ[] = [];
    const seen = new Set<string>();

    for (const f of faqs) {
      if (deletedFaqIds.has(f.id)) continue;
      out.push(faqDraftById[f.id] ?? f);
      seen.add(f.id);
    }

    for (const [id, draft] of Object.entries(faqDraftById)) {
      if (seen.has(id)) continue;
      if (deletedFaqIds.has(id)) continue;
      out.push(draft);
    }

    return out;
  }, [faqs, faqDraftById, deletedFaqIds]);

  const filteredFaqs = searchQuery
    ? effectiveFaqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.notes.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : effectiveFaqs;

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
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date();

    setFaqDraftById((prev) => ({
      ...prev,
      [id]: {
        id,
        sectionId,
        question: data.question,
        answer: data.answer,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      },
    }));
  };

  const handleUpdateFaq = async (
    id: string,
    data: { question: string; answer: string; notes: string }
  ) => {
    setFaqDraftById((prev) => {
      const base = baseFaqById.get(id);
      const current = prev[id] ?? base;
      if (!current) return prev;

      const nextFaq: FAQ = {
        ...current,
        question: data.question,
        answer: data.answer,
        notes: data.notes,
        updatedAt: new Date(),
      };

      if (base) {
        const matchesBase =
          nextFaq.sectionId === base.sectionId &&
          nextFaq.question === base.question &&
          nextFaq.answer === base.answer &&
          nextFaq.notes === base.notes;

        if (matchesBase) {
          const { [id]: _removed, ...rest } = prev;
          return rest;
        }
      }

      return { ...prev, [id]: nextFaq };
    });
  };

  const handleDeleteFaq = async (id: string) => {
    const isNew = !baseFaqById.has(id);
    const message = isNew
      ? "Remove this unsaved FAQ?"
      : "Delete this FAQ? (You’ll still need to click “Save changes” to apply.)";

    if (!confirm(message)) return;

    if (isNew) {
      setFaqDraftById((prev) => {
        if (!(id in prev)) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    setFaqDraftById((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setDeletedFaqIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const pendingFaqBatch = useMemo(() => {
    const upserts: Array<{
      id: string;
      sectionId: string;
      question: string;
      answer: string;
      notes: string;
    }> = [];

    let created = 0;
    let updated = 0;

    const incompleteUpserts: string[] = [];

    for (const draft of Object.values(faqDraftById)) {
      if (deletedFaqIds.has(draft.id)) continue;
      const base = baseFaqById.get(draft.id);

      if (base) {
        const matchesBase =
          draft.sectionId === base.sectionId &&
          draft.question === base.question &&
          draft.answer === base.answer &&
          draft.notes === base.notes;
        if (matchesBase) continue;
        updated += 1;
      } else {
        created += 1;
      }

      if (!draft.question.trim() || !draft.answer.trim()) {
        incompleteUpserts.push(draft.id);
      }

      upserts.push({
        id: draft.id,
        sectionId: draft.sectionId,
        question: draft.question,
        answer: draft.answer,
        notes: draft.notes,
      });
    }

    const deletes = Array.from(deletedFaqIds).filter((id) => baseFaqById.has(id));

    return {
      upserts,
      deletes,
      created,
      updated,
      deleted: deletes.length,
      incompleteUpserts,
    };
  }, [faqDraftById, deletedFaqIds, baseFaqById]);

  const hasPendingFaqChanges =
    pendingFaqBatch.upserts.length > 0 || pendingFaqBatch.deletes.length > 0;

  const canSaveFaqChanges =
    hasPendingFaqChanges && pendingFaqBatch.incompleteUpserts.length === 0;

  const handleSaveFaqChanges = async () => {
    if (isSavingFaqBatch || !canSaveFaqChanges) return;
    setIsSavingFaqBatch(true);
    try {
      await applyFaqBatch({
        upserts: pendingFaqBatch.upserts.map((f) => ({
          ...f,
          question: f.question.trim(),
          answer: f.answer.trim(),
          notes: f.notes.trim(),
        })),
        deletes: pendingFaqBatch.deletes,
      });
      setFaqDraftById({});
      setDeletedFaqIds(new Set());
      setFaqDraftResetSignal((n) => n + 1);
      await refreshData();
    } catch (err) {
      console.error(err);
      alert("Failed to save FAQ changes. Please try again.");
    } finally {
      setIsSavingFaqBatch(false);
    }
  };

  const handleDiscardFaqChanges = () => {
    if (!hasPendingFaqChanges) return;
    if (!confirm("Discard all unsaved FAQ changes?")) return;
    setFaqDraftById({});
    setDeletedFaqIds(new Set());
    setFaqDraftResetSignal((n) => n + 1);
  };

  // Custom rules handlers
  const handleUpdateCustomRules = (content: string) => {
    if (content === customRulesContent) {
      setCustomRulesDraft(null);
    } else {
      setCustomRulesDraft(content);
    }
  };

  const hasPendingCustomRulesChanges = customRulesDraft !== null;

  const handleSaveCustomRules = async () => {
    if (isSavingCustomRules || !hasPendingCustomRulesChanges) return;
    setIsSavingCustomRules(true);
    try {
      await saveCustomRules(customRulesDraft!);
      setCustomRulesDraft(null);
      setCustomRulesResetSignal((n) => n + 1);
      await refreshData();
    } catch (err) {
      console.error(err);
      alert("Failed to save custom rules. Please try again.");
    } finally {
      setIsSavingCustomRules(false);
    }
  };

  const handleDiscardCustomRules = () => {
    if (!hasPendingCustomRulesChanges) return;
    if (!confirm("Discard custom rules changes?")) return;
    setCustomRulesDraft(null);
    setCustomRulesResetSignal((n) => n + 1);
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
      <div className={`max-w-7xl mx-auto px-4 py-6 ${hasPendingFaqChanges || hasPendingCustomRulesChanges ? "pb-28" : ""}`}>
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Click any cell to edit · Markdown supported · Changes save when you click “Save changes”
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

        {/* Custom Rules */}
        <CustomRulesSection
          content={customRulesContent}
          onUpdate={handleUpdateCustomRules}
          resetSignal={customRulesResetSignal}
        />

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
            resetSignal={faqDraftResetSignal}
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
          faqs={effectiveFaqs}
          customRules={customRulesContent}
        />
      </div>

      {hasPendingFaqChanges && (
        <div className="fixed inset-x-0 z-50 px-4" style={{ bottom: hasPendingCustomRulesChanges ? '7rem' : '1rem' }}>
          <div className="mx-auto max-w-3xl">
            <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-sm">Unsaved changes</div>
                <div className="text-xs text-muted-foreground">
                  {pendingFaqBatch.created} new · {pendingFaqBatch.updated} edited ·{" "}
                  {pendingFaqBatch.deleted} deleted
                </div>
                {pendingFaqBatch.incompleteUpserts.length > 0 && (
                  <div className="text-xs text-destructive mt-1">
                    {pendingFaqBatch.incompleteUpserts.length} item
                    {pendingFaqBatch.incompleteUpserts.length !== 1 ? "s" : ""} missing
                    question/answer
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={handleDiscardFaqChanges}
                  disabled={isSavingFaqBatch}
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSaveFaqChanges}
                  disabled={isSavingFaqBatch || !canSaveFaqChanges}
                >
                  {isSavingFaqBatch ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasPendingCustomRulesChanges && (
        <div className="fixed inset-x-0 bottom-4 z-50 px-4">
          <div className="mx-auto max-w-3xl">
            <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-sm">Unsaved custom rules</div>
                <div className="text-xs text-muted-foreground">
                  Custom rules have been modified
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={handleDiscardCustomRules}
                  disabled={isSavingCustomRules}
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSaveCustomRules}
                  disabled={isSavingCustomRules}
                >
                  {isSavingCustomRules ? "Saving..." : "Save custom rules"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
