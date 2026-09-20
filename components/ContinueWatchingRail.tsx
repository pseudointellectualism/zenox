"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Pencil,
  Play,
  X,
} from "lucide-react";
import { useOverlay } from "@/components/overlay/OverlayProvider";
import {
  useIsInWatchlist,
  useLibraryStore,
  type HistoryEntry,
} from "@/lib/store/useLibraryStore";
import { useHydrated } from "@/lib/store/usePlayerStore";
import { tmdbImage } from "@/lib/tmdb-image";
import { buildMediaWatchUrl } from "@/lib/mediaRoute";
import type { MediaSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

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

interface ContinueWatchingCardProps {
  entry: HistoryEntry;
  isEditing: boolean;
  onRemove: (id: number, mediaType: HistoryEntry["mediaType"]) => void;
}

function ContinueWatchingCard({ entry, isEditing, onRemove }: ContinueWatchingCardProps) {
  const { openMedia } = useOverlay();
  const isInWatchlist = useIsInWatchlist(entry.id, entry.mediaType);
  const toggleWatchlist = useLibraryStore((s) => s.toggleWatchlist);

  const watchUrl = buildMediaWatchUrl(
    entry.mediaType,
    entry.id,
    entry.season,
    entry.episode,
  );
  const imageSrc =
    tmdbImage(entry.backdropPath || entry.posterPath, "w780") ||
    tmdbImage(entry.posterPath, "w500");
  const pct = Math.min(100, Math.max(3, Math.round(entry.progress * 100)));
  const isTv = entry.mediaType === "tv";
  const timeLeftText = formatTimeLeft(entry.positionSeconds, entry.durationSeconds);

  return (
    <li className="w-[250px] sm:w-[290px] lg:w-[330px] shrink-0 group relative select-none">
      <Link
        href={isEditing ? "#" : watchUrl}
        onClick={(e) => {
          if (isEditing) e.preventDefault();
        }}
        className={cn(
          "block focus-visible:outline-none",
          isEditing ? "cursor-default pointer-events-none" : "cursor-pointer",
        )}
      >
        {/* 16:9 Landscape Artwork Container */}
        <div
          className={cn(
            "relative aspect-video w-full overflow-hidden rounded-2xl border bg-surface-lowest shadow-md transition-all duration-300",
            isEditing
              ? "border-white/15 ring-2 ring-rose-500/30"
              : "border-white/10 group-hover:scale-[1.02] group-hover:border-primary/50 group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.85)]",
          )}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={entry.title}
              fill
              sizes="(max-width: 640px) 250px, (max-width: 1024px) 290px, 330px"
              className={cn(
                "object-cover transition-transform duration-500 ease-out",
                !isEditing && "group-hover:scale-105",
              )}
            />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-white/10 to-transparent font-semibold text-white/30">
              {entry.title}
            </div>
          )}

          {/* Gradient Scrims for depth */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/25" />

          {/* Top Bar on Artwork */}
          <div className="absolute inset-x-2.5 top-2.5 z-10 flex items-center justify-between">
            {/* Media / Episode Tag (TV Series only) */}
            {isTv ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/65 px-2.5 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-md shadow-sm">
                S{entry.season || 1}:E{entry.episode || 1}
              </span>
            ) : (
              <span />
            )}

            {/* Quick Action Buttons (Favorite + Details) - only show on card hover */}
            {!isEditing && (
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                {/* Favorite / Bookmark */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWatchlist(entry as unknown as MediaSummary);
                  }}
                  title={isInWatchlist ? "Remove from My List" : "Add to My List"}
                  aria-label={isInWatchlist ? "Remove from My List" : "Add to My List"}
                  className="grid size-8 place-items-center rounded-full border border-white/15 bg-black/55 backdrop-blur-sm text-white transition-all duration-200 hover:border-white/30 hover:bg-black/75 active:scale-95 cursor-pointer"
                >
                  {isInWatchlist ? (
                    <BookmarkCheck className="size-4 text-white" />
                  ) : (
                    <Bookmark className="size-4" />
                  )}
                </button>

                {/* Details Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openMedia(entry.mediaType, entry.id, entry.season, entry.episode);
                  }}
                  title="View Details"
                  aria-label={`View details for ${entry.title}`}
                  className="grid size-8 place-items-center rounded-full border border-white/15 bg-black/55 backdrop-blur-sm text-white transition-all duration-200 hover:border-white/30 hover:bg-black/75 active:scale-95 cursor-pointer"
                >
                  <Info className="size-4" />
                </button>
              </div>
            )}
          </div>

          {/* Center Play Button on hover */}
          {!isEditing && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-all duration-200 group-hover:opacity-100">
              <span className="grid size-11 sm:size-12 place-items-center rounded-full border border-white/30 bg-black/65 text-white shadow-2xl backdrop-blur-md transition-all duration-200 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary group-hover:text-black">
                <Play className="size-5 sm:size-5.5 translate-x-0.5 fill-current" />
              </span>
            </div>
          )}

          {/* Bottom Right Percentage Badge in smooth UI font */}
          <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-10">
            <span className="rounded-full border border-white/15 bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white/90 shadow-sm backdrop-blur-md">
              {pct}%
            </span>
          </div>

          {/* Glowing Progress Bar at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1 sm:h-1.2 bg-white/20 overflow-hidden">
            <div
              className="h-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Text Lockup Below Thumbnail */}
        <div className="mt-2.5 px-0.5">
          <h3
            className={cn(
              "truncate text-label-md sm:text-label-lg font-bold text-white tracking-tight transition-colors",
              !isEditing && "group-hover:text-primary",
            )}
          >
            {entry.title}
          </h3>

          <div className="mt-1 flex items-center gap-1.5 text-label-sm font-medium text-white/60">
            <Clock className="size-3 stroke-[2.5] text-white/50 shrink-0" />
            <span className="truncate">{timeLeftText}</span>
          </div>
        </div>
      </Link>

      {/* Delete button in Edit mode */}
      {isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(entry.id, entry.mediaType);
          }}
          aria-label={`Remove ${entry.title} from continue watching`}
          title="Remove from continue watching"
          className="absolute top-2.5 right-2.5 z-30 grid size-8 place-items-center rounded-full border border-white/40 bg-rose-600 text-white shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-rose-500 active:scale-95 cursor-pointer"
        >
          <X className="size-4 stroke-[2.5]" />
        </button>
      )}
    </li>
  );
}

