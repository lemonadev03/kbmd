"use client";

import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "kb-theme";

type Theme = "light" | "dark";

const getSystemTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const initial =
      stored === "light" || stored === "dark" ? stored : getSystemTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const updateTheme = useCallback((next: Theme) => {
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    updateTheme(theme === "dark" ? "light" : "dark");
  }, [theme, updateTheme]);

  return { theme, toggleTheme, setTheme: updateTheme, mounted };
}
