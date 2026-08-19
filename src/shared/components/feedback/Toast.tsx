import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEventBus } from "@/src/shared/lib/eventBus";
import type { ToastTone } from "./toastBus";

/** How long a toast stays on screen before it removes itself. */
const TOAST_TIMEOUT_MS = 5000;

interface ToastEntry {
  id: string;
  message: string;
  tone: ToastTone;
}

/**
 * Renders the stack of active toasts. Mount once, near the app root.
 *
 * Replaces `window.alert()` for informational feedback: the native dialog
 * blocks the whole page (and steals focus in the Electron / Android wrappers)
 * for a message the user only has to read. Destructive confirmations keep
 * using `window.confirm()` — there the interruption is the point.
 */
export function ToastHost() {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  // One timer per toast, so a second toast never cuts the first one short.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const handleToast = useCallback(
    (entry: ToastEntry) => {
      setToasts((prev) => [...prev, entry]);
      timersRef.current.set(
        entry.id,
        setTimeout(() => dismiss(entry.id), TOAST_TIMEOUT_MS),
      );
    },
    [dismiss],
  );
  useEventBus("toast", handleToast);

  // Drop every pending timer on unmount to avoid a setState after unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // The live region stays mounted even with no toasts. A `role="status"` element
  // that enters the DOM together with its text is announced unreliably — screen
  // readers only watch regions that already existed, so the first toast after a
  // quiet period was regularly swallowed. Empty it renders nothing visible, and
  // `pointer-events-none` keeps the zero-height container out of the click path
  // (each toast re-enables pointer events for its own dismiss button).
  return (
    <div
      // Polite live region: the message must reach assistive tech, but never
      // interrupt whatever the user is doing (unlike the alert it replaces).
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-xl border p-3 text-sm shadow-xl backdrop-blur-sm animate-fade-in ${
            toast.tone === "error"
              ? "border-red-500/30 bg-red-50/95 text-red-700 dark:border-red-500/30 dark:bg-red-950/90 dark:text-red-200"
              : "border-emerald-500/30 bg-emerald-50/95 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/90 dark:text-emerald-200"
          }`}
        >
          {toast.tone === "error" ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <p className="min-w-0 grow break-words">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            title={t("modal.close")}
            aria-label={t("modal.close")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
