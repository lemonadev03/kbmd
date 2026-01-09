"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Section {
  id: string;
  name: string;
}

export function useActiveSection(sections: Section[]) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const sectionIds = [
      "section-custom-rules",
      "section-variables",
      ...sections.map((s) => `section-faq-${s.id}`),
    ];

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const anchor = 140;
      let bestId: string | null = null;
      let bestTop = -Infinity;
      let fallbackId: string | null = null;
      let fallbackTop = Infinity;

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (!element) continue;
        const top = element.getBoundingClientRect().top;
        if (top <= anchor && top > bestTop) {
          bestTop = top;
          bestId = id;
        } else if (top > anchor && top < fallbackTop) {
          fallbackTop = top;
          fallbackId = id;
        }
      }

      setActiveSection(bestId ?? fallbackId ?? null);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      isScrollingRef.current = true;
      setActiveSection(sectionId);

      element.scrollIntoView({ behavior: "smooth", block: "start" });

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    }
  }, []);

  return { activeSection, scrollToSection };
}
