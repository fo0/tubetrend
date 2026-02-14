import {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowDown, ArrowUp} from 'lucide-react';

/**
 * A floating scroll button that appears based on scroll direction.
 * - Shows "scroll to top" when user scrolled down
 * - Shows "scroll to bottom" when user is near the top
 * - Very subtle/transparent, becomes visible on hover or mouse proximity
 * - Positioned center-right of the viewport
 */
export function FloatingScrollButton() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNearButton, setIsNearButton] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Track mouse proximity to button - 30% larger detection area for earlier visibility
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const buttonCenterY = rect.top + rect.height / 2;

      // Calculate distance from mouse to button center
      const distance = Math.sqrt(
          Math.pow(e.clientX - buttonCenterX, 2) +
          Math.pow(e.clientY - buttonCenterY, 2)
      );

      // Proximity threshold: button size * 3.5 (30% larger than before)
      // This makes the button appear earlier when mouse approaches
      const proximityThreshold = Math.max(rect.width, rect.height) * 3.5;

      setIsNearButton(distance < proximityThreshold);
    };

    window.addEventListener('mousemove', handleMouseMove, {passive: true});
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Track scroll direction and position
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
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
            setScrollDirection('down');
            setIsVisible(true);
          } else if (isNearBottom) {
            // At bottom: show "go to top" button
            setScrollDirection('up');
            setIsVisible(true);
          } else {
            // In the middle: show based on last scroll direction
            if (currentScrollY > lastScrollY) {
              // Scrolling down -> show "go to bottom"
              setScrollDirection('down');
            } else if (currentScrollY < lastScrollY) {
              // Scrolling up -> show "go to top"
              setScrollDirection('up');
            }
            setIsVisible(true);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, {passive: true});
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleClick = useCallback(() => {
    if (scrollDirection === 'up') {
      // Instant scroll to top
      window.scrollTo({top: 0, behavior: 'instant' as ScrollBehavior});
    } else {
      // Instant scroll to bottom
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'instant' as ScrollBehavior
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
        w-10 h-10
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
        transition-all duration-500 ease-out
        backdrop-blur-sm
        cursor-pointer
        ${isNearButton ? 'opacity-60 scale-105' : 'opacity-20'}
      `}
          title={scrollDirection === 'up' ? 'Scroll to top' : 'Scroll to bottom'}
          aria-label={scrollDirection === 'up' ? 'Scroll to top' : 'Scroll to bottom'}
      >
        {scrollDirection === 'up' ? (
            <ArrowUp className="w-5 h-5"/>
        ) : (
            <ArrowDown className="w-5 h-5"/>
        )}
      </button>
  );
}
