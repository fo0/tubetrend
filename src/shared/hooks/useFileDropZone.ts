import { useCallback, useRef, useState } from "react";
import type { DragEvent } from "react";

interface UseFileDropZoneOptions {
  /** Lower-case file extension the zone accepts, leading dot included (e.g. ".json"). */
  extension: string;
  /** Called with the first dropped file once it passes the extension check. */
  onFile: (file: File) => void;
  /** Called instead of `onFile` when the dropped file carries another extension. */
  onReject?: (file: File) => void;
  /** While true the zone ignores every drag event and never reports `isDragging`. */
  disabled?: boolean;
}

interface FileDropZone {
  /** True while a file drag is over the zone — render the drop hint from this. */
  isDragging: boolean;
  /** Spread onto the element that should accept the drop. */
  dropHandlers: {
    onDragEnter: (e: DragEvent<HTMLElement>) => void;
    onDragOver: (e: DragEvent<HTMLElement>) => void;
    onDragLeave: (e: DragEvent<HTMLElement>) => void;
    onDrop: (e: DragEvent<HTMLElement>) => void;
  };
}

/** True only for a drag that actually carries files, not a text or link drag. */
function carriesFiles(e: DragEvent<HTMLElement>): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

/**
 * Turn any element into a drop target for a single file of one extension.
 *
 * Two details make this worth a hook rather than four inline handlers:
 *
 * 1. `dragover` MUST call `preventDefault()`. Without it the browser keeps its
 *    default "not a drop target" answer, refuses the drop, and then navigates
 *    the tab to the dropped file — the app is gone and the user is looking at
 *    raw JSON.
 * 2. `dragenter` / `dragleave` fire again for every child element the pointer
 *    crosses, so a boolean flag flickers off the moment the drag moves from the
 *    container onto anything inside it. The depth counter below only clears the
 *    state once as many leaves as enters have arrived.
 */
export function useFileDropZone({
  extension,
  onFile,
  onReject,
  disabled = false,
}: UseFileDropZoneOptions): FileDropZone {
  const [isDragging, setIsDragging] = useState(false);
  // Nesting depth of the current drag (see the doc comment above). A ref, not
  // state: nothing renders from the count itself, only from the flag.
  const depthRef = useRef(0);

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled || !carriesFiles(e)) return;
      e.preventDefault();
      depthRef.current += 1;
      setIsDragging(true);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled || !carriesFiles(e)) return;
      e.preventDefault();
      // Show the "copy" cursor: the file is read, never moved or removed.
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const onDragLeave = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled || !carriesFiles(e)) return;
      e.preventDefault();
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setIsDragging(false);
    },
    [disabled],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled || !carriesFiles(e)) return;
      e.preventDefault();
      // A completed drop ends the gesture outright — no matching `dragleave`
      // arrives for the enters already counted, so reset instead of decrementing.
      depthRef.current = 0;
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(extension)) {
        onReject?.(file);
        return;
      }
      onFile(file);
    },
    [disabled, extension, onFile, onReject],
  );

  return { isDragging, dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
