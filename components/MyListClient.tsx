"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  Compass,
  Film,
  History,
  Info,
  Play,
  Search,
  Trash2,
  Tv,
  X,
} from "lucide-react";

import MediaCard from "@/components/MediaCard";
import { useOverlay } from "@/components/overlay/OverlayProvider";
import {
  useLibraryStore,
  type HistoryEntry,
  type LibraryEntry,
} from "@/lib/store/useLibraryStore";
import { useHydrated } from "@/lib/store/usePlayerStore";
import { tmdbImage } from "@/lib/tmdb-image";
import { buildMediaWatchUrl } from "@/lib/mediaRoute";
import type { MediaSummary, MediaType } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "watchlist" | "history" | "movies" | "series";

function toSummary(entry: LibraryEntry): MediaSummary {
  return {
    id: entry.id,
    mediaType: entry.mediaType,
    title: entry.title,
    overview: "",
    posterPath: entry.posterPath,
    backdropPath: entry.backdropPath,
    releaseDate: entry.releaseDate,
    voteAverage: entry.voteAverage,
    genreIds: entry.genreIds ?? [],
  };
}

function formatTimeLeft(pos: number, dur: number): string {
  if (!dur || dur <= 0) return "Resume";
  const remaining = Math.max(0, dur - pos);
  if (remaining < 60) return "Less than 1m left";
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (hours > 0) {
    return `${hours}hr ${minutes}m left`;
  }
  return `${minutes}m left`;
}

