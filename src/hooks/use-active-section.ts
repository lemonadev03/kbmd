"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Section {
  id: string;
  name: string;
}

export function useActiveSection(sections: Section[]) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const isScrollingRef = useRef(false);
  const activeSectionRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const sectionIds = [
      "section-custom-rules",
      "section-variables",
      ...sections.map((s) => `section-faq-${s.id}`),
    ];

    const computeActiveSection = () => {
      rafRef.current = null;
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

      const next = bestId ?? fallbackId ?? null;
      if (next !== activeSectionRef.current) {
        activeSectionRef.current = next;
        setActiveSection(next);
      }
    };

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(computeActiveSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sections]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      isScrollingRef.current = true;
      activeSectionRef.current = sectionId;
      setActiveSection(sectionId);

      element.scrollIntoView({ behavior: "smooth", block: "start" });

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    }
  }, []);

  return { activeSection, scrollToSection };
}
