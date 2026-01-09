"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./sidebar-nav-item";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";

interface Section {
  id: string;
  name: string;
  order?: number;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sections: Section[];
  activeSection: string | null;
  onNavigate: (sectionId: string) => void;
  onReorderSections?: (orderedIds: string[]) => void;
  reorderEnabled?: boolean;
  faqCounts?: Record<string, number>;
  loading?: boolean;
  userEmail?: string | null;
  onSignOut?: () => void;
  signOutDisabled?: boolean;
}

function SortableSectionNavItem({
  section,
  isActive,
  count,
  onNavigate,
  reorderEnabled,
}: {
  section: Section;
  isActive: boolean;
  count?: number;
  onNavigate: (sectionId: string) => void;
  reorderEnabled: boolean;
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
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={() => onNavigate(`section-faq-${section.id}`)}
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

      <span className="truncate flex-1 text-left">{section.name}</span>
      {count !== undefined && (
        <span className="text-xs text-sidebar-foreground/60 tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  isOpen,
  onToggle,
  sections,
  activeSection,
  onNavigate,
  onReorderSections,
  reorderEnabled = true,
  faqCounts = {},
  loading = false,
  userEmail,
  onSignOut,
  signOutDisabled = false,
}: SidebarProps) {
  const [faqsExpanded, setFaqsExpanded] = useState(true);

  const isFaqActive = activeSection?.startsWith("section-faq-");
  const canReorderSections =
    Boolean(onReorderSections) && reorderEnabled && !loading;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorderSections) return;
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const ids = sections.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const nextIds = arrayMove(ids, oldIndex, newIndex);
    onReorderSections?.(nextIds);
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
                    {canReorderSections ? (
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
                            <SortableSectionNavItem
                              key={section.id}
                              section={section}
                              isActive={activeSection === `section-faq-${section.id}`}
                              onNavigate={onNavigate}
                              count={faqCounts[section.id]}
                              reorderEnabled={canReorderSections}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    ) : (
                      sections.map((section) => (
                        <SidebarNavItem
                          key={section.id}
                          label={section.name}
                          indent
                          isActive={activeSection === `section-faq-${section.id}`}
                          onClick={() => onNavigate(`section-faq-${section.id}`)}
                          count={faqCounts[section.id]}
                        />
                      ))
                    )}
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
            {userEmail && (
              <span className="text-xs text-sidebar-foreground/70 truncate max-w-[9rem]">
                {userEmail}
              </span>
            )}
          </div>
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
