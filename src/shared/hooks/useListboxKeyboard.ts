import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

export interface UseListboxKeyboardOptions {
  /** Whether the popover holding the listbox is currently rendered. */
  isOpen: boolean;
  /** Number of options rendered inside the listbox right now. */
  itemCount: number;
  /** Index of the option matching the current value, or -1 when none does. */
  selectedIndex: number;
  /** Closes the popover. Must be referentially stable (wrap it in useCallback). */
  onClose: () => void;
  /** The control that opens the popover — focus returns here on close. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** Stable, instance-unique prefix for the generated option ids. */
  idPrefix: string;
}

export interface UseListboxKeyboardResult {
  /** Props to spread on the element carrying `role="listbox"`. */
  listboxProps: {
    ref: RefObject<HTMLDivElement | null>;
    "aria-activedescendant": string | undefined;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  };
  /** Props to spread on the element carrying `role="option"` at `index`. */
  getOptionProps: (index: number) => { id: string; tabIndex: number };
}

/**
 * Keyboard behaviour for a WAI-ARIA APG listbox rendered inside a popover.
 *
 * Two things are worth knowing before changing this:
 *
 * 1. **Roving tabindex is the operative mechanism.** Real DOM focus moves onto
 *    the active option, so exactly one option is tabbable (`tabIndex={0}`) and
 *    the rest are `-1`. `aria-activedescendant` is mirrored onto the listbox for
 *    the assistive tech that reads it; it always points at an id this hook also
 *    hands to a rendered option, never at a stale one.
 * 2. **Only five keys are consumed** — Up, Down, Home, End and Escape. Tab is
 *    deliberately left alone so focus can still leave the menu, and Enter/Space
 *    are left alone so they keep reaching the native <button> each option
 *    renders as. Intercepting either would break selection or trap the user.
 *
 * Focus handling mirrors `HiddenHighlightsModal`: focus moves into the menu on
 * open and is handed back to the trigger on close, because the menu unmounts and
 * would otherwise drop focus on <body>, making a keyboard user resume tabbing
 * from the top of the page (WCAG 2.4.3).
 */
export function useListboxKeyboard({
  isOpen,
  itemCount,
  selectedIndex,
  onClose,
  triggerRef,
  idPrefix,
}: UseListboxKeyboardOptions): UseListboxKeyboardResult {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  // Marks the open cycle as already seeded, so a re-render while the menu is
  // open (a changed selection, a filtered list) cannot yank focus back to the
  // starting option under the user.
  const seededRef = useRef<boolean>(false);

  const getOptionId = useCallback(
    (index: number): string => `${idPrefix}-option-${index}`,
    [idPrefix],
  );

  // Options are read out of the DOM rather than tracked in a ref array: the
  // list is rendered by the caller, so querying it is the one source that
  // cannot go stale when the caller re-orders or filters its options.
  const focusOption = useCallback((index: number): void => {
    listboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[index]?.focus();
  }, []);

  // Opening seeds the active option from the current selection and hands focus
  // to it. Closing resets, so the next open starts from the selection again.
  useEffect(() => {
    if (!isOpen) {
      seededRef.current = false;
      setActiveIndex(-1);
      return;
    }
    if (seededRef.current) return;
    seededRef.current = true;
    const start = selectedIndex >= 0 && selectedIndex < itemCount ? selectedIndex : 0;
    setActiveIndex(start);
    focusOption(start);
  }, [isOpen, selectedIndex, itemCount, focusOption]);

  // Keep the active option inside the rendered range. Without this a list that
  // shrinks (filtering, a shorter option set) would leave `activeIndex` past the
  // end, pointing `aria-activedescendant` at an id no longer in the DOM and
  // leaving no option tabbable.
  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex((current) => {
      if (current < 0) return current;
      if (itemCount === 0) return -1;
      return current > itemCount - 1 ? itemCount - 1 : current;
    });
  }, [isOpen, itemCount]);

  // Escape closes and returns focus to the trigger. Listening on the document
  // (rather than on the listbox) keeps this working even when focus has left the
  // menu while it is still open — the same placement the other popovers in this
  // app use.
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      onClose();
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose, triggerRef]);

  // Return focus to the trigger whenever the menu closes with focus still on
  // one of its own options — selecting with Enter unmounts the focused option,
  // which drops focus on <body>. An outside click is the case this must NOT
  // fight: it has already moved focus somewhere the user chose, so the trigger
  // only reclaims focus when nothing else holds it.
  useEffect(() => {
    if (!isOpen) return;
    // Captured at open time on purpose: the trigger is the tag button that owns
    // this menu and stays mounted for the whole open cycle, while `.current` read
    // from the cleanup is what react-hooks/exhaustive-deps (correctly) rejects.
    const trigger = triggerRef.current;
    return () => {
      const active = document.activeElement;
      if (!active || active === document.body) {
        trigger?.focus();
      }
    };
  }, [isOpen, triggerRef]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>): void => {
      if (itemCount === 0) return;
      let next: number;
      switch (event.key) {
        case "ArrowDown":
          next = activeIndex < itemCount - 1 ? activeIndex + 1 : itemCount - 1;
          break;
        case "ArrowUp":
          next = activeIndex > 0 ? activeIndex - 1 : 0;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = itemCount - 1;
          break;
        default:
          // Tab, Enter, Space and everything else fall through to the browser.
          return;
      }
      // Only for the four keys above: stop the page behind the open menu from
      // scrolling away under it.
      event.preventDefault();
      setActiveIndex(next);
      focusOption(next);
    },
    [activeIndex, itemCount, focusOption],
  );

  // Clamped so both the roving tabindex and `aria-activedescendant` always name
  // an option that is actually rendered.
  const rovingIndex = activeIndex >= 0 && activeIndex < itemCount ? activeIndex : 0;

  const getOptionProps = useCallback(
    (index: number) => ({
      id: getOptionId(index),
      tabIndex: index === rovingIndex ? 0 : -1,
    }),
    [getOptionId, rovingIndex],
  );

  return {
    listboxProps: {
      ref: listboxRef,
      "aria-activedescendant": itemCount > 0 ? getOptionId(rovingIndex) : undefined,
      onKeyDown,
    },
    getOptionProps,
  };
}
