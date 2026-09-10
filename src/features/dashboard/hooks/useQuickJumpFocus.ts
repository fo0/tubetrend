import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * Roving tab stop for the avatar quick-jump strip.
 *
 * Every avatar used to be its own tab stop, so a dashboard with fifteen
 * favorites put fifteen presses of Tab between the sort buttons and the filter
 * below — a run of identical round buttons a keyboard user has to walk through
 * on the way to anything else on the page. The strip is a toolbar (WAI-ARIA
 * Authoring Practices): it holds one tab stop, and the arrow keys move between
 * its buttons, with Home / End for the ends.
 *
 * Focus is applied to the DOM node rather than kept per-item in React, because
 * the strip re-renders whenever the filter changes and the buttons themselves
 * are stateless. Up/Down do the same as Left/Right: the strip wraps onto
 * several lines once there are enough favorites, so "the next one" is the
 * honest reading of either axis.
 */
export function useQuickJumpFocus(quickJumpCount: number) {
  const quickJumpRef = useRef<HTMLDivElement | null>(null);
  const [quickJumpIndex, setQuickJumpIndex] = useState(0);
  // Filtering shortens the strip, so the remembered index can point past its end
  // — fall back to the first avatar rather than leaving the group with no tab
  // stop at all.
  const activeQuickJumpIndex = quickJumpIndex < quickJumpCount ? quickJumpIndex : 0;

  const focusQuickJumpAt = (index: number) => {
    setQuickJumpIndex(index);
    quickJumpRef.current?.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
  };

  const handleQuickJumpKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = quickJumpCount - 1;
    if (last < 0) return;

    let next: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = last;
    } else {
      return;
    }

    // Arrow keys would otherwise scroll the page under the strip, and Home / End
    // would jump to the top or bottom of the document — the opposite of moving
    // within a toolbar.
    e.preventDefault();
    focusQuickJumpAt(next);
  };

  return { quickJumpRef, activeQuickJumpIndex, setQuickJumpIndex, handleQuickJumpKeyDown };
}
