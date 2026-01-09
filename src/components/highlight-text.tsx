"use client";

import { cn } from "@/lib/utils";

interface HighlightTextProps {
  text: string;
  query: string;
  currentMatchId?: string;
  matchIdPrefix?: string;
}

export function HighlightText({
  text,
  query,
  currentMatchId,
  matchIdPrefix = "",
}: HighlightTextProps) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let matchIndex = 0;

  let index = lowerText.indexOf(lowerQuery, lastIndex);
  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    // Add highlighted match
    const matchId = `${matchIdPrefix}-${matchIndex}`;
    const isCurrent = matchId === currentMatchId;

    parts.push(
      <mark
        key={matchId}
        id={matchId}
        className={cn(
          "rounded px-0.5",
          isCurrent
            ? "bg-yellow-400 text-black ring-2 ring-yellow-500"
            : "bg-yellow-200 text-black"
        )}
      >
        {text.slice(index, index + query.length)}
      </mark>
    );

    lastIndex = index + query.length;
    matchIndex++;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

// Utility to count matches in text
export function countMatches(text: string, query: string): number {
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
