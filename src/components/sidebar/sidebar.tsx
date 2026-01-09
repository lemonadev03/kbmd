"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./sidebar-nav-item";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileText, Variable, HelpCircle, ChevronDown, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Section {
  id: string;
  name: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sections: Section[];
  activeSection: string | null;
  onNavigate: (sectionId: string) => void;
  faqCounts?: Record<string, number>;
  loading?: boolean;
}

export function Sidebar({
  isOpen,
  onToggle,
  sections,
  activeSection,
  onNavigate,
  faqCounts = {},
  loading = false,
}: SidebarProps) {
  const [faqsExpanded, setFaqsExpanded] = useState(true);

  const isFaqActive = activeSection?.startsWith("section-faq-");

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onToggle}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64",
          "bg-sidebar border-r border-sidebar-border",
          "flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border shrink-0">
          <span className="font-semibold text-sidebar-foreground">
            Navigation
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
        <nav className="flex-1 overflow-y-auto sidebar-scroll p-3 space-y-1">
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
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
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
                        "h-4 w-4 shrink-0",
                        faqsExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-1 space-y-1">
                    {sections.map((section) => (
                      <SidebarNavItem
                        key={section.id}
                        label={section.name}
                        indent
                        isActive={activeSection === `section-faq-${section.id}`}
                        onClick={() => onNavigate(`section-faq-${section.id}`)}
                        count={faqCounts[section.id]}
                      />
                    ))}
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
          <p className="text-xs text-sidebar-foreground/60 text-center">
            Knowledge Base
          </p>
        </div>
      </aside>
    </>
  );
}
