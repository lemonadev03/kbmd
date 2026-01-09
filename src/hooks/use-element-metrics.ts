import { useEffect, useState, type RefObject } from "react";

export interface ElementMetrics {
  height: number;
  lineCount: number | null;
}

export function useElementMetrics<T extends HTMLElement>(
  ref: RefObject<T | null>,
  deps: readonly unknown[] = []
): ElementMetrics {
  const [metrics, setMetrics] = useState<ElementMetrics>({
    height: 0,
    lineCount: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;

    const compute = () => {
      const node = ref.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const height = rect.height;

      const style = window.getComputedStyle(node);
      let lineHeight = Number.parseFloat(style.lineHeight);
      if (!Number.isFinite(lineHeight)) {
        // `normal` line-height: approximate from font-size.
        const fontSize = Number.parseFloat(style.fontSize);
        lineHeight = Number.isFinite(fontSize) ? fontSize * 1.2 : 0;
      }

      const lineCount =
        lineHeight > 0
          ? Math.max(1, Math.round(node.scrollHeight / lineHeight))
          : null;

      setMetrics({ height, lineCount });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    schedule();

    const observer = new ResizeObserver(schedule);
    observer.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);

  return metrics;
}
