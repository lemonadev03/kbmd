"use client";

import { useEffect, useState, useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./sidebar-nav-item";
import { PhaseGroupItem } from "./phase-group-item";
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
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  Variable,
  HelpCircle,
  ChevronDown,
  PanelLeftClose,
  LogOut,
  GripVertical,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";

interface Section {
  id: string;
  name: string;
  order?: number;
  phaseGroupId?: string | null;
  phaseOrder?: number | null;
}

interface PhaseGroup {
  id: string;
  name: string;
  order: number;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sections: Section[];
  activeSection: string | null;
  onNavigate: (sectionId: string) => void;
  onReorderSections?: (orderedIds: string[]) => void;
  onRenameSection?: (sectionId: string, name: string) => void | Promise<void>;
  reorderEnabled?: boolean;
  faqCounts?: Record<string, number>;
  loading?: boolean;
  userEmail?: string | null;
  userName?: string | null;
  orgName?: string | null;
  orgSettingsHref?: string;
  onSignOut?: () => void;
  signOutDisabled?: boolean;
  // Phase group props
  phaseGroups?: PhaseGroup[];
  onReorderPhaseGroups?: (orderedIds: string[]) => void;
  onRenamePhaseGroup?: (groupId: string, name: string) => void | Promise<void>;
  onDeletePhaseGroup?: (groupId: string) => void;
  onReorderSectionsInGroup?: (groupId: string, orderedIds: string[]) => void;
  onCreatePhaseInGroup?: (groupId: string, name: string) => void | Promise<void>;
  onCreateSection?: (name: string) => void | Promise<boolean> | boolean;
  onCreatePhasedSection?: (
    groupName: string,
    phaseName: string
  ) => void | Promise<boolean> | boolean;
}

function SortableSectionNavItem({
  section,
  isActive,
  count,
  onNavigate,
  reorderEnabled,
  renameEnabled,
  isEditing,
  editValue,
  onStartRename,
  onEditChange,
  onCommitRename,
  onCancelRename,
}: {
  section: Section;
  isActive: boolean;
  count?: number;
  onNavigate: (sectionId: string) => void;
  reorderEnabled: boolean;
  renameEnabled: boolean;
  isEditing: boolean;
  editValue: string;
  onStartRename: (section: Section) => void;
  onEditChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    disabled: !reorderEnabled,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      onClick={() => {
        if (isEditing) return;
        onNavigate(`section-faq-${section.id}`);
      }}
      onKeyDown={(e) => {
        if (isEditing) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(`section-faq-${section.id}`);
        }
      }}
      className={cn(
        "relative w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "pl-9",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground",
        isDragging && "opacity-70"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-sidebar-primary" />
      )}

      <span
        ref={setActivatorNodeRef}
        className={cn(
          "-ml-6 mr-1 inline-flex h-6 w-6 items-center justify-center rounded-md",
          reorderEnabled
            ? "cursor-grab active:cursor-grabbing text-sidebar-foreground/60 hover:text-sidebar-foreground"
            : "cursor-not-allowed text-sidebar-foreground/30"
        )}
        title={reorderEnabled ? "Drag to reorder" : "Reordering disabled"}
        aria-label={reorderEnabled ? "Drag to reorder" : "Reordering disabled"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...(reorderEnabled ? listeners : {})}
      >
        <GripVertical className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1 text-left">
        {isEditing ? (
          <span
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              autoFocus
              className="h-7 px-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCommitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelRename();
                }
              }}
              onBlur={() => onCommitRename()}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCommitRename();
              }}
              aria-label="Save rename"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancelRename();
              }}
              aria-label="Cancel rename"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </span>
        ) : (
          <span className="truncate">{section.name}</span>
        )}
      </span>

      {!isEditing && count !== undefined && (
        <span className="text-xs text-sidebar-foreground/60 tabular-nums">
          {count}
        </span>
      )}

      {!isEditing && (
        <span className="ml-1 flex items-center">
          <button
            type="button"
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
              "opacity-0 group-hover:opacity-100 hover:bg-muted/60",
              renameEnabled ? "" : "cursor-not-allowed opacity-40"
            )}
            aria-label="Rename section"
            title={renameEnabled ? "Rename section" : "Renaming disabled"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!renameEnabled) return;
              onStartRename(section);
            }}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
        </span>
      )}
    </div>
  );
}

