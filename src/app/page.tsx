"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FAQSection } from "@/components/faq-section";
import { VariablesSection } from "@/components/variables-section";
import { CustomRulesSection } from "@/components/custom-rules-section";
import { ExportModal } from "@/components/export-modal";
import { Sidebar, SidebarToggle } from "@/components/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useActiveSection } from "@/hooks/use-active-section";
import { useSearchNavigation } from "@/hooks/use-search-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  Search,
  Download,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ContentSkeleton } from "@/components/content-skeleton";
import {
  getVariables,
  createVariable,
  updateVariable,
  deleteVariable,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
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
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

function toMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

export default function Home() {
  const router = useRouter();
  const session = authClient.useSession();

  const [sections, setSections] = useState<Section[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqDraftById, setFaqDraftById] = useState<Record<string, FAQ>>({});
  const [deletedFaqIds, setDeletedFaqIds] = useState<Set<string>>(new Set());
  const [faqDraftResetSignal, setFaqDraftResetSignal] = useState(0);
  const [isSavingFaqBatch, setIsSavingFaqBatch] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newSectionName, setNewSectionName] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [customRulesContent, setCustomRulesContent] = useState("");
  const [customRulesDraft, setCustomRulesDraft] = useState<string | null>(null);
  const [customRulesResetSignal, setCustomRulesResetSignal] = useState(0);
  const [isSavingCustomRules, setIsSavingCustomRules] = useState(false);

  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar();
  const { activeSection, scrollToSection } = useActiveSection(sections);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  };

  const refreshData = async (initialLoad = false) => {
    if (initialLoad) setIsLoading(true);
    try {
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
    } finally {
      if (initialLoad) setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    refreshData(true);
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

  const sectionOrderById = useMemo(() => {
    const out = new Map<string, number>();
    for (const s of sections) out.set(s.id, s.order);
    return out;
  }, [sections]);

  const orderedEffectiveFaqs = useMemo(() => {
    const sorted = [...effectiveFaqs];
    sorted.sort((a, b) => {
      const aSection = sectionOrderById.get(a.sectionId) ?? 0;
      const bSection = sectionOrderById.get(b.sectionId) ?? 0;
      if (aSection !== bSection) return aSection - bSection;
      if (a.order !== b.order) return a.order - b.order;
      const aCreated = toMs(a.createdAt);
      const bCreated = toMs(b.createdAt);
      if (aCreated !== bCreated) return aCreated - bCreated;
      return a.id.localeCompare(b.id);
    });
    return sorted;
  }, [effectiveFaqs, sectionOrderById]);

  const filteredFaqs = searchQuery
    ? orderedEffectiveFaqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.notes.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orderedEffectiveFaqs;

  const {
    totalMatches,
    currentIndex: currentMatchIndex,
    currentMatchId,
    goToNext,
    goToPrev,
  } = useSearchNavigation(filteredFaqs, sections, searchQuery);

  const faqCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const section of sections) {
      counts[section.id] = effectiveFaqs.filter(
        (f) => f.sectionId === section.id
      ).length;
    }
    return counts;
  }, [sections, effectiveFaqs]);

  const getFaqsForSection = (sectionId: string) => {
    const inSection = filteredFaqs.filter((faq) => faq.sectionId === sectionId);
    return [...inSection].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      const aCreated = toMs(a.createdAt);
      const bCreated = toMs(b.createdAt);
      if (aCreated !== bCreated) return aCreated - bCreated;
      return a.id.localeCompare(b.id);
    });
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
    try {
      await updateSection(id, name);
      refreshData();
    } catch (err) {
      console.error(err);
      alert("Failed to rename section. Please try again.");
      refreshData();
    }
  };

  const handleReorderSections = async (orderedIds: string[]) => {
    setSections((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      const filteredOrdered = orderedIds.filter((id) => byId.has(id));
      const missing = prev.map((s) => s.id).filter((id) => !filteredOrdered.includes(id));
      const finalIds = [...filteredOrdered, ...missing];
      return finalIds.map((id, index) => ({ ...byId.get(id)!, order: index }));
    });

    try {
      await reorderSections({ orderedIds });
    } catch (err) {
      console.error(err);
      alert("Failed to reorder sections. Please try again.");
      refreshData();
    }
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
    const nextOrder =
      Math.max(
        -1,
        ...orderedEffectiveFaqs
          .filter((f) => f.sectionId === sectionId)
          .map((f) => f.order)
      ) + 1;

    setFaqDraftById((prev) => ({
      ...prev,
      [id]: {
        id,
        sectionId,
        question: data.question,
        answer: data.answer,
        notes: data.notes,
        order: nextOrder,
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
          nextFaq.notes === base.notes &&
          nextFaq.order === base.order;

        if (matchesBase) {
          const next = { ...prev };
          delete next[id];
          return next;
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
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    setFaqDraftById((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDeletedFaqIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleReorderFaqs = (sectionId: string, orderedIds: string[]) => {
    const currentSectionFaqs = orderedEffectiveFaqs.filter((f) => f.sectionId === sectionId);
    const existingIds = new Set(currentSectionFaqs.map((f) => f.id));
    const filteredOrdered = orderedIds.filter((id) => existingIds.has(id));
    const missing = currentSectionFaqs
      .map((f) => f.id)
      .filter((id) => !filteredOrdered.includes(id));
    const finalIds = [...filteredOrdered, ...missing];

    setFaqDraftById((prev) => {
      let next = prev;

      for (let index = 0; index < finalIds.length; index++) {
        const id = finalIds[index];
        const base = baseFaqById.get(id);
        const current = prev[id] ?? base;
        if (!current) continue;

        const nextFaq: FAQ = {
          ...current,
          order: index,
          updatedAt: new Date(),
        };

        if (base) {
          const matchesBase =
            nextFaq.sectionId === base.sectionId &&
            nextFaq.question === base.question &&
            nextFaq.answer === base.answer &&
            nextFaq.notes === base.notes &&
            nextFaq.order === base.order;

          if (matchesBase) {
            if (id in next) {
              const cloned = { ...next };
              delete cloned[id];
              next = cloned;
            }
            continue;
          }
        }

        if (next === prev) next = { ...prev };
        next[id] = nextFaq;
      }

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
      order: number;
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
          draft.notes === base.notes &&
          draft.order === base.order;
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
        order: draft.order,
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
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen app-shell">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        sections={sections}
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onReorderSections={handleReorderSections}
        onRenameSection={handleUpdateSection}
        faqCounts={faqCounts}
        loading={isLoading}
        userEmail={session.data?.user?.email}
        onSignOut={handleSignOut}
        signOutDisabled={session.isPending}
      />

      {/* Toggle Button */}
      <SidebarToggle isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <main
        className={cn(
          "transition-[margin] duration-300 ease-out",
          sidebarOpen ? "lg:ml-64" : "ml-0"
        )}
      >
        <div
          className={cn(
            "max-w-6xl mx-auto px-4 pb-12 pt-8",
            hasPendingFaqChanges || hasPendingCustomRulesChanges ? "pb-28" : ""
          )}
        >
          <div className="mb-6 animate-fade-up" />

          <div
            className="sticky top-3 z-20 mb-8 animate-fade-up"
            style={{ animationDelay: "40ms" }}
          >
            <div className="rounded-2xl border bg-background/80 backdrop-blur-md shadow-sm px-3 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (e.shiftKey) {
                          goToPrev();
                        } else {
                          goToNext();
                        }
                      }
                      if (e.key === "Escape") {
                        setSearchQuery("");
                      }
                    }}
                    className={cn(
                      "pl-10 bg-background/70",
                      searchQuery && "pr-36"
                    )}
                  />
                  {searchQuery && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <span className="text-xs text-muted-foreground tabular-nums min-w-[4rem] text-right">
                        {totalMatches > 0
                          ? `${currentMatchIndex} of ${totalMatches}`
                          : "No matches"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={goToPrev}
                        disabled={totalMatches === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={goToNext}
                        disabled={totalMatches === 0}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowExportModal(true)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export MD
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <ContentSkeleton />
          ) : (
            <>
              {/* Custom Rules */}
              <div
                id="section-custom-rules"
                className="scroll-mt-24 animate-fade-up"
                style={{ animationDelay: "80ms" }}
              >
                <CustomRulesSection
                  content={customRulesContent}
                  onUpdate={handleUpdateCustomRules}
                  resetSignal={customRulesResetSignal}
                  searchQuery={searchQuery}
                  currentMatchId={currentMatchId}
                />
              </div>

              {/* Variables */}
              <div
                id="section-variables"
                className="scroll-mt-24 animate-fade-up"
                style={{ animationDelay: "140ms" }}
              >
                <VariablesSection
                  variables={variables}
                  onCreate={handleCreateVariable}
                  onUpdate={handleUpdateVariable}
                  onDelete={handleDeleteVariable}
                  searchQuery={searchQuery}
                  currentMatchId={currentMatchId}
                />
              </div>

              {/* Sections */}
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className="animate-fade-up"
                  style={{
                    animationDelay: `${Math.min(index, 6) * 60 + 200}ms`,
                  }}
                >
                  {index > 0 && (
                    <div
                      className="group flex items-center gap-2 py-1 my-6 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => setShowNewSection(true)}
                    >
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        Add section
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <div
                    id={`section-faq-${section.id}`}
                    className="scroll-mt-24"
                  >
                    <FAQSection
                      section={section}
                      faqs={getFaqsForSection(section.id)}
                      resetSignal={faqDraftResetSignal}
                      onUpdateSection={handleUpdateSection}
                      onDeleteSection={handleDeleteSection}
                      onCreateFaq={handleCreateFaq}
                      onUpdateFaq={handleUpdateFaq}
                      onDeleteFaq={handleDeleteFaq}
                      onReorderFaqs={handleReorderFaqs}
                      reorderDisabled={searchQuery.trim().length > 0}
                      searchQuery={searchQuery}
                      currentMatchId={currentMatchId}
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Add Section */}
          {!isLoading && (
            <div
              className="mb-10 animate-fade-up"
              style={{ animationDelay: "320ms" }}
            >
              {showNewSection ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border bg-card/70 p-4 shadow-sm">
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
                    className="w-full sm:w-64"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCreateSection}
                      disabled={!newSectionName.trim()}
                    >
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
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowNewSection(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              )}

              {sections.length === 0 && !showNewSection && (
                <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                  No sections yet. Create your first section to get started!
                </div>
              )}
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
      </main>

      {hasPendingFaqChanges && (
        <div
          className={cn(
            "fixed z-50 px-4 right-0",
            sidebarOpen ? "lg:left-64" : "left-0"
          )}
          style={{ bottom: hasPendingCustomRulesChanges ? "7rem" : "1rem" }}
        >
          <div className="mx-auto max-w-3xl">
            <div className="bg-card/90 backdrop-blur-md border border-border/60 rounded-2xl shadow-xl p-4 flex items-center justify-between gap-4 animate-fade-in">
              <div className="min-w-0">
                <div className="font-medium text-sm">Unsaved changes</div>
                <div className="text-xs text-muted-foreground">
                  {pendingFaqBatch.created} new · {pendingFaqBatch.updated}{" "}
                  edited · {pendingFaqBatch.deleted} deleted
                </div>
                {pendingFaqBatch.incompleteUpserts.length > 0 && (
                  <div className="text-xs text-destructive mt-1">
                    {pendingFaqBatch.incompleteUpserts.length} item
                    {pendingFaqBatch.incompleteUpserts.length !== 1
                      ? "s"
                      : ""}{" "}
                    missing question/answer
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
        <div
          className={cn(
            "fixed bottom-4 z-50 px-4 right-0",
            sidebarOpen ? "lg:left-64" : "left-0"
          )}
        >
          <div className="mx-auto max-w-3xl">
            <div className="bg-card/90 backdrop-blur-md border border-border/60 rounded-2xl shadow-xl p-4 flex items-center justify-between gap-4 animate-fade-in">
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
