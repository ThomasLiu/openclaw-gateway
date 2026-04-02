/**
 * pretext-composer-height — Pure-function height measurement for the chat composer.
 *
 * Uses a hidden DOM element to measure the rendered height of arbitrary text
 * given a fixed width, enabling the textarea to grow/shrink without
 * synchronous layout thrash.
 *
 * Two-phase API:
 *   prepare(layout, text) → PreparedText  (layout-independent; cheap)
 *   layout(p)              → height (px)   (layout-dependent; call on width change only)
 *
 * The whiteSpace: pre-wrap style ensures that line breaks in the textarea
 * (Shift+Enter) are respected during measurement.
 */
export interface PreparedText {
  text: string;
  style: {
    font: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    wordBreak: string;
    whiteSpace: "pre-wrap";
    overflowWrap: "break-word";
    padding: string;
    width: string;
    position: "absolute";
    visibility: "hidden";
    pointerEvents: "none";
    boxSizing: "border-box";
  };
}

/**
 * Parse a CSS px string value to a number.
 * Returns 0 for invalid/non-numeric inputs.
 */
export function parseCssPx(px: string): number {
  const match = px.match(/^(\d+(?:\.\d+)?)px$/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Clamp a computed height to the [min, max] range.
 */
export function clampComposerTotalHeightPx(height: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, height));
}

/**
 * Phase 1 — prepare.
 *
 * Creates a layout-independent "prepared" representation of the text.
 *
 * @param layout  CSS properties required for layout:
 *                  - width: number (clientWidth - paddingLeft - paddingRight)
 *                  - font: string
 *                  - fontSize: number (px)
 *                  - lineHeight: number (px)
 *                  - paddingTop: number (px)
 *                  - paddingBottom: number (px)
 *                  - paddingLeft: number (px)
 *                  - paddingRight: number (px)
 * @param text    The textarea text to measure
 */
export function prepare(
  layout: {
    width: number;
    font: string;
    fontSize: number;
    lineHeight: number;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
  },
  text: string
): PreparedText {
  const { width, font, fontSize, lineHeight, paddingTop, paddingBottom, paddingLeft, paddingRight } = layout;

  const totalPaddingH = paddingLeft + paddingRight;

  return {
    text,
    style: {
      font,
      fontSize,
      fontWeight: 400,
      lineHeight,
      letterSpacing: 0,
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      overflowWrap: "break-word",
      padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
      width: `${width - totalPaddingH}px`,
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      boxSizing: "border-box",
    },
  };
}

/**
 * Phase 2 — layout.
 *
 * Measures the height of the prepared text using a hidden DOM element.
 * Must be called whenever the container width changes.
 *
 * Returns total height including padding.
 */
export function layout(prepared: PreparedText): number {
  if (typeof document === "undefined") {
    // SSR fallback
    return 44;
  }

  try {
    const div = document.createElement("div");
    if (!div) return 44;

    Object.assign(div.style, prepared.style);
    div.textContent = prepared.text;
    document.body.appendChild(div);
    const height = div.scrollHeight;
    document.body.removeChild(div);
    return height;
  } catch {
    return 44;
  }
}
