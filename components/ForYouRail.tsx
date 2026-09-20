"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Film, Tv } from "lucide-react";

import MediaRow from "@/components/MediaRow";
import { useLibraryStore, type HistoryEntry } from "@/lib/store/useLibraryStore";
import { useHydrated } from "@/lib/store/usePlayerStore";
import { tmdbImage } from "@/lib/tmdb-image";
import type { MediaSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Taste model & Title-anchored recommendations.
 *
 * Anchored to a specific watched title that the viewer can change via dropdown,
 * falling back to blended genre affinity or trending when cold starting.
 */
const HALF_LIFE_DAYS = 30;
const WATCHLIST_WEIGHT = 0.4;

export default function ForYouRail() {
  const hydrated = useHydrated();
  const history = useLibraryStore((s) => s.history);
  const watchlist = useLibraryStore((s) => s.watchlist);
  const [items, setItems] = useState<MediaSummary[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Deduplicate history items by id so each watched title appears only once in the dropdown
  const uniqueHistory = useMemo(() => {
    const seen = new Set<string>();
    const out: HistoryEntry[] = [];
    for (const entry of history) {
      const k = `${entry.mediaType}:${entry.id}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(entry);
      }
    }
    return out.slice(0, 15);
  }, [history]);

  // Keep selectedEntry in sync with history
  useEffect(() => {
    if (!hydrated) return;
    if (uniqueHistory.length === 0) {
      setSelectedEntry(null);
      return;
    }
    // If we haven't selected anything yet, or our selection was deleted, default to most recent
    if (!selectedEntry || !uniqueHistory.some((h) => h.id === selectedEntry.id && h.mediaType === selectedEntry.mediaType)) {
      setSelectedEntry(uniqueHistory[0]);
    }
  }, [hydrated, uniqueHistory, selectedEntry]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dropdownOpen]);

  const { weights, exclude } = useMemo(() => {
    const weights: Record<string, number> = {};
    const now = Date.now();

    const add = (genreIds: number[], strength: number, at: number) => {
      const ageDays = Math.max(0, (now - at) / 86_400_000);
      const recency = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
      for (const id of genreIds ?? []) {
        weights[id] = (weights[id] ?? 0) + strength * recency;
      }
    };

    for (const entry of history) {
      add(entry.genreIds ?? [], 0.5 + entry.progress, entry.watchedAt);
    }
    for (const entry of watchlist) {
      add(entry.genreIds ?? [], WATCHLIST_WEIGHT, entry.addedAt);
    }

    const exclude = [
      ...history.map((e) => `${e.mediaType}:${e.id}`),
      ...watchlist.map((e) => `${e.mediaType}:${e.id}`),
    ];

    return { weights, exclude };
  }, [history, watchlist]);

  // Fetch recommendations based on selected watched title
  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    const bodyPayload = selectedEntry
      ? {
          mediaId: selectedEntry.id,
          mediaType: selectedEntry.mediaType,
          weights,
          exclude,
        }
      : { weights, exclude };

    fetch("/api/for-you", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    })
      .then((res) => res.json() as Promise<{ results: MediaSummary[] }>)
      .then((data) => {
        if (!cancelled) setItems(data.results ?? []);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [hydrated, selectedEntry, weights, exclude]);

  if (!items.length) return null;

  // Title rendering: Interactive "Because you watched {title}" dropdown or cold start
  const titleNode = selectedEntry ? (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-white/90">Because you watched</span>
      <div ref={dropdownRef} className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          aria-label={`Change reference title from ${selectedEntry.title}`}
          className={cn(
            "group/trigger inline-flex items-center gap-1.5 border-b-2 border-primary pb-0.5 font-bold text-white transition-all cursor-pointer rounded-xs",
            "hover:border-primary-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          )}
        >
          <span className="max-w-[200px] truncate sm:max-w-[340px] md:max-w-[460px]">
            {selectedEntry.title}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-primary transition-transform duration-200",
              dropdownOpen && "rotate-180",
            )}
          />
        </button>

        {dropdownOpen && (
          <div
            role="listbox"
            aria-label="Watched titles"
            className={cn(
              "absolute left-0 top-full z-50 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl border border-white/15 bg-black/92 p-1.5 shadow-2xl backdrop-blur-xl sm:w-84",
              "animate-in fade-in zoom-in-95 duration-150",
            )}
          >
            <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Select Watched Title
            </div>
            <div className="space-y-1">
              {uniqueHistory.map((entry) => {
                const isCurrent =
                  selectedEntry.id === entry.id && selectedEntry.mediaType === entry.mediaType;
                return (
                  <button
                    key={`${entry.mediaType}-${entry.id}`}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => {
                      setSelectedEntry(entry);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors",
                      isCurrent
                        ? "bg-primary/20 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {/* Thumbnail preview */}
                    <div className="relative aspect-2/3 w-8 shrink-0 overflow-hidden rounded bg-white/5">
                      {entry.posterPath ? (
                        <Image
                          src={tmdbImage(entry.posterPath, "w185")!}
                          alt={entry.title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-white/30">
                          {entry.mediaType === "tv" ? (
                            <Tv className="size-3.5" />
                          ) : (
                            <Film className="size-3.5" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-label-sm font-semibold",
                          isCurrent && "text-primary",
                        )}
                      >
                        {entry.title}
                      </p>
                      <p className="text-[11px] text-white/45">
                        {entry.mediaType === "tv" ? "Series" : "Film"}
                        {entry.releaseDate ? ` · ${entry.releaseDate.slice(0, 4)}` : ""}
                      </p>
                    </div>

                    {isCurrent && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  ) : (
    "Popular Right Now"
  );

  return (
    <MediaRow
      title={titleNode}
      items={items}
      href="/trending"
    />
  );
}
