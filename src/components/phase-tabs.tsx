"use client";

import { useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  name: string;
  phaseOrder?: number | null;
}

interface PhaseGroup {
  id: string;
  name: string;
}

interface PhaseTabsProps {
  group: PhaseGroup;
  sections: Section[];
  activePhaseId: string;
  onPhaseChange: (sectionId: string) => void;
}

export function PhaseTabs({
  sections,
  activePhaseId,
  onPhaseChange,
}: PhaseTabsProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const target = tabRefs.current[activePhaseId];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activePhaseId]);

  if (sections.length === 0) return null;

  return (
    <Tabs value={activePhaseId} onValueChange={onPhaseChange}>
      <TabsList className="w-full justify-start overflow-x-auto scroll-smooth bg-muted/60 p-1.5 shadow-sm">
        {sections.map((section) => (
          <TabsTrigger
            key={section.id}
            value={section.id}
            ref={(node) => {
              tabRefs.current[section.id] = node;
            }}
            className={cn(
              "transition-[transform,box-shadow,background-color,color] duration-200 ease-out",
              "hover:-translate-y-0.5",
              "data-[state=active]:-translate-y-0.5 data-[state=active]:shadow-sm",
              "data-[state=active]:animate-scale-in"
            )}
          >
            {section.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
