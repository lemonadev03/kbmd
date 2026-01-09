"use client";

import { useState, useCallback, useMemo, useEffect } from "react";

interface FAQ {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  notes: string;
  order: number;
}

interface Section {
  id: string;
  name: string;
}

type MatchLocation =
  | { type: "faq"; faqId: string; field: "question" | "answer" | "notes"; matchIndex: number }
  | { type: "section-title"; sectionType: "custom-rules" | "variables"; matchIndex: number }
  | { type: "faq-section-name"; sectionId: string; matchIndex: number };

function countMatchesInText(text: string, query: string): number {
  if (!query.trim()) return 0;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let count = 0;
  let index = lowerText.indexOf(lowerQuery);
  while (index !== -1) {
    count++;
    index = lowerText.indexOf(lowerQuery, index + 1);
  }
  return count;
}

function getMatchId(match: MatchLocation): string {
  if (match.type === "faq") {
    return `match-${match.faqId}-${match.field}-${match.matchIndex}`;
  } else if (match.type === "section-title") {
    return `match-title-${match.sectionType}-${match.matchIndex}`;
  } else {
    return `match-section-name-${match.sectionId}-${match.matchIndex}`;
  }
}

export function useSearchNavigation(
  faqs: FAQ[],
  sections: Section[],
  query: string
) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Build a flat list of all match locations
  const matches = useMemo(() => {
    if (!query.trim()) return [];

    const allMatches: MatchLocation[] = [];

    // Custom Rules title matches
    const customRulesCount = countMatchesInText("Custom Rules", query);
    for (let i = 0; i < customRulesCount; i++) {
      allMatches.push({ type: "section-title", sectionType: "custom-rules", matchIndex: i });
    }

    // Variables title matches
    const variablesCount = countMatchesInText("Variables", query);
    for (let i = 0; i < variablesCount; i++) {
      allMatches.push({ type: "section-title", sectionType: "variables", matchIndex: i });
    }

    // FAQ section name matches
    for (const section of sections) {
      const sectionNameCount = countMatchesInText(section.name, query);
      for (let i = 0; i < sectionNameCount; i++) {
        allMatches.push({ type: "faq-section-name", sectionId: section.id, matchIndex: i });
      }
    }

    // FAQ content matches
    for (const faq of faqs) {
      // Question matches
      const questionCount = countMatchesInText(faq.question, query);
      for (let i = 0; i < questionCount; i++) {
        allMatches.push({ type: "faq", faqId: faq.id, field: "question", matchIndex: i });
      }

      // Answer matches
      const answerCount = countMatchesInText(faq.answer, query);
      for (let i = 0; i < answerCount; i++) {
        allMatches.push({ type: "faq", faqId: faq.id, field: "answer", matchIndex: i });
      }

      // Notes matches
      const notesCount = countMatchesInText(faq.notes, query);
      for (let i = 0; i < notesCount; i++) {
        allMatches.push({ type: "faq", faqId: faq.id, field: "notes", matchIndex: i });
      }
    }

    return allMatches;
  }, [faqs, sections, query]);

  // Reset to first match when query changes
  useEffect(() => {
    queueMicrotask(() => setCurrentIndex(0));
  }, [query]);

  const totalMatches = matches.length;

  const currentMatch = matches[currentIndex] ?? null;

  const currentMatchId = currentMatch ? getMatchId(currentMatch) : null;

  const goToNext = useCallback(() => {
    if (totalMatches === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalMatches);
  }, [totalMatches]);

  const goToPrev = useCallback(() => {
    if (totalMatches === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  }, [totalMatches]);

  // Scroll to current match when it changes
  useEffect(() => {
    if (currentMatchId) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const element = document.getElementById(currentMatchId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
  }, [currentMatchId]);

  return {
    totalMatches,
    currentIndex: totalMatches > 0 ? currentIndex + 1 : 0,
    currentMatchId,
    currentMatch,
    goToNext,
    goToPrev,
  };
}
