import { safeRead, safeWrite } from '@/src/shared/lib/storage';
import { dispatchEvent } from '@/src/shared/lib/eventBus';
import { STORAGE_KEYS } from '@/src/shared/constants';

export interface HiddenHighlightMeta {
  readonly title?: string;
  readonly thumbnailUrl?: string;
  readonly channelTitle?: string;
}

export interface HiddenHighlightEntry {
  readonly sourceId: string;
  readonly videoId: string;
  readonly hiddenAt: number;
  readonly meta?: HiddenHighlightMeta;
}

export const hiddenHighlightsService = {
  list(): HiddenHighlightEntry[] {
    return safeRead<HiddenHighlightEntry[]>(STORAGE_KEYS.HIDDEN_HIGHLIGHTS, []);
  },

  isHidden(sourceId: string, videoId: string): boolean {
    const entries = this.list();
    return entries.some((e) => e.sourceId === sourceId && e.videoId === videoId);
  },

  hide(sourceId: string, videoId: string, meta?: HiddenHighlightMeta): void {
    const entries = this.list();
    if (this.isHidden(sourceId, videoId)) return;

    const next: HiddenHighlightEntry[] = [
      ...entries,
      {
        sourceId,
        videoId,
        hiddenAt: Date.now(),
        meta,
      },
    ];

    safeWrite(STORAGE_KEYS.HIDDEN_HIGHLIGHTS, next);
    dispatchEvent('hidden-highlights-changed');
  },

  unhide(sourceId: string, videoId: string): void {
    const entries = this.list();
    const next = entries.filter(
      (e) => !(e.sourceId === sourceId && e.videoId === videoId)
    );

    if (next.length !== entries.length) {
      safeWrite(STORAGE_KEYS.HIDDEN_HIGHLIGHTS, next);
      dispatchEvent('hidden-highlights-changed');
    }
  },

  remove(sourceId: string, videoId: string): void {
    this.unhide(sourceId, videoId);
  },

  clearAll(): void {
    safeWrite(STORAGE_KEYS.HIDDEN_HIGHLIGHTS, []);
    dispatchEvent('hidden-highlights-changed');
  },

  count(): number {
    return this.list().length;
  },
};
