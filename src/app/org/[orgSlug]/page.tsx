"use client";

import { useMemo, useState, useEffect, use } from "react";
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
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ContentSkeleton } from "@/components/content-skeleton";
import {
  getVariables,
  createVariable,
  updateVariable,
  deleteVariable,
  getOrganizationBySlug,
  getExportConfigs,
  createExportConfig,
  updateExportConfig,
  deleteExportConfig,
  getSections,
  createSection,
  createSectionInGroup,
  updateSection,
  deleteSection,
  reorderSections,
  getFaqs,
  applyFaqBatch,
  getCustomRules,
  saveCustomRules,
  getPhaseGroups,
  createPhaseGroup,
  updatePhaseGroup,
  deletePhaseGroup,
  reorderPhaseGroups,
  addSectionToGroup,
  removeSectionFromGroup,
  reorderSectionsInGroup,
} from "@/db/actions";
import { PhaseTabs } from "@/components/phase-tabs";
import type { ExportConfigPayload } from "@/types/export-config";

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
  phaseGroupId?: string | null;
  phaseOrder?: number | null;
}

interface PhaseGroup {
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

interface ExportConfig {
  id: string;
  name: string;
  config: ExportConfigPayload;
  createdAt?: Date;
  updatedAt?: Date;
}

function toMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

interface OrgPageProps {
  params: { orgSlug: string };
}

export default function OrgPage({ params }: OrgPageProps) {
  const router = useRouter();
  const session = authClient.useSession();
  const { orgSlug } = use(params);

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
  const [exportConfigs, setExportConfigs] = useState<ExportConfig[]>([]);
  const [customRulesContent, setCustomRulesContent] = useState("");
  const [customRulesDraft, setCustomRulesDraft] = useState<string | null>(null);
  const [customRulesResetSignal, setCustomRulesResetSignal] = useState(0);
  const [isSavingCustomRules, setIsSavingCustomRules] = useState(false);
  const [phaseGroups, setPhaseGroups] = useState<PhaseGroup[]>([]);
  const [activePhaseTab, setActivePhaseTab] = useState<Record<string, string>>({});
  const [showNewPhaseGroup, setShowNewPhaseGroup] = useState(false);
  const [newPhaseGroupName, setNewPhaseGroupName] = useState("");
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<"admin" | "user" | null>(null);

  const orgDisplayName = useMemo(() => {
    if (orgName) return orgName;
    if (orgSlug && orgSlug !== "default") {
      return orgSlug
        .split("-")
        .map((part) =>
          part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part
        )
        .join(" ");
    }
    const baseName = session.data?.user?.name ?? "Default";
    return `${baseName} Org`;
  }, [orgName, orgSlug, session.data?.user?.name]);
  const canEdit = orgRole === "admin";

  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar();
  const { activeSection, scrollToSection } = useActiveSection(sections);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } finally {
      router.replace("/sign-in");
    }
  };

  const refreshData = async (initialLoad = false) => {
    if (session.isPending || !session.data?.user?.id) {
      if (!session.isPending) {
        router.replace("/sign-in");
      }
      if (initialLoad) setIsLoading(false);
      return;
    }
    if (initialLoad) setIsLoading(true);
    try {
      const [vars, sects, faqList, rules, groups, org, configs] =
        await Promise.all([
          getVariables(orgSlug),
          getSections(orgSlug),
          getFaqs(orgSlug),
          getCustomRules(orgSlug),
          getPhaseGroups(orgSlug),
          getOrganizationBySlug(orgSlug),
          getExportConfigs(orgSlug),
        ]);
      setVariables(vars);
      setSections(sects);
      setFaqs(faqList);
      setCustomRulesContent(rules?.content ?? "");
      setPhaseGroups(groups);
      setOrgName(org.name);
      setOrgRole(org.role);
      setExportConfigs(configs);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      if (message === "Unauthorized") {
        router.replace("/sign-in");
        return;
      }
      router.replace("/orgs");
    } finally {
      if (initialLoad) setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session.isPending) return;
    if (!session.data?.user?.id) {
      router.replace("/sign-in");
      return;
    }
    refreshData(true);
  }, [orgSlug, session.isPending, session.data?.user?.id]);

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
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    try {
      const created = await createVariable(orgSlug, trimmedKey, value.trim());
      setVariables((prev) => [...prev, created]);
    } catch (err) {
      console.error(err);
      alert("Failed to create variable. Please try again.");
      refreshData();
    }
  };

  const handleUpdateVariable = async (id: string, key: string, value: string) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    const prevVariables = variables;
    setVariables((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, key: trimmedKey, value: value.trim() } : v
      )
    );
    try {
      await updateVariable(orgSlug, id, trimmedKey, value.trim());
    } catch (err) {
      console.error(err);
      setVariables(prevVariables);
      alert("Failed to update variable. Please try again.");
      refreshData();
    }
  };

  const handleDeleteVariable = async (id: string) => {
    const prevVariables = variables;
    setVariables((prev) => prev.filter((v) => v.id !== id));
    try {
      await deleteVariable(orgSlug, id);
    } catch (err) {
      console.error(err);
      setVariables(prevVariables);
      alert("Failed to delete variable. Please try again.");
      refreshData();
    }
  };

  // Section handlers
  const createSectionByName = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return false;
    try {
      const created = await createSection(orgSlug, trimmedName);
      setSections((prev) =>
        [...prev, created].sort((a, b) => a.order - b.order)
      );
      return true;
    } catch (err) {
      console.error(err);
      alert("Failed to create section. Please try again.");
      refreshData();
      return false;
    }
  };

  const handleCreateSection = async () => {
    const ok = await createSectionByName(newSectionName);
    if (!ok) return;
    setNewSectionName("");
    setShowNewSection(false);
  };

  const handleUpdateSection = async (id: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const prevSections = sections;
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: trimmedName } : s))
    );
    try {
      await updateSection(orgSlug, id, trimmedName);
    } catch (err) {
      console.error(err);
      setSections(prevSections);
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
      await reorderSections(orgSlug, { orderedIds });
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

    if (!confirm(message)) return;

    const prevSections = sections;
    const prevFaqs = faqs;
    const prevDrafts = faqDraftById;
    const prevDeleted = deletedFaqIds;
    const prevActiveTabs = activePhaseTab;
    const removedSection = sections.find((s) => s.id === id);
    const removedGroupId = removedSection?.phaseGroupId ?? null;

    const nextSections = sections.filter((s) => s.id !== id);
    setSections(nextSections);

    const nextFaqs = faqs.filter((f) => f.sectionId !== id);
    setFaqs(nextFaqs);

    const nextDrafts = Object.fromEntries(
      Object.entries(faqDraftById).filter(([, draft]) => draft.sectionId !== id)
    );
    setFaqDraftById(nextDrafts);

    const nextDeleted = new Set(deletedFaqIds);
    for (const faq of faqs) {
      if (faq.sectionId === id) nextDeleted.delete(faq.id);
    }
    for (const draft of Object.values(faqDraftById)) {
      if (draft.sectionId === id) nextDeleted.delete(draft.id);
    }
    setDeletedFaqIds(nextDeleted);

    if (removedGroupId) {
      const remainingGroupSections = nextSections
        .filter((s) => s.phaseGroupId === removedGroupId)
        .sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));
      setActivePhaseTab((prev) => {
        const next = { ...prev };
        const current = next[removedGroupId];
        if (current && remainingGroupSections.some((s) => s.id === current)) {
          return next;
        }
        if (remainingGroupSections.length === 0) {
          delete next[removedGroupId];
        } else {
          next[removedGroupId] = remainingGroupSections[0].id;
        }
        return next;
      });
    }

    try {
      await deleteSection(orgSlug, id);
    } catch (err) {
      console.error(err);
      setSections(prevSections);
      setFaqs(prevFaqs);
      setFaqDraftById(prevDrafts);
      setDeletedFaqIds(prevDeleted);
      setActivePhaseTab(prevActiveTabs);
      alert("Failed to delete section. Please try again.");
      refreshData();
    }
  };

  // Phase group handlers
  const handleReorderPhaseGroups = async (orderedIds: string[]) => {
    setPhaseGroups((prev) => {
      const byId = new Map(prev.map((g) => [g.id, g]));
      const filteredOrdered = orderedIds.filter((id) => byId.has(id));
      const missing = prev.map((g) => g.id).filter((id) => !filteredOrdered.includes(id));
      const finalIds = [...filteredOrdered, ...missing];
      return finalIds.map((id, index) => ({ ...byId.get(id)!, order: index }));
    });

    try {
      await reorderPhaseGroups(orgSlug, { orderedIds });
    } catch (err) {
      console.error(err);
      alert("Failed to reorder phase groups. Please try again.");
      refreshData();
    }
  };

  const handleRenamePhaseGroup = async (groupId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const prevGroups = phaseGroups;
    setPhaseGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: trimmedName } : g))
    );
    try {
      await updatePhaseGroup(orgSlug, groupId, trimmedName);
    } catch (err) {
      console.error(err);
      setPhaseGroups(prevGroups);
      alert("Failed to rename group. Please try again.");
      refreshData();
    }
  };

  const handleDeletePhaseGroup = async (groupId: string) => {
    const groupSections = sections.filter((s) => s.phaseGroupId === groupId);
    const message =
      groupSections.length > 0
        ? `Delete this phase group? The ${groupSections.length} section(s) inside will become standalone.`
        : `Delete this empty phase group?`;

    if (!confirm(message)) return;

    const prevGroups = phaseGroups;
    const prevSections = sections;
    const prevActiveTabs = activePhaseTab;

    setPhaseGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSections((prev) =>
      prev.map((s) =>
        s.phaseGroupId === groupId ? { ...s, phaseGroupId: null, phaseOrder: 0 } : s
      )
    );
    setActivePhaseTab((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });

    try {
      await deletePhaseGroup(orgSlug, groupId);
    } catch (err) {
      console.error(err);
      setPhaseGroups(prevGroups);
      setSections(prevSections);
      setActivePhaseTab(prevActiveTabs);
      alert("Failed to delete group. Please try again.");
      refreshData();
    }
  };

  const handleReorderSectionsInGroup = async (
    groupId: string,
    orderedIds: string[]
  ) => {
    // Optimistic update
    setSections((prev) =>
      prev.map((s) => {
        if (s.phaseGroupId !== groupId) return s;
        const idx = orderedIds.indexOf(s.id);
        return idx !== -1 ? { ...s, phaseOrder: idx } : s;
      })
    );

    try {
      await reorderSectionsInGroup(orgSlug, {
        groupId,
        orderedSectionIds: orderedIds,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to reorder phases. Please try again.");
      refreshData();
    }
  };

  const createPhaseGroupByName = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return false;
    try {
      const created = await createPhaseGroup(orgSlug, trimmedName);
      setPhaseGroups((prev) =>
        [...prev, created].sort((a, b) => a.order - b.order)
      );
      return true;
    } catch (err) {
      console.error(err);
      alert("Failed to create phase group. Please try again.");
      refreshData();
      return false;
    }
  };

  const handleCreatePhaseGroup = async () => {
    const ok = await createPhaseGroupByName(newPhaseGroupName);
    if (!ok) return;
    setNewPhaseGroupName("");
    setShowNewPhaseGroup(false);
  };

  const handleCreatePhasedSection = async (groupName: string, phaseName: string) => {
    const trimmedGroup = groupName.trim();
    const trimmedPhase = phaseName.trim();
    if (!trimmedGroup || !trimmedPhase) return false;
    try {
      const group = await createPhaseGroup(orgSlug, trimmedGroup);
      try {
        const section = await createSectionInGroup(
          orgSlug,
          group.id,
          trimmedPhase
        );
        setPhaseGroups((prev) =>
          [...prev, group].sort((a, b) => a.order - b.order)
        );
        setSections((prev) =>
          [...prev, section].sort((a, b) => a.order - b.order)
        );
        setActivePhaseTab((prev) => ({ ...prev, [group.id]: section.id }));
        return true;
      } catch (err) {
        await deletePhaseGroup(orgSlug, group.id).catch(() => undefined);
        throw err;
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add phased section. Please try again.");
      refreshData();
      return false;
    }
  };

  const handleCreatePhaseInGroup = async (groupId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await createSectionInGroup(orgSlug, groupId, trimmed);
      setSections((prev) =>
        [...prev, created].sort((a, b) => a.order - b.order)
      );
      setActivePhaseTab((prev) => ({ ...prev, [groupId]: created.id }));
    } catch (err) {
      console.error(err);
      alert("Failed to add phase. Please try again.");
      refreshData();
    }
  };

  const handleAddSectionToGroup = async (sectionId: string, groupId: string) => {
    const prevSections = sections;
    const prevActiveTabs = activePhaseTab;
    const groupOrders = sections
      .filter((s) => s.phaseGroupId === groupId)
      .map((s) => s.phaseOrder ?? 0);
    const nextPhaseOrder = Math.max(-1, ...groupOrders) + 1;

    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, phaseGroupId: groupId, phaseOrder: nextPhaseOrder }
          : s
      )
    );
    setActivePhaseTab((prev) => ({ ...prev, [groupId]: sectionId }));

    try {
      const updated = await addSectionToGroup(orgSlug, sectionId, groupId);
      setSections((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
      );
    } catch (err) {
      console.error(err);
      setSections(prevSections);
      setActivePhaseTab(prevActiveTabs);
      alert("Failed to add section to group. Please try again.");
      refreshData();
    }
  };

  const handleRemoveSectionFromGroup = async (sectionId: string) => {
    const prevSections = sections;
    const prevActiveTabs = activePhaseTab;
    const currentSection = sections.find((s) => s.id === sectionId);
    const groupId = currentSection?.phaseGroupId ?? null;

    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, phaseGroupId: null, phaseOrder: 0 } : s
      )
    );

    if (groupId) {
      const remainingGroupSections = sections
        .filter((s) => s.phaseGroupId === groupId && s.id !== sectionId)
        .sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));
      setActivePhaseTab((prev) => {
        const next = { ...prev };
        const current = next[groupId];
        if (current && remainingGroupSections.some((s) => s.id === current)) {
          return next;
        }
        if (remainingGroupSections.length === 0) {
          delete next[groupId];
        } else {
          next[groupId] = remainingGroupSections[0].id;
        }
        return next;
      });
    }

    try {
      const updated = await removeSectionFromGroup(orgSlug, sectionId);
      setSections((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
      );
    } catch (err) {
      console.error(err);
      setSections(prevSections);
      setActivePhaseTab(prevActiveTabs);
      alert("Failed to remove section from group. Please try again.");
      refreshData();
    }
  };

  // Compute grouped and standalone sections for rendering
  const { groupedSections, standaloneSections } = useMemo(() => {
    const grouped = new Map<string, Section[]>();
    const standalone: Section[] = [];

    for (const section of sections) {
      if (section.phaseGroupId) {
        const existing = grouped.get(section.phaseGroupId) || [];
        existing.push(section);
        grouped.set(section.phaseGroupId, existing);
      } else {
        standalone.push(section);
      }
    }

    // Sort sections within each group by phaseOrder
    for (const [, groupSections] of grouped) {
      groupSections.sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));
    }

    return { groupedSections: grouped, standaloneSections: standalone };
  }, [sections]);

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
    const prevFaqs = faqs;
    const prevDrafts = faqDraftById;
    const prevDeleted = deletedFaqIds;
    const prevResetSignal = faqDraftResetSignal;
    const now = new Date();
    const deletedSet = new Set(pendingFaqBatch.deletes);
    const upsertMap = new Map<string, FAQ>();
    const trimmedUpserts = pendingFaqBatch.upserts.map((f) => ({
      ...f,
      question: f.question.trim(),
      answer: f.answer.trim(),
      notes: f.notes.trim(),
    }));

    for (const upsert of trimmedUpserts) {
      const base = baseFaqById.get(upsert.id) ?? faqDraftById[upsert.id];
      upsertMap.set(upsert.id, {
        ...(base ?? {}),
        ...upsert,
        createdAt: base?.createdAt ?? now,
        updatedAt: now,
      });
    }

    const optimisticFaqs = prevFaqs
      .filter((f) => !deletedSet.has(f.id) && !upsertMap.has(f.id))
      .concat(Array.from(upsertMap.values()));

    setFaqs(optimisticFaqs);
    setFaqDraftById({});
    setDeletedFaqIds(new Set());
    setFaqDraftResetSignal(prevResetSignal + 1);
    try {
      await applyFaqBatch(orgSlug, {
        upserts: trimmedUpserts,
        deletes: pendingFaqBatch.deletes,
      });
    } catch (err) {
      console.error(err);
      setFaqs(prevFaqs);
      setFaqDraftById(prevDrafts);
      setDeletedFaqIds(prevDeleted);
      setFaqDraftResetSignal(prevResetSignal);
      alert("Failed to save FAQ changes. Please try again.");
      refreshData();
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
    const prevContent = customRulesContent;
    const prevDraft = customRulesDraft;
    const prevResetSignal = customRulesResetSignal;
    const nextContent = customRulesDraft ?? "";

    setCustomRulesContent(nextContent);
    setCustomRulesDraft(null);
    setCustomRulesResetSignal(prevResetSignal + 1);
    try {
      await saveCustomRules(orgSlug, nextContent);
    } catch (err) {
      console.error(err);
      setCustomRulesContent(prevContent);
      setCustomRulesDraft(prevDraft);
      setCustomRulesResetSignal(prevResetSignal);
      alert("Failed to save custom rules. Please try again.");
      refreshData();
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

  const sortExportConfigs = (configs: ExportConfig[]) =>
    [...configs].sort((a, b) => a.name.localeCompare(b.name));

  const handleCreateExportConfig = async (
    name: string,
    config: ExportConfigPayload
  ) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;
    try {
      const created = await createExportConfig(orgSlug, trimmedName, config);
      setExportConfigs((prev) => sortExportConfigs([...prev, created]));
      return created;
    } catch (error) {
      console.error(error);
      alert("Failed to save export preset. Please try again.");
      return null;
    }
  };

  const handleUpdateExportConfig = async (
    id: string,
    name: string,
    config: ExportConfigPayload
  ) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;
    try {
      const updated = await updateExportConfig(orgSlug, id, trimmedName, config);
      setExportConfigs((prev) =>
        sortExportConfigs(
          prev.map((item) => (item.id === id ? updated : item))
        )
      );
      return updated;
    } catch (error) {
      console.error(error);
      alert("Failed to update export preset. Please try again.");
      return null;
    }
  };

  const handleDeleteExportConfig = async (id: string) => {
    try {
      await deleteExportConfig(orgSlug, id);
      setExportConfigs((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      alert("Failed to delete export preset. Please try again.");
    }
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
        onReorderSections={canEdit ? handleReorderSections : undefined}
        onRenameSection={canEdit ? handleUpdateSection : undefined}
        reorderEnabled={canEdit}
        faqCounts={faqCounts}
        loading={isLoading}
        userEmail={session.data?.user?.email}
        userName={session.data?.user?.name}
        orgName={orgDisplayName}
        orgSettingsHref={`/org/${orgSlug}/settings`}
        onSignOut={handleSignOut}
        signOutDisabled={session.isPending}
        phaseGroups={phaseGroups}
        onReorderPhaseGroups={canEdit ? handleReorderPhaseGroups : undefined}
        onRenamePhaseGroup={canEdit ? handleRenamePhaseGroup : undefined}
        onDeletePhaseGroup={canEdit ? handleDeletePhaseGroup : undefined}
        onReorderSectionsInGroup={canEdit ? handleReorderSectionsInGroup : undefined}
        onCreatePhaseInGroup={canEdit ? handleCreatePhaseInGroup : undefined}
        onCreateSection={canEdit ? createSectionByName : undefined}
        onCreatePhasedSection={canEdit ? handleCreatePhasedSection : undefined}
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
                  {canEdit && (
                    <Button
                      variant="outline"
                      onClick={() => setShowNewPhaseGroup(true)}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      New Phase Group
                    </Button>
                  )}
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
                  readOnly={!canEdit}
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
                  readOnly={!canEdit}
                  searchQuery={searchQuery}
                  currentMatchId={currentMatchId}
                />
              </div>

              {/* Create Phase Group Form */}
              {showNewPhaseGroup && canEdit && (
                <div className="mb-8 animate-fade-up">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border bg-card/70 p-4 shadow-sm">
                    <Layers className="h-5 w-5 text-muted-foreground shrink-0" />
                    <Input
                      value={newPhaseGroupName}
                      onChange={(e) => setNewPhaseGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreatePhaseGroup();
                        if (e.key === "Escape") {
                          setShowNewPhaseGroup(false);
                          setNewPhaseGroupName("");
                        }
                      }}
                      placeholder="Phase group name (e.g., FMA)..."
                      autoFocus
                      className="w-full sm:w-64"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleCreatePhaseGroup}
                        disabled={!newPhaseGroupName.trim()}
                      >
                        Create Group
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowNewPhaseGroup(false);
                          setNewPhaseGroupName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase Groups with Tabs */}
              {phaseGroups.map((group, groupIndex) => {
                const groupSections = groupedSections.get(group.id) || [];
                if (groupSections.length === 0) return null;

                const activeSectionId =
                  activePhaseTab[group.id] || groupSections[0]?.id;
                const activeSection = groupSections.find(
                  (s) => s.id === activeSectionId
                );

                return (
                  <div
                    key={group.id}
                    className="animate-fade-up mb-10"
                    style={{
                      animationDelay: `${Math.min(groupIndex, 6) * 60 + 200}ms`,
                    }}
                  >
                    <div className="mb-4">
                      <h2 className="text-2xl font-semibold tracking-tight mb-3">
                        {group.name}
                      </h2>
                      <PhaseTabs
                        group={group}
                        sections={groupSections}
                        activePhaseId={activeSectionId}
                        onPhaseChange={(sectionId) =>
                          setActivePhaseTab((prev) => ({
                            ...prev,
                            [group.id]: sectionId,
                          }))
                        }
                      />
                    </div>
                    {activeSection && (
                      <div
                        id={`section-faq-${activeSection.id}`}
                        className="scroll-mt-24"
                      >
                        <div
                          key={activeSection.id}
                          className="animate-phase-switch"
                        >
                          <FAQSection
                            section={activeSection}
                            faqs={getFaqsForSection(activeSection.id)}
                            resetSignal={faqDraftResetSignal}
                            onUpdateSection={handleUpdateSection}
                            onDeleteSection={handleDeleteSection}
                            onCreateFaq={handleCreateFaq}
                            onUpdateFaq={handleUpdateFaq}
                            onDeleteFaq={handleDeleteFaq}
                            onReorderFaqs={handleReorderFaqs}
                            reorderDisabled={
                              searchQuery.trim().length > 0 || !canEdit
                            }
                            readOnly={!canEdit}
                            searchQuery={searchQuery}
                            currentMatchId={currentMatchId}
                            phaseGroups={phaseGroups}
                            onRemoveFromGroup={
                              canEdit ? handleRemoveSectionFromGroup : undefined
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Standalone Sections */}
              {standaloneSections.map((section, index) => (
                <div
                  key={section.id}
                  className="animate-fade-up"
                  style={{
                    animationDelay: `${Math.min(index + phaseGroups.length, 6) * 60 + 200}ms`,
                  }}
                >
                  {(index > 0 || phaseGroups.length > 0) && canEdit && (
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
                      reorderDisabled={
                        searchQuery.trim().length > 0 || !canEdit
                      }
                      readOnly={!canEdit}
                      searchQuery={searchQuery}
                      currentMatchId={currentMatchId}
                      phaseGroups={phaseGroups}
                      onAddToGroup={canEdit ? handleAddSectionToGroup : undefined}
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Add Section */}
          {!isLoading && canEdit && (
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
            phaseGroups={phaseGroups}
            faqs={effectiveFaqs}
            customRules={customRulesContent}
            exportConfigs={exportConfigs}
            canManageConfigs={canEdit}
            onCreateExportConfig={handleCreateExportConfig}
            onUpdateExportConfig={handleUpdateExportConfig}
            onDeleteExportConfig={handleDeleteExportConfig}
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
