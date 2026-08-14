import { dispatchEvent } from "@/src/shared/lib/eventBus";

export type ToastTone = "success" | "error";

/**
 * Show a transient, non-blocking message.
 *
 * Routed through the typed event bus (not a React context) so plain callbacks
 * and services can raise a toast without being wrapped in a provider — the same
 * pattern the quota and favorites signals already use.
 *
 * Lives beside `Toast.tsx` rather than inside it so that module exports nothing
 * but its component and keeps its Fast Refresh state when edited.
 */
export function showToast(message: string, tone: ToastTone = "success"): void {
  if (!message) return;
  dispatchEvent("toast", {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    tone,
  });
}
