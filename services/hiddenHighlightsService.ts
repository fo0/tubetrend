/**
 * Service für das Ausblenden von Highlight-Karten im Dashboard.
 * 
 * Speichert welche Karten (Kombination aus sourceId + videoId) ausgeblendet sind.
 * Wenn sich das Video für einen Kanal ändert (neue videoId), wird die Karte
 * automatisch wieder angezeigt.
 */

const HIDDEN_HIGHLIGHTS_KEY = 'tt.dashboard.hiddenHighlights.v1';
const HIDDEN_HIGHLIGHTS_CHANGED_EVENT = 'hidden-highlights-changed';

export interface HiddenHighlight {
  sourceId: string;  // Favorit/Kanal-ID
  videoId: string;   // Video-ID zum Zeitpunkt des Ausblendens
}

const safeRead = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
};

const safeWrite = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const dispatchHiddenHighlightsChanged = () => {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(HIDDEN_HIGHLIGHTS_CHANGED_EVENT));
    }
  } catch {
    // stiller Fallback
  }
};

export const hiddenHighlightsService = {
  /**
   * Gibt alle ausgeblendeten Highlights zurück.
   */
  list(): HiddenHighlight[] {
    const raw = safeRead<any[]>(HIDDEN_HIGHLIGHTS_KEY, []);
    // Validierung: nur gültige Einträge behalten
    return raw.filter(
      (item): item is HiddenHighlight =>
        typeof item?.sourceId === 'string' &&
        typeof item?.videoId === 'string' &&
        item.sourceId.length > 0 &&
        item.videoId.length > 0
    );
  },

  /**
   * Blendet eine Highlight-Karte aus.
   * Speichert die Kombination aus sourceId (Kanal) und videoId (aktuelles Video).
   */
  hide(sourceId: string, videoId: string): void {
    const list = this.list();
    // Prüfen ob bereits ausgeblendet (für diesen sourceId)
    const existingIdx = list.findIndex(h => h.sourceId === sourceId);
    if (existingIdx >= 0) {
      // Aktualisiere die videoId (falls sich das Video geändert hat und erneut ausgeblendet wird)
      list[existingIdx].videoId = videoId;
    } else {
      list.push({ sourceId, videoId });
    }
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, list);
    dispatchHiddenHighlightsChanged();
  },

  /**
   * Zeigt eine ausgeblendete Highlight-Karte wieder an.
   */
  show(sourceId: string): void {
    const list = this.list().filter(h => h.sourceId !== sourceId);
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, list);
    dispatchHiddenHighlightsChanged();
  },

  /**
   * Prüft ob eine Karte ausgeblendet ist.
   * Gibt true zurück, wenn die Karte ausgeblendet ist UND die videoId noch übereinstimmt.
   * Wenn die videoId sich geändert hat, wird der Eintrag automatisch entfernt und false zurückgegeben.
   */
  isHidden(sourceId: string, currentVideoId: string): boolean {
    const list = this.list();
    const entry = list.find(h => h.sourceId === sourceId);
    
    if (!entry) {
      return false;
    }
    
    // Wenn die videoId sich geändert hat, Eintrag entfernen und Karte wieder anzeigen
    if (entry.videoId !== currentVideoId) {
      this.show(sourceId);
      return false;
    }
    
    return true;
  },

  /**
   * Prüft ob für einen sourceId ein Eintrag existiert (unabhängig von der videoId).
   */
  hasEntry(sourceId: string): boolean {
    return this.list().some(h => h.sourceId === sourceId);
  },

  /**
   * Gibt die gespeicherte videoId für einen sourceId zurück, oder null wenn nicht vorhanden.
   */
  getHiddenVideoId(sourceId: string): string | null {
    const entry = this.list().find(h => h.sourceId === sourceId);
    return entry?.videoId ?? null;
  },

  /**
   * Entfernt alle ausgeblendeten Highlights.
   */
  clearAll(): void {
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, []);
    dispatchHiddenHighlightsChanged();
  },

  /**
   * Bereinigt veraltete Einträge für sourceIds, die nicht mehr in den Favoriten existieren.
   */
  cleanup(validSourceIds: string[]): void {
    const validSet = new Set(validSourceIds);
    const list = this.list().filter(h => validSet.has(h.sourceId));
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, list);
  }
};
