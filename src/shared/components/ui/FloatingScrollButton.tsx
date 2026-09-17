import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * A floating scroll button that appears based on scroll direction.
 * - Shows "scroll to top" when user scrolled down
 * - Shows "scroll to bottom" when user is near the top
 * - Very subtle/transparent, becomes visible on hover, mouse proximity or
 *   keyboard focus
 * - Positioned center-right of the viewport
 */
export function FloatingScrollButton() {
  const { t } = useTranslation();
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
  const [isVisible, setIsVisible] = useState(false);
  // Use a ref instead of state so the scroll handler can read the latest value
  // without being listed in the useEffect dep array (which caused the listener
  // to be removed and re-added on every scroll event).
  const lastScrollYRef = useRef(0);
  const [isNearButton, setIsNearButton] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Track mouse proximity to button - 30% larger detection area for earlier visibility
  //
  // The measurement is rAF-throttled (same `ticking` pattern as the scroll
  // handler below): mousemove fires far more often than the screen refreshes,
  // and getBoundingClientRect() forces a synchronous layout each time, so the
  // unthrottled version made every pointer move across the page pay for a
  // reflow. Coalescing to one measurement per frame keeps the last known
  // pointer position, so the proximity result is unchanged.
  useEffect(() => {
    let ticking = false;
    let pointerX = 0;
    let pointerY = 0;

    const measure = () => {
      ticking = false;
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const buttonCenterY = rect.top + rect.height / 2;

      // Calculate distance from mouse to button center
      const distance = Math.sqrt(
        Math.pow(pointerX - buttonCenterX, 2) + Math.pow(pointerY - buttonCenterY, 2),
      );

      // Proximity threshold: button size * 3.5 (30% larger than before)
      // This makes the button appear earlier when mouse approaches
      const proximityThreshold = Math.max(rect.width, rect.height) * 3.5;

      setIsNearButton(distance < proximityThreshold);
    };

    const handleMouseMove = (e: MouseEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Track scroll direction and position
  useEffect(() => {
    let ticking = false;

    const measureScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

          // Only show button if there's enough content to scroll
          if (maxScroll < 200) {
            setIsVisible(false);
            ticking = false;
            return;
          }

          // Determine visibility based on scroll position
          const isNearTop = currentScrollY < 100;
          const isNearBottom = currentScrollY > maxScroll - 100;

          if (isNearTop) {
            // At top: show "go to bottom" button
            setScrollDirection("down");
            setIsVisible(true);
          } else if (isNearBottom) {
            // At bottom: show "go to top" button
            setScrollDirection("up");
            setIsVisible(true);
          } else {
            // In the middle: show based on last scroll direction
            if (currentScrollY > lastScrollYRef.current) {
              // Scrolling down -> show "go to bottom"
              setScrollDirection("down");
            } else if (currentScrollY < lastScrollYRef.current) {
              // Scrolling up -> show "go to top"
              setScrollDirection("up");
            }
            setIsVisible(true);
          }

          lastScrollYRef.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial check
    measureScroll();

    window.addEventListener("scroll", measureScroll, { passive: true });

    // The measurement above depends on two things a scroll event does not
    // report: how tall the document is, and how tall the viewport is.
    //
    // Document height. `maxScroll < 200` hides the button, and at mount both
    // pages are short — the analyser shows the welcome screen until a search
    // resolves seconds later, a favorite row fills in once its YouTube fetch
    // returns. The page grows, but growing fires no scroll event, so the button
    // stayed hidden on exactly the long pages it exists for; the only way to
    // summon it was to scroll by hand first, which is the work it saves. The
    // reverse case is just as wrong: clearing the results leaves a "jump to
    // bottom" button pointing at a bottom that is gone.
    //
    // Viewport height. Rotating a phone or resizing a window changes
    // `window.innerHeight`, and with it whether the document scrolls at all.
    //
    // A `fixed` element is out of flow, so toggling this button cannot change
    // the document height that triggered the callback — no observer loop. The
    // shared handler stays rAF-throttled, so a resize storm still costs one
    // measurement per frame.
    window.addEventListener("resize", measureScroll, { passive: true });

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureScroll) : null;
    observer?.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", measureScroll);
      window.removeEventListener("resize", measureScroll);
      observer?.disconnect();
    };
  }, []);

  const handleClick = useCallback(() => {
    if (scrollDirection === "up") {
      // Instant scroll to top
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } else {
      // Instant scroll to bottom
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant" as ScrollBehavior,
      });
    }
  }, [scrollDirection]);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className={`
        fixed bottom-8 left-1/2 translate-x-[60%]
        z-40
        w-11 h-11
        flex items-center justify-center
        rounded-full
        bg-slate-200/30 dark:bg-slate-700/30
        border border-slate-300/20 dark:border-slate-600/20
        text-slate-400/40 dark:text-slate-500/40
        hover:opacity-100
        hover:bg-indigo-500/90 hover:dark:bg-indigo-600/90
        hover:text-white hover:dark:text-white
        hover:border-indigo-400/50 hover:dark:border-indigo-500/50
        hover:shadow-lg hover:shadow-indigo-500/20
        hover:scale-110
        focus-visible:opacity-100
        focus-visible:bg-indigo-500/90 dark:focus-visible:bg-indigo-600/90
        focus-visible:text-white dark:focus-visible:text-white
        focus-visible:border-indigo-400/50 dark:focus-visible:border-indigo-500/50
        focus-visible:shadow-lg focus-visible:shadow-indigo-500/20
        focus-visible:scale-110
        transition-all duration-500 ease-out
        backdrop-blur-sm
        cursor-pointer
        ${isNearButton ? "opacity-60 scale-105" : "opacity-20"}
      `}
      title={scrollDirection === "up" ? t("scroll.toTop") : t("scroll.toBottom")}
      aria-label={scrollDirection === "up" ? t("scroll.toTop") : t("scroll.toBottom")}
    >
      {scrollDirection === "up" ? (
        <ArrowUp className="w-5 h-5" />
      ) : (
        <ArrowDown className="w-5 h-5" />
      )}
    </button>
  );
}
