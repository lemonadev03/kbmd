"use client";

import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ isOpen, onToggle }: SidebarToggleProps) {
  // Only show when sidebar is closed
  if (isOpen) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-sm"
      aria-label="Open sidebar"
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}
