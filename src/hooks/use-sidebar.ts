"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SIDEBAR_STORAGE_KEY = "kb-sidebar-open";

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      queueMicrotask(() => setIsOpen(stored === "true"));
    }
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, toggle, open, close };
}
