"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";

import { useIsInWatchlist, useLibraryStore } from "@/lib/store/useLibraryStore";
import { useHydrated } from "@/lib/store/usePlayerStore";
import type { MediaSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function WatchlistButton({ media }: { media: MediaSummary }) {
  const hydrated = useHydrated();
  const saved = useIsInWatchlist(media.id, media.mediaType);
  const toggleWatchlist = useLibraryStore((s) => s.toggleWatchlist);

  const active = hydrated && saved;

  return (
    <button
      type="button"
      onClick={() => toggleWatchlist(media)}
      aria-pressed={hydrated ? saved : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-6 py-3 text-label-md transition-colors duration-200",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-outline-strong bg-white/10 text-white hover:bg-white/15",
      )}
    >
      {active ? <BookmarkCheck className="size-4.5" /> : <Bookmark className="size-4.5" />}
      {active ? "In My List" : "Add to My List"}
    </button>
  );
}
