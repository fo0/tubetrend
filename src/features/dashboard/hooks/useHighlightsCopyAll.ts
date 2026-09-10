import { useEffect, useRef, useState } from "react";
import type { HighlightItem } from "../services/dashboardTopVideos";

/**
 * Bulk copy of every visible highlight URL. The analyser's results bar has
 * offered this for a while; the dashboard — the surface most users start on —
 * only had a per-card copy button, so collecting the day's highlights meant
 * one click per card. Same clipboard guard and transient icon feedback as
 * VideoCard / HighlightVideoCard, so a blocked clipboard is never a silent
 * no-op.
 */
export function useHighlightsCopyAll(highlightVideos: HighlightItem[]) {
  const [copiedAllHighlights, setCopiedAllHighlights] = useState(false);
  const [copyAllHighlightsFailed, setCopyAllHighlightsFailed] = useState(false);
  const copiedAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyAllFailedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedAllTimerRef.current) clearTimeout(copiedAllTimerRef.current);
      if (copyAllFailedTimerRef.current) clearTimeout(copyAllFailedTimerRef.current);
    };
  }, []);

  const flashCopyAllFailed = () => {
    setCopyAllHighlightsFailed(true);
    if (copyAllFailedTimerRef.current) clearTimeout(copyAllFailedTimerRef.current);
    copyAllFailedTimerRef.current = setTimeout(() => setCopyAllHighlightsFailed(false), 2500);
  };

  const handleCopyAllHighlights = () => {
    if (highlightVideos.length === 0) return;
    // navigator.clipboard is undefined in insecure contexts (HTTP, some
    // iframes); reading .writeText off it throws synchronously, which the
    // rejection handler below would not catch — guard the property first.
    if (!navigator.clipboard) {
      flashCopyAllFailed();
      return;
    }
    const urls = highlightVideos.map((item) => item.video.url).join("\n");
    navigator.clipboard.writeText(urls).then(
      () => {
        setCopiedAllHighlights(true);
        if (copiedAllTimerRef.current) clearTimeout(copiedAllTimerRef.current);
        copiedAllTimerRef.current = setTimeout(() => setCopiedAllHighlights(false), 1500);
      },
      () => {
        // Clipboard write rejected (permissions / focus) — surface it.
        flashCopyAllFailed();
      },
    );
  };

  return { copiedAllHighlights, copyAllHighlightsFailed, handleCopyAllHighlights };
}
