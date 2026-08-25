/**
 * Type-safe event bus for cross-component communication
 */

import { useEffect } from "react";

// Event type definitions
export interface EventMap {
  "favorites-changed": undefined;
  "favorites-cache-updated": { id: string };
  "quota-updated": { used: number; limit: number; percentage: number; exhausted: boolean };
  "hidden-highlights-changed": undefined;
  "favorite-refresh-start": { id: string };
  "favorite-refresh-end": { id: string };
  "toggle-shortcuts-hint": undefined;
  toast: { id: string; message: string; tone: "success" | "error" };
}

type EventKey = keyof EventMap;
type EventPayload<K extends EventKey> = EventMap[K];
type EventCallback<K extends EventKey> =
  EventPayload<K> extends undefined ? () => void : (payload: EventPayload<K>) => void;

// Internal listener signature: payload can be undefined for void events.
// Stored uniformly so listeners for different keys share one Set type.
type AnyEventCallback = (payload?: unknown) => void;

class EventBus {
  private listeners = new Map<EventKey, Set<AnyEventCallback>>();

  on<K extends EventKey>(event: K, callback: EventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as AnyEventCallback);

    return () => this.off(event, callback);
  }

  off<K extends EventKey>(event: K, callback: EventCallback<K>): void {
    this.listeners.get(event)?.delete(callback as AnyEventCallback);
  }

  emit<K extends EventKey>(
    event: K,
    ...args: EventPayload<K> extends undefined ? [] : [EventPayload<K>]
  ): void {
    // The bus is the only delivery channel. A mirrored `window.dispatchEvent`
    // used to run alongside this loop for consumers still written as raw
    // `window.addEventListener`; all of those were migrated to `eventBus.on()`
    // / `useEventBus()`, leaving the mirror with no subscriber — it only
    // allocated a CustomEvent per emit on hot paths (`quota-updated` fires on
    // every API call, `favorites-cache-updated` on every favorite refresh) and
    // published internal names, `toast` among them, into the global DOM event
    // namespace where anything sharing the window can observe or forge them.
    // Do not reintroduce it: a new subscriber belongs on `eventBus.on()`,
    // which is the typed path.
    this.listeners.get(event)?.forEach((cb) => cb(args[0]));
  }
}

export const eventBus = new EventBus();

/**
 * React hook for subscribing to event bus events
 */
export function useEventBus<K extends EventKey>(event: K, callback: EventCallback<K>): void {
  useEffect(() => {
    return eventBus.on(event, callback);
  }, [event, callback]);
}

/**
 * Emit a bus event from outside a component (services, plain callbacks).
 * Thin alias for `eventBus.emit` — kept because it reads better at the call
 * sites that raise events from non-React code.
 */
export function dispatchEvent<K extends EventKey>(
  event: K,
  ...args: EventPayload<K> extends undefined ? [] : [EventPayload<K>]
): void {
  eventBus.emit(event, ...args);
}
