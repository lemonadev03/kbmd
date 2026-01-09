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

      const scrollPosition = window.scrollY + 100;

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(id);
            return;
          }
        }
      }
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
