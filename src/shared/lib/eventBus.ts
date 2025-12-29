/**
 * Type-safe event bus for cross-component communication
 */

import {useEffect} from 'react';

// Event type definitions
export interface EventMap {
  'favorites-changed': undefined;
  'favorites-cache-updated': { id: string };
  'quota-updated': { used: number; limit: number; percentage: number; exhausted: boolean };
  'hidden-highlights-changed': undefined;
  'favorite-refresh-start': { id: string };
  'favorite-refresh-end': { id: string };
}

type EventKey = keyof EventMap;
type EventPayload<K extends EventKey> = EventMap[K];
type EventCallback<K extends EventKey> = EventPayload<K> extends undefined
  ? () => void
  : (payload: EventPayload<K>) => void;

class EventBus {
  private listeners = new Map<EventKey, Set<EventCallback<any>>>();

  on<K extends EventKey>(event: K, callback: EventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => this.off(event, callback);
  }

  off<K extends EventKey>(event: K, callback: EventCallback<K>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<K extends EventKey>(
    event: K,
    ...args: EventPayload<K> extends undefined ? [] : [EventPayload<K>]
  ): void {
    this.listeners.get(event)?.forEach((cb) => cb(args[0]));

    // Also dispatch a DOM event for backward compatibility
    if (typeof window !== 'undefined') {
      try {
        const detail = args[0] ?? undefined;
        window.dispatchEvent(new CustomEvent(event, { detail }));
      } catch {
        // Ignore
      }
    }
  }
}

export const eventBus = new EventBus();

/**
 * React hook for subscribing to event bus events
 */
export function useEventBus<K extends EventKey>(
  event: K,
  callback: EventCallback<K>
): void {
  useEffect(() => {
    return eventBus.on(event, callback);
  }, [event, callback]);
}

/**
 * Backward-compatible emit function that uses both eventBus and window events
 */
export function dispatchEvent<K extends EventKey>(
  event: K,
  ...args: EventPayload<K> extends undefined ? [] : [EventPayload<K>]
): void {
  eventBus.emit(event, ...args);
}
