import {useEffect, useRef} from 'react';

type EventHandler<T extends Event> = (event: T) => void;

/**
 * Hook to attach event listeners with automatic cleanup
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: EventHandler<WindowEventMap[K]>,
  element?: Window | null
): void;

export function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: EventHandler<HTMLElementEventMap[K]>,
  element: HTMLElement | null
): void;

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: EventHandler<DocumentEventMap[K]>,
  element: Document
): void;

export function useEventListener(
  eventName: string,
  handler: EventHandler<Event>,
  element?: Window | HTMLElement | Document | null
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = element ?? window;
    if (!targetElement || !targetElement.addEventListener) return;

    const eventListener: EventHandler<Event> = (event) => {
      savedHandler.current(event);
    };

    targetElement.addEventListener(eventName, eventListener);

    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}
