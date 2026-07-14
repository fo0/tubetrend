/**
 * Browser download helpers.
 */

/**
 * Trigger a browser download of a Blob under the given filename.
 *
 * Creates a temporary object URL + anchor, clicks it, and revokes the URL on
 * the next tick. Throws if the DOM / URL APIs are unavailable (e.g. blocked
 * environments) so callers can surface a failure state.
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