export function Sidebar({
  isOpen,
  onToggle,
  sections,
  activeSection,
  onNavigate,
  onReorderSections,
  onRenameSection,
  reorderEnabled = true,
  faqCounts = {},
  loading = false,
  userEmail,
  userName,
  orgName,
  orgSettingsHref,
  onSignOut,
  signOutDisabled = false,
  phaseGroups = [],
  onReorderPhaseGroups,
  onRenamePhaseGroup,
  onDeletePhaseGroup,
  onReorderSectionsInGroup,
  onCreatePhaseInGroup,
  onCreateSection,
  onCreatePhasedSection,
}: SidebarProps) {
  const [faqsExpanded, setFaqsExpanded] = useState(true);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [insertState, setInsertState] = useState<{
    id: string;
    mode: "section" | "phased";
  } | null>(null);
  const [insertSectionName, setInsertSectionName] = useState("");
  const [insertPhaseGroupName, setInsertPhaseGroupName] = useState("");
  const [insertPhaseName, setInsertPhaseName] = useState("");

  // Compute grouped and standalone sections
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

  const isFaqActive = activeSection?.startsWith("section-faq-");
  const canReorderGroups =
    Boolean(onReorderPhaseGroups) &&
    reorderEnabled &&
    !loading &&
    !insertState;
  const canReorderSections =
    Boolean(onReorderSections) &&
    reorderEnabled &&
    !loading &&
    !editingSectionId &&
    !insertState;
  const canRenameSections = Boolean(onRenameSection) && !loading;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    // If the section disappears (deleted), exit edit mode.
    if (!editingSectionId) return;
    if (sections.some((s) => s.id === editingSectionId)) return;
    queueMicrotask(() => {
      setEditingSectionId(null);
      setEditName("");
    });
  }, [editingSectionId, sections]);

  const startInsert = (id: string, mode: "section" | "phased") => {
    setInsertState({ id, mode });
    setInsertSectionName("");
    setInsertPhaseGroupName("");
    setInsertPhaseName("");
  };

  const cancelInsert = () => {
    setInsertState(null);
    setInsertSectionName("");
    setInsertPhaseGroupName("");
    setInsertPhaseName("");
  };

  const commitInsertSection = async () => {
    if (!onCreateSection) return;
    const name = insertSectionName.trim();
    if (!name) return;
    const ok = await onCreateSection(name);
    if (ok === false) return;
    cancelInsert();
  };

  const commitInsertPhased = async () => {
    if (!onCreatePhasedSection) return;
    const groupName = insertPhaseGroupName.trim();
    const phaseName = insertPhaseName.trim();
    if (!groupName || !phaseName) return;
    const ok = await onCreatePhasedSection(groupName, phaseName);
    if (ok === false) return;
    cancelInsert();
  };

  const renderInsertRow = (rowId: string) => {
    if (!onCreateSection && !onCreatePhasedSection) return null;
    const isSectionActive =
      insertState?.id === rowId && insertState?.mode === "section";
    const isPhasedActive =
      insertState?.id === rowId && insertState?.mode === "phased";
    const canAddSection = Boolean(onCreateSection) && !loading;
    const canAddPhased = Boolean(onCreatePhasedSection) && !loading;

    return (
      <div key={rowId} className="relative py-0.5">
        <div className="group flex items-center gap-2 px-2">
          <div className="flex-1 h-px bg-border/60" />
          <div
            className={cn(
              "inline-flex items-center gap-1",
              isSectionActive || isPhasedActive
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          >
            {onCreateSection && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-[11px]"
                onClick={() => startInsert(rowId, "section")}
                disabled={!canAddSection}
              >
                + Section
              </Button>
            )}
            {onCreatePhasedSection && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-[11px]"
                onClick={() => startInsert(rowId, "phased")}
                disabled={!canAddPhased}
              >
                + Phased
              </Button>
            )}
          </div>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        {isSectionActive && (
          <div className="mt-2 px-3">
            <div className="flex items-center gap-2">
              <Input
                value={insertSectionName}
                onChange={(e) => setInsertSectionName(e.target.value)}
                placeholder="Section name..."
                className="h-7 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitInsertSection();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelInsert();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-7 px-2"
                onClick={() => void commitInsertSection()}
                disabled={!insertSectionName.trim()}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={cancelInsert}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isPhasedActive && (
          <div className="mt-2 px-3 space-y-2">
            <Input
              value={insertPhaseGroupName}
              onChange={(e) => setInsertPhaseGroupName(e.target.value)}
              placeholder="Phase group name..."
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelInsert();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Input
                value={insertPhaseName}
                onChange={(e) => setInsertPhaseName(e.target.value)}
                placeholder="Phase name..."
                className="h-7 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitInsertPhased();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelInsert();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-7 px-2"
                onClick={() => void commitInsertPhased()}
                disabled={
                  !insertPhaseGroupName.trim() || !insertPhaseName.trim()
                }
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={cancelInsert}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    if (!canReorderGroups) return;
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const ids = phaseGroups.map((g) => g.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const nextIds = arrayMove(ids, oldIndex, newIndex);
    onReorderPhaseGroups?.(nextIds);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorderSections) return;
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    // Only reorder standalone sections
    const ids = standaloneSections.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const nextIds = arrayMove(ids, oldIndex, newIndex);
    onReorderSections?.(nextIds);
  };

  const startRename = (section: Section) => {
    if (!canRenameSections) return;
    setEditingSectionId(section.id);
    setEditName(section.name);
  };

  const cancelRename = () => {
    setEditingSectionId(null);
    setEditName("");
  };

  const commitRename = async () => {
    if (!editingSectionId) return;
    const nextName = editName.trim();
    const current = sections.find((s) => s.id === editingSectionId);
    if (!current) {
      cancelRename();
      return;
    }
    if (!nextName) {
      // Don't allow empty names; revert.
      cancelRename();
      return;
    }
    cancelRename();
    if (nextName === current.name) return;
    try {
      await onRenameSection?.(current.id, nextName);
    } catch (err) {
      console.error(err);
      alert("Failed to rename section. Please try again.");
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onToggle}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64",
          "bg-sidebar/90 backdrop-blur-md border-r border-sidebar-border shadow-lg",
          "flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border/70 shrink-0">
          <span className="text-sm font-semibold text-sidebar-foreground">
            Knowledge Base
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll p-4 space-y-1">
          {loading ? (
            <>
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <div className="pt-2 pl-6 space-y-1">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </>
          ) : (
            <>
              {/* Custom Rules */}
              <SidebarNavItem
                label="Custom Rules"
                icon={<FileText className="h-4 w-4" />}
                isActive={activeSection === "section-custom-rules"}
                onClick={() => onNavigate("section-custom-rules")}
              />

              {/* Variables */}
              <SidebarNavItem
                label="Variables"
                icon={<Variable className="h-4 w-4" />}
                isActive={activeSection === "section-variables"}
                onClick={() => onNavigate("section-variables")}
              />

              {/* FAQs Section with Collapsible */}
              <Collapsible open={faqsExpanded} onOpenChange={setFaqsExpanded}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isFaqActive
                        ? "text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground"
                    )}
                  >
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">FAQ Sections</span>
                    <span className="text-xs text-sidebar-foreground/60">
                      {sections.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        faqsExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-1 space-y-1">
                    {/* Phase Groups */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleGroupDragEnd}
                    >
                      <SortableContext
                        items={phaseGroups.map((g) => g.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {phaseGroups.map((group, index) => {
                          const groupSections = groupedSections.get(group.id) || [];
                          return (
                            <div key={group.id}>
                              {index > 0 && renderInsertRow(`groups-between-${group.id}`)}
                              <PhaseGroupItem
                                group={group}
                                sections={groupSections}
                                activeSection={activeSection}
                                onNavigate={onNavigate}
                                onRenameGroup={onRenamePhaseGroup}
                                onDeleteGroup={onDeletePhaseGroup}
                                onReorderSectionsInGroup={onReorderSectionsInGroup}
                                onCreatePhaseInGroup={onCreatePhaseInGroup}
                                groupReorderEnabled={canReorderGroups}
                                reorderEnabled={reorderEnabled}
                                faqCounts={faqCounts}
                                loading={loading}
                              />
                            </div>
                          );
                        })}
                        {phaseGroups.length > 0 && renderInsertRow("groups-end")}
                      </SortableContext>
                    </DndContext>

                    {/* Standalone Sections */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={standaloneSections.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {standaloneSections.map((section, index) => (
                          <div key={section.id}>
                            {index > 0 &&
                              renderInsertRow(`sections-between-${section.id}`)}
                            <div className="group">
                              <SortableSectionNavItem
                                section={section}
                                isActive={activeSection === `section-faq-${section.id}`}
                                onNavigate={onNavigate}
                                count={faqCounts[section.id]}
                                reorderEnabled={canReorderSections}
                                renameEnabled={canRenameSections}
                                isEditing={editingSectionId === section.id}
                                editValue={editingSectionId === section.id ? editName : ""}
                                onStartRename={startRename}
                                onEditChange={setEditName}
                                onCommitRename={() => void commitRename()}
                                onCancelRename={cancelRename}
                              />
                            </div>
                          </div>
                        ))}
                      </SortableContext>
                    </DndContext>
                    {(standaloneSections.length > 0 || phaseGroups.length === 0) &&
                      renderInsertRow("sections-end")}
                    {sections.length === 0 && (
                      <p className="pl-9 py-2 text-xs text-sidebar-foreground/60 italic">
                        No sections yet
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center justify-between gap-2">
            <ThemeToggle className="h-8 w-8" />
          </div>
          {(orgName || userName || userEmail) && orgSettingsHref && (
            <Link
              href={orgSettingsHref}
              className={cn(
                "mt-3 block rounded-lg border border-sidebar-border/60 px-3 py-2",
                "bg-sidebar-accent/30 transition-colors hover:bg-sidebar-accent"
              )}
            >
              <span className="text-[10px] uppercase tracking-wide text-sidebar-foreground/60">
                Organization
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-sidebar-foreground truncate">
                {orgName ?? "Organization"}
              </span>
              <span className="mt-0.5 block text-xs text-sidebar-foreground/60 truncate">
                {userName ?? userEmail}
              </span>
            </Link>
          )}
          {onSignOut && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              disabled={signOutDisabled}
              className="mt-3 w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
