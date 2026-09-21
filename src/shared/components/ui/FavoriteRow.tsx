import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { FavoriteConfig } from "@/src/features/favorites";
import type { VideoData } from "@/src/features/videos";
import { SearchType } from "@/src/shared/types";
import type { TimeFrame, YouTubeVideoItem } from "@/src/shared/types";
import { favoritesService } from "@/src/features/favorites";
import { analyzeVideoStats } from "@/src/features/videos";
import {
  findChannelInfo,
  getApiKey,
  getChannelQueryType,
  getVideosFromChannel,
  searchVideosByKeyword,
  YouTubeApiError,
} from "@/src/features/youtube";
import { VideoCard } from "./VideoCard";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Hash,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Youtube } from "@/src/shared/components/ui/BrandIcons";
import { MAX_RESULTS_OPTIONS, TIME_FRAMES } from "@/src/shared/constants";
import { useTranslation } from "react-i18next";
import { useListboxKeyboard } from "@/src/shared/hooks";
import { dispatchEvent, eventBus } from "@/src/shared/lib/eventBus";
import { formatTimeAgo } from "@/src/shared/lib/formatters";
import { getLocale } from "@/src/shared/lib/locale";

interface FavoriteRowProps {
  favorite: FavoriteConfig;
  onRemove?: (id: string) => void;
  // Callback um diesen Favoriten im Analyser zu öffnen (mit Cache-Daten)
  onAnalyze?: (
    favorite: FavoriteConfig,
    cachedVideos: VideoData[] | null,
    channelTitle: string,
    channelId: string | null,
  ) => void;
  // Wird vom Dashboard erhöht, um alle Reihen neu zu laden
  globalRefreshToken?: number;
  // Optimierung: Index für gestaffelten Refresh (verhindert gleichzeitige API-Calls)
  staggerIndex?: number;
}

// Optimierung: Gestaffelter Refresh - Delay zwischen den Favorites (in ms)
const STAGGER_DELAY_MS = 300;

