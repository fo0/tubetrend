import React, { useMemo } from "react";
import type { FavoriteConfig } from "@/src/features/favorites/types";
import { favoritesService } from "@/src/features/favorites";
import { SearchType } from "@/src/shared/types";

interface FavoriteAvatarProps {
  favorite: FavoriteConfig;
  isRefreshing?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  /**
   * Tab stop of the underlying button. Pass -1 to take it out of the tab order —
   * a strip of avatars managing a roving tab stop sets 0 on exactly one of them.
   * Left undefined the button keeps the browser default (a normal tab stop).
   */
  tabIndex?: number;
  /** Key handler on the button, for a container implementing arrow-key navigation. */
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
}

/**
 * Generates initials from a name/query string.
 * - Single word: First 2 characters (uppercase)
 * - Multiple words: First letter of first 2 words (uppercase)
 */
function getInitials(name: string): string {
  const cleaned = name.trim().replace(/^[@#]/, ""); // Remove @ or # prefix
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "??";

  if (words.length === 1) {
    // Single word: first 2 characters
    return words[0].substring(0, 2).toUpperCase();
  }

  // Multiple words: first letter of first 2 words
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generates a consistent color based on the string hash
 */
function getAvatarColor(str: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export const FavoriteAvatar: React.FC<FavoriteAvatarProps> = ({
  favorite,
  isRefreshing = false,
  onClick,
  size = "md",
  tabIndex,
  onKeyDown,
}) => {
  const cache = favoritesService.getCache(favorite.id);
  const channelTitle = cache?.meta?.channelTitle || favorite.query;

  const isKeyword = favorite.searchType === SearchType.KEYWORD;

  const initials = useMemo(() => getInitials(channelTitle), [channelTitle]);
  const bgColor = useMemo(() => getAvatarColor(favorite.query), [favorite.query]);

  // Avatar URL placeholder: direct YouTube avatar URLs require an additional
  // API call (not yet implemented). Initials are used as fallback for now.
  const avatarUrl = null;

  const sizeClasses = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";

  // Button needs same size as avatar for proper spinning border positioning
  const buttonSizeClasses = size === "sm" ? "w-7 h-7" : "w-9 h-9";

  // Spinning border thickness varies by size
  const spinnerClass =
    size === "sm" ? "avatar-spinning-border avatar-spinning-border-sm" : "avatar-spinning-border";

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      className={`relative shrink-0 group ${buttonSizeClasses} ${isRefreshing ? "avatar-loading-spin" : ""}`}
      title={channelTitle}
      aria-label={channelTitle}
    >
      {/* Avatar circle */}
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold text-white shadow-sm transition-transform group-hover:scale-110 ${
          avatarUrl ? "" : bgColor
        } ${isKeyword ? "ring-1 ring-indigo-400/50" : ""}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={channelTitle}
            className="w-full h-full rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="select-none">{initials}</span>
        )}
      </div>

      {/* Rotating green border when refreshing */}
      {isRefreshing && <div className={`absolute inset-0 rounded-full ${spinnerClass}`} />}
    </button>
  );
};
