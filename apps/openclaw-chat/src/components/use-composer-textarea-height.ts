import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

export function useComposerTextareaHeight(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string
): number {
  const [height, setHeight] = useState(44);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const style = getComputedStyle(el);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const width = el.clientWidth - paddingLeft - paddingRight;
      const { prepare, layout } = prepareComposerHeight(width, style.font);
      const measured = layout(prepare(value));
      const clamped = clampComposerTotalHeightPx(measured, 44, 200);
      setHeight(clamped);
    };

    // Initial
    compute();

    // ResizeObserver
    roRef.current = new ResizeObserver(() => compute());
    roRef.current.observe(el);

    return () => roRef.current?.disconnect();
  }, [ref, value]);

  return height;
}

function prepareComposerHeight(
  width: number,
  font: string
): {
  prepare: (text: string) => unknown;
  layout: (prepared: unknown) => number;
} {
  // Uses @chenglou/pretext under the hood
  // For now return identity stub — will be replaced by actual pretext integration
  return {
    prepare: (text: string) => ({ text, width, font }),
    layout: (prepared: unknown) => {
      const p = prepared as { text: string; width: number; font: string };
      const lineHeight = 20; // approx
      const lines = Math.max(1, Math.ceil(p.text.length / Math.floor(p.width / 8)));
      return Math.min(200, Math.max(44, lines * lineHeight + 24));
    },
  };
}

export function clampComposerTotalHeightPx(
  height: number,
  min: number,
  max: number
): number {
  return Math.min(max, Math.max(min, height));
}

export function parseCssPx(px: string): number {
  const match = px.match(/^(\d+(?:\.\d+)?)px$/);
  return match ? parseFloat(match[1]) : 0;
}