export default function MyListClient() {
  const hydrated = useHydrated();
  const watchlist = useLibraryStore((s) => s.watchlist);
  const history = useLibraryStore((s) => s.history);
  const clearWatchlist = useLibraryStore((s) => s.clearWatchlist);
  const clearHistory = useLibraryStore((s) => s.clearHistory);
  const removeFromHistory = useLibraryStore((s) => s.removeFromHistory);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState<"watchlist" | "history" | null>(null);

  // Filter items by search query
  const query = searchQuery.trim().toLowerCase();

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      const matchSearch = !query || item.title.toLowerCase().includes(query);
      if (!matchSearch) return false;
      if (activeTab === "movies") return item.mediaType === "movie";
      if (activeTab === "series") return item.mediaType === "tv";
      return true;
    });
  }, [watchlist, query, activeTab]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchSearch = !query || item.title.toLowerCase().includes(query);
      if (!matchSearch) return false;
      if (activeTab === "movies") return item.mediaType === "movie";
      if (activeTab === "series") return item.mediaType === "tv";
      return true;
    });
  }, [history, query, activeTab]);

  const totalItems = watchlist.length + history.length;
  const showHistorySection =
    (activeTab === "all" || activeTab === "history" || activeTab === "movies" || activeTab === "series") &&
    filteredHistory.length > 0;
  const showWatchlistSection =
    (activeTab === "all" || activeTab === "watchlist" || activeTab === "movies" || activeTab === "series") &&
    filteredWatchlist.length > 0;

  const isCompletelyEmpty = hydrated && totalItems === 0;
  const isFilteredEmpty = hydrated && !isCompletelyEmpty && !showHistorySection && !showWatchlistSection;

  return (
    <div className="mx-auto min-h-screen max-w-[1536px] px-4 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16 lg:pt-32">
      {/* Header Banner */}
      <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Library
            </h1>
            {hydrated && totalItems > 0 && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-label-sm font-semibold text-primary">
                {totalItems} {totalItems === 1 ? "Title" : "Titles"}
              </span>
            )}
          </div>
          <p className="mt-2 text-body-md text-white/60 max-w-xl">
            Your personal collection of bookmarked favorites, watchlists, and in-progress playback.
          </p>
        </div>

        {/* Quick Search inside Library */}
        {hydrated && totalItems > 0 && (
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your library…"
              className="w-full rounded-full border border-white/15 bg-white/[0.04] py-2.5 pl-10 pr-9 text-label-md text-white placeholder:text-white/40 backdrop-blur-md transition-colors duration-200 hover:border-white/30 focus:border-white/70 focus:bg-white/[0.08] outline-none !outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
              style={{ outline: "none", boxShadow: "none" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Filter Tabs & Section Controls */}
      {hydrated && totalItems > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <TabButton
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              label="All"
              count={totalItems}
            />
            <TabButton
              active={activeTab === "watchlist"}
              onClick={() => setActiveTab("watchlist")}
              label="Watchlist"
              count={watchlist.length}
            />
            <TabButton
              active={activeTab === "history"}
              onClick={() => setActiveTab("history")}
              label="In Progress"
              count={history.length}
            />
            <TabButton
              active={activeTab === "movies"}
              onClick={() => setActiveTab("movies")}
              label="Movies"
            />
            <TabButton
              active={activeTab === "series"}
              onClick={() => setActiveTab("series")}
              label="Series"
            />
          </div>

          {/* Clear Actions */}
          <div className="flex items-center gap-2">
            {activeTab !== "watchlist" && history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm("history")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-1.5 text-label-sm font-medium text-white/60 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="size-3.5" />
                Clear History
              </button>
            )}
            {activeTab !== "history" && watchlist.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm("watchlist")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-1.5 text-label-sm font-medium text-white/60 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="size-3.5" />
                Clear Watchlist
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-surface-lowest p-6 text-center shadow-2xl">
            <h3 className="text-title-lg font-bold text-white">
              Clear {showClearConfirm === "history" ? "Watch History" : "Watchlist"}?
            </h3>
            <p className="mt-2 text-label-md text-white/60">
              This will remove all your saved {showClearConfirm === "history" ? "in-progress resume points" : "bookmarked titles"}. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(null)}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-label-md font-semibold text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showClearConfirm === "history") clearHistory();
                  else clearWatchlist();
                  setShowClearConfirm(null);
                }}
                className="rounded-full bg-rose-600 px-5 py-2 text-label-md font-semibold text-white hover:bg-rose-500"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {!hydrated && (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-2/3 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      )}

      {/* Completely Empty State (Zero items anywhere in library) */}
      {isCompletelyEmpty && (
        <div className="relative mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 py-16 text-center shadow-2xl backdrop-blur-md sm:p-12">
          <div className="grid size-16 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-[0_0_24px_rgba(26,255,245,0.25)]">
            <Bookmark className="size-8" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Your Library is Waiting
          </h2>
          <p className="mt-2 text-body-md text-white/60 max-w-md">
            Save movies and TV series with the bookmark icon, or start watching any title to build your personal collection.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/movies"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-label-md font-bold text-on-primary transition-all hover:bg-primary-hover hover:scale-105 active:scale-95"
            >
              <Film className="size-4.5" />
              Explore Movies
            </Link>
            <Link
              href="/tv"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-label-md font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            >
              <Tv className="size-4.5" />
              Explore Series
            </Link>
            <Link
              href="/trending"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-5 py-3 text-label-md font-medium text-white/80 transition-all hover:text-white"
            >
              <Compass className="size-4.5 text-primary" />
              Trending Now
            </Link>
          </div>
        </div>
      )}

      {/* Filtered Empty State (Search or specific tab returned 0 results) */}
      {isFilteredEmpty && (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 py-14 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-white/5 text-white/40">
            {searchQuery ? <Search className="size-6" /> : <Bookmark className="size-6" />}
          </div>
          <h3 className="mt-4 text-title-lg font-bold text-white">
            {searchQuery ? "No Matches Found" : "No Titles in this Section"}
          </h3>
          <p className="mt-1.5 text-label-md text-white/50">
            {searchQuery
              ? `No saved titles match "${searchQuery}".`
              : "Try switching filter tabs or explore new titles to add."}
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-5 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-label-sm font-semibold text-white hover:bg-white/20"
            >
              Clear Search
            </button>
          ) : (
            <div className="mt-5 flex gap-3">
              <Link
                href="/movies"
                className="rounded-full bg-primary px-4 py-2 text-label-sm font-bold text-on-primary hover:bg-primary-hover"
              >
                Browse Movies
              </Link>
              <Link
                href="/tv"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-label-sm font-semibold text-white hover:bg-white/20"
              >
                Browse Series
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Main Content Sections */}
      {hydrated && !isCompletelyEmpty && (
        <div className="space-y-12">
          {/* Continue Watching Section */}
          {showHistorySection && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2.5 text-title-lg font-bold text-white">
                  <History className="size-5 text-primary" />
                  Continue Watching
                  <span className="text-label-sm font-normal text-white/45">
                    ({filteredHistory.length})
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredHistory.map((entry) => (
                  <HistoryLibraryCard
                    key={`${entry.mediaType}-${entry.id}`}
                    entry={entry}
                    onRemove={removeFromHistory}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Watchlist Section */}
          {showWatchlistSection && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2.5 text-title-lg font-bold text-white">
                  <Bookmark className="size-5 text-primary" />
                  Saved to Watchlist
                  <span className="text-label-sm font-normal text-white/45">
                    ({filteredWatchlist.length})
                  </span>
                </h2>
              </div>

              <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredWatchlist.map((item, i) => (
                  <li key={`${item.mediaType}-${item.id}`}>
                    <MediaCard media={toSummary(item)} priority={i < 10} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-sm font-semibold transition-all duration-200 cursor-pointer",
        active
          ? "bg-primary text-black shadow-[0_0_16px_rgba(26,255,245,0.35)] font-bold scale-[1.02]"
          : "border border-white/12 bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
            active ? "bg-black/20 text-black" : "bg-white/10 text-white/60",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function HistoryLibraryCard({
  entry,
  onRemove,
}: {
  entry: HistoryEntry;
  onRemove: (id: number, mediaType: MediaType) => void;
}) {
  const { openMedia } = useOverlay();
  const watchUrl = buildMediaWatchUrl(entry.mediaType, entry.id, entry.season, entry.episode);
  const imageSrc =
    tmdbImage(entry.backdropPath || entry.posterPath, "w780") ||
    tmdbImage(entry.posterPath, "w500");
  const pct = Math.min(100, Math.max(3, Math.round(entry.progress * 100)));
  const isTv = entry.mediaType === "tv";
  const timeLeftText = formatTimeLeft(entry.positionSeconds, entry.durationSeconds);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 transition-all duration-300 hover:border-white/25 hover:bg-white/[0.06] hover:shadow-[0_16px_36px_rgba(0,0,0,0.85)] hover:-translate-y-1">
      <Link href={watchUrl} className="block cursor-pointer focus-visible:outline-none">
        {/* Landscape Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-surface-lowest shadow-inner">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={entry.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-white/10 to-transparent font-semibold text-white/30">
              {entry.title}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/25" />

          {/* Top Bar on Artwork */}
          <div className="absolute inset-x-2.5 top-2.5 z-10 flex items-center justify-between">
            {isTv ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/65 px-2.5 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-md">
                S{entry.season || 1}:E{entry.episode || 1}
              </span>
            ) : (
              <span />
            )}

            {/* Top Right Quick Actions */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openMedia(entry.mediaType, entry.id, entry.season, entry.episode);
                }}
                title="View Details"
                aria-label={`View details for ${entry.title}`}
                className="grid size-7.5 place-items-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md hover:bg-black/90 active:scale-95"
              >
                <Info className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(entry.id, entry.mediaType);
                }}
                title="Remove from history"
                aria-label={`Remove ${entry.title} from history`}
                className="grid size-7.5 place-items-center rounded-full border border-white/15 bg-black/60 text-white/80 backdrop-blur-md hover:border-rose-500/40 hover:bg-rose-600 hover:text-white active:scale-95"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Center Play Button on hover */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-all duration-200 group-hover:opacity-100">
            <span className="grid size-11 place-items-center rounded-full border border-white/30 bg-black/65 text-white shadow-2xl backdrop-blur-md transition-all duration-200 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary group-hover:text-black">
              <Play className="size-5 translate-x-0.5 fill-current" />
            </span>
          </div>

          {/* Bottom Right Percentage */}
          <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-10">
            <span className="rounded-full border border-white/15 bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white/90 shadow-sm backdrop-blur-md">
              {pct}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div
              className="h-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Text Lockup */}
        <div className="mt-2.5 px-0.5">
          <h3 className="truncate text-label-md sm:text-label-lg font-bold text-white tracking-tight transition-colors group-hover:text-primary">
            {entry.title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-label-sm font-medium text-white/60">
            <Clock className="size-3 stroke-[2.5] text-white/50 shrink-0" />
            <span className="truncate">{timeLeftText}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
