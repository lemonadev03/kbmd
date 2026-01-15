"use client";

import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  indent?: boolean;
  count?: number;
  dataId?: string;
}

export function SidebarNavItem({
  label,
  icon,
  isActive,
  onClick,
  indent,
  count,
  dataId,
}: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      data-section-id={dataId}
      className={cn(
        "relative w-full flex items-center gap-1.5 px-3 py-0.5 rounded-lg text-sm transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        indent && "pl-9",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-sidebar-primary" />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-sidebar-foreground/60 tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