export default function ContinueWatchingRail() {
  const hydrated = useHydrated();
  const history = useLibraryStore((s) => s.history);
  const removeFromHistory = useLibraryStore((s) => s.removeFromHistory);

  const [isEditing, setIsEditing] = useState(false);
  const railRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Only show unfinished titles with saved position
  const activeItems = history.filter(
    (item) => item.progress < 0.95 && (item.positionSeconds > 5 || item.durationSeconds > 0),
  );

  const checkScroll = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    if (!hydrated || activeItems.length === 0) return;
    checkScroll();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [hydrated, activeItems.length, checkScroll]);

  const scrollBy = (direction: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75 * direction;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Only pop up if there are active continue watching titles
  if (!hydrated || activeItems.length === 0) {
    return null;
  }

  return (
    <section className="relative pt-2 pb-6 sm:pt-4 sm:pb-8">
      {/* Header */}
      <div className="mb-3.5 flex items-center justify-between w-full px-4 sm:px-8 md:px-12 lg:px-16">
        <h2 className="text-headline-md text-white font-bold tracking-tight">
          Continue Watching
        </h2>

        {/* Edit / Manage button */}
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          aria-label={isEditing ? "Finish editing continue watching" : "Edit continue watching list"}
          title={isEditing ? "Done" : "Manage continue watching"}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-sm font-semibold transition-all duration-200 active:scale-95 cursor-pointer",
            isEditing
              ? "bg-primary text-black shadow-[0_0_12px_rgba(26,255,245,0.4)]"
              : "bg-white/8 text-white/70 hover:bg-white/15 hover:text-white",
          )}
        >
          <Pencil className="size-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">{isEditing ? "Done" : "Edit"}</span>
        </button>
      </div>

      {/* Rail Container */}
      <div className="group/rail relative w-full">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="absolute left-2 sm:left-4 top-[38%] -translate-y-1/2 z-30 hidden sm:grid size-11 place-items-center rounded-full bg-black/75 border border-white/20 text-white backdrop-blur-md shadow-xl transition-all hover:bg-black/95 hover:border-white/40 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="size-6 stroke-[2.5]" />
          </button>
        )}

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="absolute right-2 sm:right-4 top-[38%] -translate-y-1/2 z-30 hidden sm:grid size-11 place-items-center rounded-full bg-black/75 border border-white/20 text-white backdrop-blur-md shadow-xl transition-all hover:bg-black/95 hover:border-white/40 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="size-6 stroke-[2.5]" />
          </button>
        )}

        {/* Horizontal List */}
        <ul
          ref={railRef}
          className="rail rail-hide flex w-full gap-3 sm:gap-5 overflow-x-auto px-4 sm:px-8 md:px-12 lg:px-16 pb-3 pt-1 scroll-smooth"
        >
          {activeItems.map((entry) => (
            <ContinueWatchingCard
              key={`${entry.mediaType}-${entry.id}`}
              entry={entry}
              isEditing={isEditing}
              onRemove={removeFromHistory}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
