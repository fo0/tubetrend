/**
 * Service für das Ausblenden von Highlight-Karten im Dashboard.
 * 
 * Speichert welche Karten (Kombination aus sourceId + videoId) ausgeblendet sind.
 * Wenn sich das Video für einen Kanal ändert (neue videoId), wird die Karte
 * automatisch wieder angezeigt.
 */

import {safeRead, safeWrite} from '@/src/shared/lib/storage';
import {dispatchEvent} from '@/src/shared/lib/eventBus';

const HIDDEN_HIGHLIGHTS_KEY = 'tt.dashboard.hiddenHighlights.v1';

export interface HiddenHighlight {
  sourceId: string;  // Favorit/Kanal-ID
  videoId: string;   // Video-ID zum Zeitpunkt des Ausblendens
  hiddenAt: number;  // Zeitstempel wann ausgeblendet wurde (für chronologische Sortierung)
  videoTitle?: string;  // Video-Titel für die Anzeige in der Liste
  thumbnailUrl?: string;  // Thumbnail-URL für die Anzeige in der Liste
  sourceLabel?: string;  // Kanal-/Favoritenname für die Anzeige in der Liste
}

// Keep old type names for backwards compatibility
export type HiddenHighlightEntry = HiddenHighlight;
export interface HiddenHighlightMeta {
  readonly title?: string;
  readonly thumbnailUrl?: string;
  readonly channelTitle?: string;
}

export const hiddenHighlightsService = {
  /**
   * Gibt alle ausgeblendeten Highlights zurück.
   * Alte Einträge ohne hiddenAt bekommen einen Default-Zeitstempel.
   */
  list(): HiddenHighlight[] {
    const raw = safeRead<any[]>(HIDDEN_HIGHLIGHTS_KEY, []);
    // Validierung: nur gültige Einträge behalten und alte Einträge migrieren
    return raw
      .filter(
        (item) =>
          typeof item?.sourceId === 'string' &&
          typeof item?.videoId === 'string' &&
          item.sourceId.length > 0 &&
          item.videoId.length > 0
      )
      .map((item): HiddenHighlight => ({
        sourceId: item.sourceId,
        videoId: item.videoId,
        hiddenAt: typeof item.hiddenAt === 'number' ? item.hiddenAt : 0,
        videoTitle: typeof item.videoTitle === 'string' ? item.videoTitle : undefined,
        thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : undefined,
        sourceLabel: typeof item.sourceLabel === 'string' ? item.sourceLabel : undefined,
      }));
  },

  /**
   * Gibt alle ausgeblendeten Highlights chronologisch sortiert zurück (neueste zuerst).
   */
  listChronological(): HiddenHighlight[] {
    return this.list().sort((a, b) => b.hiddenAt - a.hiddenAt);
  },

  /**
   * Blendet eine Highlight-Karte aus.
   * Speichert die Kombination aus sourceId (Kanal) und videoId (aktuelles Video).
   */
  hide(sourceId: string, videoId: string, meta?: { videoTitle?: string; thumbnailUrl?: string; sourceLabel?: string }): void {
    const list = this.list();
    const now = Date.now();
    // Prüfen ob bereits ausgeblendet (für diesen sourceId)
    const existingIdx = list.findIndex(h => h.sourceId === sourceId);
    if (existingIdx >= 0) {
      // Aktualisiere die videoId und Metadaten (falls sich das Video geändert hat und erneut ausgeblendet wird)
      list[existingIdx].videoId = videoId;
      list[existingIdx].hiddenAt = now;
      if (meta?.videoTitle) list[existingIdx].videoTitle = meta.videoTitle;
      if (meta?.thumbnailUrl) list[existingIdx].thumbnailUrl = meta.thumbnailUrl;
      if (meta?.sourceLabel) list[existingIdx].sourceLabel = meta.sourceLabel;
    } else {
      list.push({
        sourceId,
        videoId,
        hiddenAt: now,
        videoTitle: meta?.videoTitle,
        thumbnailUrl: meta?.thumbnailUrl,
        sourceLabel: meta?.sourceLabel,
      });
    }
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, list);
    dispatchEvent('hidden-highlights-changed');
  },

  /**
   * Zeigt eine ausgeblendete Highlight-Karte wieder an.
   */
  show(sourceId: string): void {
    const list = this.list().filter(h => h.sourceId !== sourceId);
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, list);
    dispatchEvent('hidden-highlights-changed');
  },

  /**
   * Alias for show() - for API compatibility
   */
  unhide(sourceId: string, _videoId?: string): void {
    this.show(sourceId);
  },

  /**
   * Alias for show() - for API compatibility
   */
  remove(sourceId: string, _videoId?: string): void {
    this.show(sourceId);
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
    dispatchEvent('hidden-highlights-changed');
  },

  /**
   * Returns the count of hidden highlights.
   */
  count(): number {
    return this.list().length;
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