export const FavoriteRow: React.FC<FavoriteRowProps> = ({
  favorite,
  onRemove,
  onAnalyze,
  globalRefreshToken = 0,
  staggerIndex = 0,
}) => {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<VideoData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState<string>(favorite.query);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [totalInTimeFrame, setTotalInTimeFrame] = useState<number | null>(null);
  // Lokaler Refresh-Zähler für diese Reihe
  const [localRefreshToken, setLocalRefreshToken] = useState<number>(0);
  // Live-aktualisierter "vor X Min." Text
  const [liveTimeAgo, setLiveTimeAgo] = useState<string>("");

  // Lokale (änderbare) Konfiguration des Favoriten
  const [currentTimeFrame, setCurrentTimeFrame] = useState<TimeFrame>(favorite.timeFrame);
  const [currentMax, setCurrentMax] = useState<number>(favorite.maxResults);
  const [currentFavId, setCurrentFavId] = useState<string>(favorite.id);

  // Popover-UI State
  const [showTfMenu, setShowTfMenu] = useState<boolean>(false);
  const [showMaxMenu, setShowMaxMenu] = useState<boolean>(false);
  const tfButtonRef = useRef<HTMLButtonElement | null>(null);
  const maxButtonRef = useRef<HTMLButtonElement | null>(null);
  // Menü-Container Refs (für korrekte Outside-Click-Erkennung)
  const tfMenuRef = useRef<HTMLDivElement | null>(null);
  const maxMenuRef = useRef<HTMLDivElement | null>(null);

  // Vorherige Token, um zu erkennen, ob ein erzwungener Refresh nötig ist
  const prevGlobalTokenRef = useRef<number>(globalRefreshToken);
  const prevLocalTokenRef = useRef<number>(localRefreshToken);
  // Ref um zu tracken ob channelId bereits aus Cache/API gesetzt wurde (verhindert doppelte API-Calls)
  const channelIdLoadedRef = useRef<boolean>(false);
  // Ref um zu tracken ob refresh-start Event dispatched wurde (für cleanup)
  const dispatchedStartRef = useRef<boolean>(false);

  // Sync bei Prop-Wechsel (z.B. nach Seiten-Neuladen)
  useEffect(() => {
    setCurrentTimeFrame(favorite.timeFrame);
    setCurrentMax(favorite.maxResults);
    setCurrentFavId(favorite.id);
    // Reset channelId tracking wenn sich der Favorit ändert
    channelIdLoadedRef.current = false;
    // Deliberately keyed on the favorite identity only. currentTimeFrame/currentMax
    // are user-editable in this row's popovers; re-running on favorite.timeFrame /
    // favorite.maxResults would overwrite that local choice on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorite.id]);

  const displayMax = useMemo(() => {
    if (currentMax === -1) return t("maxResults.auto"); // Auto
    if (currentMax === 0) return t("maxResults.noLimit"); // Ohne Limit
    return t("maxResults.topN", { n: currentMax }); // Top X
  }, [currentMax, t]);

  const timeFrameLabel = (tf: TimeFrame): string => {
    const opt = TIME_FRAMES.find((o) => o.value === tf);
    return opt ? t(opt.labelKey) : String(tf);
  };

  // Letztes Cache-Datum ermitteln (für Anzeige "wie alt")
  const lastFetchedAt = useMemo(() => {
    const entry = favoritesService.getCache(currentFavId);
    return entry?.fetchedAt ?? null;
    // videos/loading/*RefreshToken are cache-busters, not inputs: getCache() is an
    // imperative localStorage read, so these mark the moments the cache entry can
    // have a new fetchedAt. Without them the "last fetched" label never updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFavId, videos, loading, globalRefreshToken, localRefreshToken]);

  // Zeige Warnung, wenn ausgewählte Top-X kleiner als Gesamtmenge im Zeitraum ist
  // Nur bei expliziten Limits (>0), nicht bei Auto (-1) oder Ohne Limit (0)
  // da der Video-Count Badge bereits die Gesamtzahl anzeigt
  const showOverflowWarning = useMemo(() => {
    if (!totalInTimeFrame) return false;
    if (currentMax <= 0) return false; // Auto (-1) oder Ohne Limit (0)
    return totalInTimeFrame > currentMax;
  }, [totalInTimeFrame, currentMax]);

  // Live-Update für "vor X Min." Badge (aktualisiert alle 10 Sekunden)
  useEffect(() => {
    if (!lastFetchedAt || loading) {
      setLiveTimeAgo("");
      return;
    }
    // Initiale Berechnung
    setLiveTimeAgo(formatTimeAgo(lastFetchedAt, t));
    // Intervall für Live-Updates
    const interval = setInterval(() => {
      setLiveTimeAgo(formatTimeAgo(lastFetchedAt, t));
    }, 10000); // alle 10 Sekunden aktualisieren
    return () => clearInterval(interval);
  }, [lastFetchedAt, loading, t]);

  // Reagiere auf externe Cache-Updates via typed event bus
  // (z.B. wenn ein anderer Prozess den Cache aktualisiert)
  useEffect(() => {
    return eventBus.on("favorites-cache-updated", ({ id: updatedId }) => {
      try {
        // Reagiere nur auf Updates für diesen Favoriten oder auf globale Updates ('*')
        if (updatedId && updatedId !== "*" && updatedId !== currentFavId) return;

        // Lade die Daten aus dem Cache neu
        const cached = favoritesService.getCache(currentFavId);
        if (cached) {
          setVideos(cached.videos);
          setTotalInTimeFrame(cached.meta?.totalInTimeFrame ?? null);
          if (cached.meta?.channelId) setChannelId(cached.meta.channelId);
          if (cached.meta?.channelTitle) setChannelTitle(cached.meta.channelTitle);
        }
      } catch {
        // stiller Fallback
      }
    });
  }, [currentFavId]);

  useEffect(() => {
    let cancelled = false;
    let staggerTimeout: ReturnType<typeof setTimeout> | null = null;
    let staggerReject: (() => void) | null = null;

    const load = async () => {
      setError(null);
      // Entscheiden, ob wir Cache ignorieren sollen (erzwungener Refresh)
      const isGlobalRefresh = prevGlobalTokenRef.current !== globalRefreshToken;
      const isLocalRefresh = prevLocalTokenRef.current !== localRefreshToken;
      const forced = isGlobalRefresh || isLocalRefresh;

      // Immer zuerst gecachte Daten anzeigen (auch wenn abgelaufen)
      // Das verhindert "Lädt..." bei abgelaufenem Cache
      const cached = favoritesService.getCache(currentFavId);
      if (cached) {
        if (!cancelled) setVideos(cached.videos);
        if (!cancelled) setTotalInTimeFrame(cached.meta?.totalInTimeFrame ?? null);
        if (!cancelled && cached.meta?.channelId) {
          setChannelId(cached.meta.channelId);
          channelIdLoadedRef.current = true;
        }
        if (!cancelled && cached.meta?.channelTitle) setChannelTitle(cached.meta.channelTitle);
      }

      // Cache verwenden, wenn frisch und kein erzwungener Refresh
      const cachedOk = favoritesService.isCacheValid(currentFavId);
      if (!forced && cachedOk && cached) {
        // Cache ist gültig, keine API-Calls nötig
        return;
      }

      // Nur "Lädt..." zeigen wenn keine gecachten Daten vorhanden
      if (!cached) {
        setLoading(true);
      }

      // Globales Event: Start des Refresh für diesen Favoriten
      // WICHTIG: Muss VOR dem Stagger-Delay gesendet werden, damit alle Icons
      // sofort die Lade-Animation zeigen beim "Alle aktualisieren"
      try {
        dispatchEvent("favorite-refresh-start", { id: currentFavId });
        dispatchedStartRef.current = true;
      } catch {
        // ignore
      }

      // Optimierung: Bei globalem Refresh gestaffelten Delay verwenden
      // um nicht alle API-Calls gleichzeitig zu starten
      if (isGlobalRefresh && staggerIndex > 0) {
        await new Promise<void>((resolve, reject) => {
          staggerTimeout = setTimeout(resolve, staggerIndex * STAGGER_DELAY_MS);
          // Speichere reject-Funktion für sauberes Cleanup
          staggerReject = reject;
        }).catch(() => {
          // Timeout wurde abgebrochen - Ende-Event wird im Cleanup gesendet
        });
        if (cancelled) return;
      }
      try {
        let apiVideos: YouTubeVideoItem[];
        let displayName: string;
        let fetchedChannelId: string | undefined;
        let totalInTimeFrame: number;

        const searchType = favorite.searchType ?? SearchType.CHANNEL;

        if (searchType === SearchType.KEYWORD) {
          // Keyword-Suche: Videos direkt nach Schlagwort suchen
          const result = await searchVideosByKeyword(
            favorite.query,
            currentTimeFrame as TimeFrame,
            currentMax,
            { favoriteId: currentFavId },
          );
          apiVideos = result.videos;
          totalInTimeFrame = result.totalInTimeFrame;
          displayName = favorite.query; // Bei Keyword-Suche zeigen wir das Keyword als "Name"
          fetchedChannelId = undefined;
        } else {
          // Kanal-Suche: Erst Kanal finden, dann Videos aus Uploads-Playlist
          const queryType = getChannelQueryType(favorite.query);
          const { id, name, uploadsPlaylistId } = await findChannelInfo(favorite.query, {
            favoriteId: currentFavId,
          });
          const result = await getVideosFromChannel(
            uploadsPlaylistId,
            currentTimeFrame as TimeFrame,
            currentMax,
            { name, favoriteId: currentFavId, favoriteType: queryType },
          );
          apiVideos = result.videos;
          totalInTimeFrame = result.totalInTimeFrame;
          displayName = name;
          fetchedChannelId = id;
        }

        if (!cancelled) setChannelTitle(displayName);
        if (!cancelled) {
          setChannelId(fetchedChannelId ?? null);
          if (fetchedChannelId) channelIdLoadedRef.current = true;
        }
        if (!cancelled) setTotalInTimeFrame(totalInTimeFrame);

        const analyzed = analyzeVideoStats(apiVideos);
        const top6 = analyzed.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);
        // Bestimme den höchsten Velocity-Wert (Views pro Stunde) über alle analysierten Videos
        const topVelocityVph =
          analyzed.length > 0
            ? analyzed.reduce((max, v) => {
                const vph =
                  typeof v.viewsPerHour === "number" && Number.isFinite(v.viewsPerHour)
                    ? v.viewsPerHour
                    : 0;
                return vph > max ? vph : max;
              }, 0)
            : 0;
        if (!cancelled) setVideos(top6);
        favoritesService.setCache(currentFavId, top6, {
          totalInTimeFrame,
          topVelocityVph,
          channelTitle: displayName,
          channelId: fetchedChannelId,
        });
      } catch (e: unknown) {
        if (!cancelled) {
          // Services carry an i18n descriptor instead of a ready-made sentence
          // (YouTubeApiError.i18n) — resolve it here so the row speaks the user's
          // language. Without this the dashboard rendered the raw developer text
          // ("YouTube API error: ...", "HTTP error: 503") for exactly the failures
          // the analyser already reports translated: useSearch runs the same
          // lookup, so one and the same outage read German on one page and
          // English on the other. The plain message stays the fallback for errors
          // from outside our own service layer.
          const message =
            e instanceof YouTubeApiError && e.i18n
              ? t(e.i18n.key, e.i18n.params)
              : e instanceof Error
                ? e.message
                : "";
          setError(message || t("errors.favoriteLoad"));
        }
      } finally {
        if (!cancelled) setLoading(false);
        // Globales Event: Ende des Refresh für diesen Favoriten (nur senden, wenn Start gesendet wurde)
        try {
          if (dispatchedStartRef.current) {
            dispatchEvent("favorite-refresh-end", { id: currentFavId });
            dispatchedStartRef.current = false;
          }
        } catch {
          // ignore
        }
      }
    };
    load();
    // Gesehene Tokens aktualisieren
    prevGlobalTokenRef.current = globalRefreshToken;
    prevLocalTokenRef.current = localRefreshToken;
    return () => {
      cancelled = true;
      if (staggerTimeout) {
        clearTimeout(staggerTimeout);
        // Reject das Promise damit es nicht hängen bleibt
        staggerReject?.();
      }
      // Cleanup: Wenn Start-Event gesendet wurde aber noch kein End-Event, sende es jetzt
      if (dispatchedStartRef.current) {
        try {
          dispatchEvent("favorite-refresh-end", { id: currentFavId });
        } catch {
          // ignore
        }
        dispatchedStartRef.current = false;
      }
    };
    // `t` is intentionally excluded: it is only used to format an error message,
    // but its identity changes on every language switch. Including it would
    // re-run the whole load — a real YouTube API request per row and per language
    // change — instead of just relabelling. See agent_docs/key-patterns.md.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentFavId,
    currentMax,
    favorite.query,
    favorite.searchType,
    currentTimeFrame,
    globalRefreshToken,
    localRefreshToken,
    staggerIndex,
  ]);

  // Sicherstellen, dass der Kanal-Titel klickbar ist – auch wenn wir nur Cache-Daten nutzen.
  // Falls keine channelId vorhanden ist, laden wir einmalig die Kanal-Metadaten (ID/Name).
  // Nur bei Channel-Suche relevant, nicht bei Keyword-Suche.
  // WICHTIG: Verwendet channelIdLoadedRef um Race Condition mit dem Haupt-useEffect zu vermeiden
  // (verhindert doppelten findChannelInfo() Aufruf)
  useEffect(() => {
    // Bei Keyword-Suche gibt es keinen Kanal
    const searchType = favorite.searchType ?? SearchType.CHANNEL;
    if (searchType === SearchType.KEYWORD) return;

    // Prüfen ob channelId bereits vom Haupt-useEffect geladen wurde/wird
    if (channelIdLoadedRef.current) return;
    if (channelId) return; // bereits vorhanden

    let cancelled = false;
    // Ohne API-Key kein Versuch, die Metadaten zu laden
    // (canonical accessor — window guard + storage error handling built in)
    const hasKey = !!getApiKey();
    if (!hasKey) return;

    // Kurze Verzögerung um dem Haupt-useEffect Zeit zu geben, Cache-Daten zu laden
    const timeout = setTimeout(async () => {
      // Nochmal prüfen ob inzwischen geladen
      if (channelIdLoadedRef.current || cancelled) return;

      try {
        const { id, name } = await findChannelInfo(favorite.query, { favoriteId: currentFavId });
        if (!cancelled) {
          setChannelId(id);
          setChannelTitle(name);
          channelIdLoadedRef.current = true;
        }
      } catch {
        // stiller Fallback – Link bleibt dann einfach deaktiviert
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // currentFavId is excluded on purpose: it is only forwarded as a cache key to
    // findChannelInfo() and always changes together with favorite.query/searchType
    // (both derive from the same favorite). Adding it makes this effect re-run on
    // the render where the id has synced but the query has not — a duplicate
    // channel lookup that costs YouTube quota.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorite.query, favorite.searchType, channelId]);

  const channelUrl = useMemo(() => {
    // Bei Keyword-Suche gibt es keinen Kanal-Link
    const searchType = favorite.searchType ?? SearchType.CHANNEL;
    if (searchType === SearchType.KEYWORD) return null;

    if (channelId) return `https://www.youtube.com/channel/${channelId}`;
    const q = (favorite.query || "").trim();
    if (q.startsWith("@")) return `https://www.youtube.com/${q}`;
    return null;
  }, [channelId, favorite.query, favorite.searchType]);

  // Bestimme ob es eine Keyword-Suche ist
  const isKeywordSearch = (favorite.searchType ?? SearchType.CHANNEL) === SearchType.KEYWORD;

  // Klick ausserhalb von Menüs schließt diese
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;

      if (showTfMenu) {
        const clickedTfButton = !!tfButtonRef.current && tfButtonRef.current.contains(target);
        const clickedTfMenu = !!tfMenuRef.current && tfMenuRef.current.contains(target);
        if (!clickedTfButton && !clickedTfMenu) {
          setShowTfMenu(false);
        }
      }

      if (showMaxMenu) {
        const clickedMaxButton = !!maxButtonRef.current && maxButtonRef.current.contains(target);
        const clickedMaxMenu = !!maxMenuRef.current && maxMenuRef.current.contains(target);
        if (!clickedMaxButton && !clickedMaxMenu) {
          setShowMaxMenu(false);
        }
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showTfMenu, showMaxMenu]);

  // Both tag menus are APG listboxes: arrow keys move the selection, Home/End
  // jump to the edges, Escape closes and hands focus back to the tag that opened
  // the menu. Escape used to live in a hand-rolled effect here; it now comes
  // from the shared hook together with the rest of the pattern, so the two menus
  // cannot drift apart. `useId` keeps the generated option ids unique across the
  // several FavoriteRows a dashboard renders at once.
  const rowId = useId();
  const closeTfMenu = useCallback(() => setShowTfMenu(false), []);
  const closeMaxMenu = useCallback(() => setShowMaxMenu(false), []);

  const tfListbox = useListboxKeyboard({
    isOpen: showTfMenu,
    itemCount: TIME_FRAMES.length,
    selectedIndex: TIME_FRAMES.findIndex((opt) => opt.value === currentTimeFrame),
    onClose: closeTfMenu,
    triggerRef: tfButtonRef,
    idPrefix: `${rowId}-timeframe`,
  });

  const maxListbox = useListboxKeyboard({
    isOpen: showMaxMenu,
    itemCount: MAX_RESULTS_OPTIONS.length,
    selectedIndex: MAX_RESULTS_OPTIONS.findIndex((opt) => opt.value === currentMax),
    onClose: closeMaxMenu,
    triggerRef: maxButtonRef,
    idPrefix: `${rowId}-maxresults`,
  });

  const handleChangeTimeFrame = (tf: TimeFrame) => {
    setShowTfMenu(false);
    if (tf === currentTimeFrame) return;
    const updated = favoritesService.update(currentFavId, { timeFrame: tf });
    if (updated) {
      setCurrentTimeFrame(updated.timeFrame);
      setCurrentMax(updated.maxResults);
      setCurrentFavId(updated.id);
      setLocalRefreshToken((v) => v + 1);
    }
  };

  const handleChangeMax = (value: number) => {
    setShowMaxMenu(false);
    if (value === currentMax) return;
    const updated = favoritesService.update(currentFavId, { maxResults: value });
    if (updated) {
      setCurrentTimeFrame(updated.timeFrame);
      setCurrentMax(updated.maxResults);
      setCurrentFavId(updated.id);
      setLocalRefreshToken((v) => v + 1);
    }
  };

  // Rename: the favorite's own display name, independent of the channel title
  // YouTube reports. `label` has been part of the stored favorite all along —
  // the alphabetical sort, the dashboard filter and the highlight cards' "jump
  // to favorite" label all read it — but nothing could ever set it, so a
  // dashboard of a dozen @handles could not be organised into the names their
  // owner thinks in ("Competitor A", "Client channel").
  //
  // Clearing the field removes the override and the row falls back to the
  // channel title, so the rename is never a one-way door.
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [labelDraft, setLabelDraft] = useState<string>("");
  const renameButtonRef = useRef<HTMLButtonElement | null>(null);
  // Set by the Enter / Escape handlers: both unmount the input, which fires a
  // blur that would otherwise run the commit a second time (and, after Escape,
  // save the very draft that was just discarded).
  const renameHandledRef = useRef<boolean>(false);

  const displayName = favorite.label?.trim() || channelTitle;

  const startRename = () => {
    // Seed from what is stored, not from the `favorite` prop. Clicking the
    // pencil while the field is already open commits on blur first, and the prop
    // still carries the pre-commit label at that moment — seeding from it would
    // reopen the editor on the old value and, one click elsewhere later, write
    // that stale value back over the rename just made.
    const stored = favoritesService.list().find((f) => f.id === currentFavId);
    setLabelDraft(stored?.label ?? favorite.label ?? "");
    setIsRenaming(true);
  };

  const commitRename = () => {
    setIsRenaming(false);
    const nextLabel = labelDraft.trim();
    if (nextLabel !== (favorite.label ?? "")) {
      favoritesService.setLabel(currentFavId, nextLabel);
    }
  };

  const cancelRename = () => {
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      renameHandledRef.current = true;
      commitRename();
      renameButtonRef.current?.focus();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      // Stop here: the row sits inside no dialog, but a bare Escape is also the
      // "clear the search box" gesture elsewhere — this one belongs to the field.
      e.stopPropagation();
      renameHandledRef.current = true;
      cancelRename();
      renameButtonRef.current?.focus();
    }
  };

  const handleRenameBlur = () => {
    if (renameHandledRef.current) {
      renameHandledRef.current = false;
      return;
    }
    commitRename();
  };

  // Evaluated once per render instead of twice. The identical expression sat in
  // both the `disabled` and the `className` of the Analyse button, and
  // `favoritesService.getCache()` re-reads localStorage, re-JSON-parses the whole
  // favorites-cache blob and re-validates every video URL in the entry on each
  // call — so every render of every dashboard row paid for two of them, including
  // on each keystroke in the favorites filter. Still guarded on `onAnalyze`, so a
  // row rendered without the action performs no cache read at all, exactly as
  // before.
  const analyzeDisabled = onAnalyze
    ? loading || (!videos && !favoritesService.getCache(currentFavId))
    : false;

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <input
              type="text"
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameBlur}
              maxLength={60}
              // The channel title as placeholder: it is what an empty field
              // falls back to, so the placeholder states the outcome instead of
              // an instruction.
              placeholder={channelTitle}
              aria-label={t("favorites.renameLabel")}
              title={t("favorites.renameHint")}
              className="text-lg font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-0.5 w-56 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
            />
          ) : (
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {isKeywordSearch ? (
                // Keyword-Suche: Hash-Icon, kein Link
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                  {displayName}
                </span>
              ) : channelUrl ? (
                // Kanal-Suche mit Link. The `title` keeps naming the channel
                // itself — under a custom label it is the only place the real
                // channel name still shows.
                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 hover:underline underline-offset-2"
                  title={t("results.openChannelTitle", { channel: channelTitle })}
                >
                  <Youtube className="w-4 h-4" aria-hidden="true" />
                  {displayName}
                </a>
              ) : (
                // Kanal-Suche ohne Link (noch kein channelId)
                <span className="inline-flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-500" aria-hidden="true" />
                  {displayName}
                </span>
              )}
            </h3>
          )}
          {/* Rename trigger. Stays mounted while the field is open so Enter and
              Escape have somewhere to hand focus back to (WCAG 2.4.3) instead of
              dropping it on <body> when the input unmounts. */}
          <button
            ref={renameButtonRef}
            type="button"
            onClick={startRename}
            className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t("favorites.rename")}
            aria-label={t("favorites.renameAria", { name: displayName })}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 relative z-40">
            {/* Timeframe Tag als Button */}
            <button
              ref={tfButtonRef}
              type="button"
              onClick={() => {
                setShowTfMenu((v) => !v);
                setShowMaxMenu(false);
              }}
              aria-expanded={showTfMenu}
              aria-haspopup="listbox"
              aria-label={t("favorites.changeTimeFrame")}
              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
              title={t("favorites.changeTimeFrame")}
            >
              {timeFrameLabel(currentTimeFrame)}
            </button>
            {showTfMenu && (
              <div
                ref={tfMenuRef}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute z-50 mt-2 left-0 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-1"
              >
                <div
                  className="max-h-60 overflow-auto"
                  role="listbox"
                  aria-label={t("favorites.changeTimeFrame")}
                  {...tfListbox.listboxProps}
                >
                  {TIME_FRAMES.map((opt, index) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={opt.value === currentTimeFrame}
                      {...tfListbox.getOptionProps(index)}
                      onClick={() => handleChangeTimeFrame(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${opt.value === currentTimeFrame ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Max Results Tag als Button */}
            <button
              ref={maxButtonRef}
              type="button"
              onClick={() => {
                setShowMaxMenu((v) => !v);
                setShowTfMenu(false);
              }}
              aria-expanded={showMaxMenu}
              aria-haspopup="listbox"
              aria-label={t("favorites.changeMaxResults")}
              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
              title={t("favorites.changeMaxResults")}
            >
              {displayMax}
            </button>
            {showOverflowWarning && (
              <span
                className="inline-flex items-center gap-1 text-yellow-500 dark:text-yellow-400"
                title={t("favorites.overflowWarning", {
                  total: totalInTimeFrame,
                  shown: currentMax,
                })}
              >
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">
                  {t("favorites.overflowWarning", { total: totalInTimeFrame, shown: currentMax })}
                </span>
              </span>
            )}
            {showMaxMenu && (
              <div
                ref={maxMenuRef}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute z-50 mt-2 left-44 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-1"
              >
                <div
                  className="max-h-60 overflow-auto"
                  role="listbox"
                  aria-label={t("favorites.changeMaxResults")}
                  {...maxListbox.listboxProps}
                >
                  {MAX_RESULTS_OPTIONS.map((opt, index) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={opt.value === currentMax}
                      {...maxListbox.getOptionProps(index)}
                      onClick={() => handleChangeMax(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${opt.value === currentMax ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                    >
                      {t(opt.labelKey, opt.n ? { n: opt.n } : undefined)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <span
              className="px-2 py-0.5 rounded-full bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              // getLocale(), not the browser default: the badge next to it
              // ("as of 5 min ago") follows the chosen UI language, so an exact
              // timestamp in a different locale is a jarring mismatch. Same
              // helper AnalyserPage and HiddenHighlightsModal already use.
              title={
                lastFetchedAt ? new Date(lastFetchedAt).toLocaleString(getLocale()) : undefined
              }
            >
              {loading
                ? t("favorites.status.refreshing")
                : lastFetchedAt && liveTimeAgo
                  ? t("favorites.status.asOf", { time: liveTimeAgo })
                  : t("favorites.status.asOfUnknown")}
            </span>
            {!loading && totalInTimeFrame !== null && totalInTimeFrame > 0 && (
              <span
                className="px-2 py-0.5 rounded-full bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                title={t("favorites.status.videoCount", { count: totalInTimeFrame })}
              >
                {t("favorites.status.videoCount", { count: totalInTimeFrame })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Analyse-Button: Wechselt zum Analyser mit Cache-Daten */}
          {onAnalyze && (
            <button
              type="button"
              onClick={() => {
                // Alle verfügbaren Videos aus dem Cache holen (nicht nur die gecachten Top 6)
                const cached = favoritesService.getCache(currentFavId);
                onAnalyze(
                  {
                    ...favorite,
                    id: currentFavId,
                    timeFrame: currentTimeFrame,
                    maxResults: currentMax,
                  },
                  cached?.videos ?? videos,
                  channelTitle,
                  channelId,
                );
              }}
              disabled={analyzeDisabled}
              className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                analyzeDisabled
                  ? "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  : "border-indigo-500/30 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10"
              }`}
              title={t("favorites.analyze")}
            >
              <BarChart3 className="w-3 h-3" /> {t("actions.analyze")}
            </button>
          )}

          <button
            type="button"
            onClick={() => setLocalRefreshToken((v) => v + 1)}
            disabled={loading}
            className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
              loading
                ? "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={t("favorites.refresh")}
            aria-label={t("favorites.refresh")}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />{" "}
            {t("actions.refresh")}
          </button>

          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove?.(currentFavId)}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-red-500/30 text-red-400 dark:text-red-300 hover:bg-red-500/10 transition-colors"
              title={t("favorites.remove")}
              aria-label={t("favorites.remove")}
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" /> {t("actions.remove")}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-wrap items-center gap-3 text-red-500 dark:text-red-200"
        >
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 grow">{error}</span>
          {/* One-click recovery, the counterpart of the analyser's error banner.
              The row's own Refresh button does the same thing, but it sits in
              the header among five other controls and reads as "fetch again",
              not as "answer to this failure" — and on a dashboard of a dozen
              rows the failing one is not necessarily the one under the cursor.
              Bumping the local token re-runs exactly the load that failed.
              Disabled while a run is in flight so a second fetch cannot be
              queued behind the one already reporting. */}
          <button
            type="button"
            onClick={() => setLocalRefreshToken((v) => v + 1)}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-sm font-medium transition-colors hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t("favorites.refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{t("errors.tryAgain")}</span>
          </button>
        </div>
      )}

      {/* No `!error` guard: the cached videos are loaded before the request is
          even sent and are still the last good data for this favorite, so a
          transient failure (a 5xx, a dropped connection, a spent quota) used to
          blank a row that had perfectly readable content a second earlier —
          across every row at once on "Refresh all". The banner above now
          explains the failure and the cards below stay, with the header's
          "as of <time>" badge already stating how old they are. */}
      {!loading && videos && videos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {videos.map((video) => {
            const isFresh =
              typeof video?.publishedTimestamp === "number" &&
              Date.now() - video.publishedTimestamp < 24 * 60 * 60 * 1000;
            return (
              <div key={video.id} className={isFresh ? "fresh-green-border rounded-xl" : ""}>
                <VideoCard video={video} />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state: favorite loaded successfully but has no videos in the
          selected time frame — previously this rendered a blank grid with no
          explanation. */}
      {!loading && !error && videos && videos.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-500 dark:text-slate-400">
          {t("favorites.noVideosInTimeFrame")}
        </div>
      )}
    </section>
  );
};
