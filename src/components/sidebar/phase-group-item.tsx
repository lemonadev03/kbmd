"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  GripVertical,
  Pencil,
  Check,
  X,
  Trash2,
  Plus,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Section {
  id: string;
  name: string;
  phaseOrder?: number | null;
}

interface PhaseGroup {
  id: string;
  name: string;
  order: number;
}

interface SortablePhaseItemProps {
  section: Section;
  isActive: boolean;
  count?: number;
  onNavigate: (sectionId: string) => void;
  reorderEnabled: boolean;
}

function SortablePhaseItem({
  section,
  isActive,
  count,
  onNavigate,
  reorderEnabled,
}: SortablePhaseItemProps) {
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
      data-section-id={`section-faq-${section.id}`}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      onClick={() => onNavigate(`section-faq-${section.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(`section-faq-${section.id}`);
        }
      }}
      className={cn(
        "relative w-full flex items-center gap-1 px-3 py-0.5 rounded-md text-sm transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "pl-10",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80",
        isDragging && "opacity-70"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r bg-sidebar-primary" />
      )}

      <span
        ref={setActivatorNodeRef}
        className={cn(
          "-ml-6 mr-1 inline-flex h-5 w-5 items-center justify-center rounded-md",
          reorderEnabled
            ? "cursor-grab active:cursor-grabbing text-sidebar-foreground/50 hover:text-sidebar-foreground"
            : "cursor-not-allowed text-sidebar-foreground/20"
        )}
        title={reorderEnabled ? "Drag to reorder" : "Reordering disabled"}
        aria-label={reorderEnabled ? "Drag to reorder" : "Reordering disabled"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...(reorderEnabled ? listeners : {})}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>

      <span className="min-w-0 flex-1 text-left truncate">{section.name}</span>

      {count !== undefined && (
        <span className="text-xs text-sidebar-foreground/50 tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}

interface PhaseGroupItemProps {
  group: PhaseGroup;
  sections: Section[];
  activeSection: string | null;
  onNavigate: (sectionId: string) => void;
  onRenameGroup?: (groupId: string, name: string) => void | Promise<void>;
  onDeleteGroup?: (groupId: string) => void;
  onReorderSectionsInGroup?: (groupId: string, orderedIds: string[]) => void;
  onCreatePhaseInGroup?: (groupId: string, name: string) => void | Promise<void>;
  groupReorderEnabled?: boolean;
  reorderEnabled?: boolean;
  faqCounts?: Record<string, number>;
  loading?: boolean;
}

export function PhaseGroupItem({
  group,
  sections,
  activeSection,
  onNavigate,
  onRenameGroup,
  onDeleteGroup,
  onReorderSectionsInGroup,
  onCreatePhaseInGroup,
  groupReorderEnabled = false,
  reorderEnabled = true,
  faqCounts = {},
  loading = false,
}: PhaseGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  const isAnyPhaseActive = sections.some(
    (s) => activeSection === `section-faq-${s.id}`
  );
  useEffect(() => {
    if (isAnyPhaseActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isAnyPhaseActive, isExpanded]);
  const canCreatePhase = Boolean(onCreatePhaseInGroup) && !loading;
  const canReorderGroup = groupReorderEnabled && !loading && !isEditing && !isAddingPhase;
  const canReorder =
    Boolean(onReorderSectionsInGroup) &&
    reorderEnabled &&
    !loading &&
    !isEditing &&
    !isAddingPhase;
  const canRename = Boolean(onRenameGroup) && !loading;

  const {
    setNodeRef: setGroupNodeRef,
    setActivatorNodeRef: setGroupActivatorNodeRef,
    attributes: groupAttributes,
    listeners: groupListeners,
    transform: groupTransform,
    transition: groupTransition,
    isDragging: isGroupDragging,
  } = useSortable({
    id: group.id,
    disabled: !canReorderGroup,
  });

  const groupStyle: CSSProperties = {
    transform: CSS.Transform.toString(groupTransform),
    transition: groupTransition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const ids = sections.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const nextIds = arrayMove(ids, oldIndex, newIndex);
    onReorderSectionsInGroup?.(group.id, nextIds);
  };

  const startRename = () => {
    if (!canRename) return;
    setIsEditing(true);
    setEditName(group.name);
  };

  const cancelRename = () => {
    setIsEditing(false);
    setEditName(group.name);
  };

  const commitRename = async () => {
    const nextName = editName.trim();
    setIsEditing(false);
    if (!nextName || nextName === group.name) {
      setEditName(group.name);
      return;
    }
    try {
      await onRenameGroup?.(group.id, nextName);
    } catch (err) {
      console.error(err);
      toast.error("Failed to rename group. Please try again.");
      setEditName(group.name);
    }
  };

  const startAddPhase = () => {
    if (!canCreatePhase) return;
    setIsExpanded(true);
    setIsAddingPhase(true);
    setNewPhaseName("");
  };

  const cancelAddPhase = () => {
    setIsAddingPhase(false);
    setNewPhaseName("");
  };

  const commitAddPhase = async () => {
    const nextName = newPhaseName.trim();
    if (!nextName) {
      cancelAddPhase();
      return;
    }
    try {
      await onCreatePhaseInGroup?.(group.id, nextName);
      setIsAddingPhase(false);
      setNewPhaseName("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add phase. Please try again.");
      setIsAddingPhase(true);
      setNewPhaseName(nextName);
    }
  };

  const totalCount = sections.reduce(
    (sum, s) => sum + (faqCounts[s.id] ?? 0),
    0
  );

  return (
    <div
      ref={setGroupNodeRef}
      style={groupStyle}
      className={cn(isGroupDragging && "opacity-70")}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="group">
          <div
            className={cn(
              "relative w-full flex items-center gap-1 px-3 py-0.5 rounded-lg text-sm transition-all duration-200",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isAnyPhaseActive
                ? "text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground"
            )}
          >
            <span
              ref={setGroupActivatorNodeRef}
              className={cn(
                "-ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md",
                canReorderGroup
                  ? "cursor-grab active:cursor-grabbing text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  : "cursor-not-allowed text-sidebar-foreground/30"
              )}
              title={canReorderGroup ? "Drag to reorder group" : "Reordering disabled"}
              aria-label={
                canReorderGroup ? "Drag to reorder group" : "Reordering disabled"
              }
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              {...groupAttributes}
              {...(canReorderGroup ? groupListeners : {})}
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-1.5 flex-1 min-w-0 text-left transition-[padding] duration-200 group-hover:pr-16"
                type="button"
              >
                <Layers className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
                {isEditing ? (
                  <span
                    className="flex items-center gap-1 flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      className="h-6 px-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      onBlur={() => commitRename()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </span>
                ) : (
                  <>
                    <span className="flex-1 truncate">{group.name}</span>
                    <span className="text-xs text-sidebar-foreground/60 tabular-nums transition-opacity group-hover:opacity-0">
                      {totalCount}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-all duration-200 group-hover:opacity-0",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </>
                )}
              </button>
            </CollapsibleTrigger>
            {/* Action buttons outside the trigger */}
            {isEditing ? (
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    commitRename();
                  }}
                  aria-label="Save rename"
                  title="Save"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelRename();
                  }}
                  aria-label="Cancel rename"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 translate-x-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startRename();
                  }}
                  aria-label="Rename group"
                  title="Rename group"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {onCreatePhaseInGroup && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startAddPhase();
                    }}
                    disabled={!canCreatePhase}
                    aria-label="Add phase"
                    title={canCreatePhase ? "Add phase" : "Adding disabled"}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDeleteGroup && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteGroup(group.id);
                    }}
                    aria-label="Delete group"
                    title="Delete group"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <CollapsibleContent>
            <div className="mt-0 ml-2 space-y-0">
              {isAddingPhase && (
                <div className="pl-10 pr-2 py-0.5">
                  <div className="flex items-center gap-1">
                    <Input
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      autoFocus
                      placeholder="New phase name..."
                      className="h-7 px-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitAddPhase();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelAddPhase();
                        }
                      }}
                      onBlur={() => commitAddPhase()}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        commitAddPhase();
                      }}
                      aria-label="Add phase"
                      title="Add"
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
                        cancelAddPhase();
                      }}
                      aria-label="Cancel add phase"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sections.map((section) => (
                    <SortablePhaseItem
                      key={section.id}
                      section={section}
                      isActive={activeSection === `section-faq-${section.id}`}
                      count={faqCounts[section.id]}
                      onNavigate={onNavigate}
                      reorderEnabled={canReorder}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {sections.length === 0 && (
                <p className="pl-4 py-1 text-xs text-sidebar-foreground/50 italic">
                  No phases yet
                </p>
              )}
            </div>
          </CollapsibleContent>
        </div>
    </Collapsible>
    </div>
  );
}
