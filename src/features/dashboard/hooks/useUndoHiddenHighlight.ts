import { useCallback, useEffect, useRef, useState } from "react";
import { hiddenHighlightsService } from "../services/hiddenHighlightsService";

/**
 * How long the Undo for a hidden highlight stays offered. Longer than the 5s a
 * toast lives, because the action it walks back is permanent and the card that
 * vanished may not be what the eye was on.
 */
const UNDO_HIDE_WINDOW_MS = 10000;

export interface LastHiddenHighlight {
  videoId: string;
  title: string;
}

/**
 * Undo for the hide button on a highlight card.
 *
 * Hiding is one click on a card the pointer is already over, it takes effect
 * immediately, and it is permanent — the only way back was to notice the
 * "Hidden" button appear in the highlights toolbar, open the modal behind it,
 * find the entry among all the others and restore it. That is four steps to
 * walk back a mis-click, so the card that just disappeared leaves an Undo
 * behind it in the toolbar instead, where the eye is already looking.
 *
 * It expires after UNDO_HIDE_WINDOW_MS: an Undo button with no time limit
 * stays on screen pointing at an action from minutes ago, and the hidden list
 * remains the way back for anything older. Only the newest hide is offered —
 * a stack of undos in a toolbar is a worse control than the modal already is.
 */
export function useUndoHiddenHighlight() {
  const [lastHidden, setLastHidden] = useState<LastHiddenHighlight | null>(null);
  const undoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (undoHideTimerRef.current) clearTimeout(undoHideTimerRef.current);
    };
  }, []);

  const handleHideHighlight = useCallback(
    (
      sourceId: string,
      videoId: string,
      meta: { videoTitle: string; thumbnailUrl: string; sourceLabel: string },
    ) => {
      hiddenHighlightsService.hide(sourceId, videoId, meta);
      setLastHidden({ videoId, title: meta.videoTitle });
      if (undoHideTimerRef.current) clearTimeout(undoHideTimerRef.current);
      undoHideTimerRef.current = setTimeout(() => setLastHidden(null), UNDO_HIDE_WINDOW_MS);
    },
    [],
  );

  const handleUndoHide = useCallback(() => {
    if (!lastHidden) return;
    // show() drops the entry from the hidden list and raises
    // "hidden-highlights-changed", which is what brings the card back.
    hiddenHighlightsService.show(lastHidden.videoId);
    if (undoHideTimerRef.current) clearTimeout(undoHideTimerRef.current);
    setLastHidden(null);
  }, [lastHidden]);

  return { lastHidden, handleHideHighlight, handleUndoHide };
}
