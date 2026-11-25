"use client";

import { Bookmark, BookmarkCheck, Play, Star } from "lucide-react";

import PosterArt from "@/components/PosterArt";
import { useOverlay } from "@/components/overlay/OverlayProvider";
import { useIsInWatchlist, useLibraryStore } from "@/lib/store/useLibraryStore";
import { useHydrated } from "@/lib/store/usePlayerStore";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import type { MediaSummary } from "@/lib/types";
import { cn, rating, yearOf } from "@/lib/utils";

interface MediaCardProps {
  media: MediaSummary;
  priority?: boolean;
  className?: string;
  /** 0 to 1 continue-watching bar along the bottom edge. */
  progress?: number;
}

/**
 * Poster-first. The artwork carries the title, so metadata stays out of the
 * way until the viewer shows intent by hovering or focusing the card.
 */
export default function MediaCard({ media, priority, className, progress }: MediaCardProps) {
  const hydrated = useHydrated();
  const saved = useIsInWatchlist(media.id, media.mediaType);
  const toggleWatchlist = useLibraryStore((s) => s.toggleWatchlist);
  const cardTitles = useSettingsStore((s) => s.cardTitles);
  const { openMedia } = useOverlay();

  const year = yearOf(media.releaseDate);
  const score = rating(media.voteAverage);
  const alwaysOn = cardTitles === "always";

  return (
    <article
      className={cn(
        "group relative isolate overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out",
        "hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.75)]",
        "focus-within:-translate-y-1.5 focus-within:border-white/20",
        className,
      )}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden">
        <PosterArt
          path={media.posterPath}
          title={media.title}
          priority={priority}
          className="transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
        />

        <button
          type="button"
          onClick={() => toggleWatchlist(media)}
          aria-label={saved ? `Remove ${media.title} from my list` : `Add ${media.title} to my list`}
          aria-pressed={hydrated ? saved : undefined}
          className={cn(
            "absolute right-2 top-2 z-20 grid size-8 place-items-center rounded-full",
            "border border-white/15 bg-black/55 backdrop-blur-sm transition-[opacity,color,background-color,border-color] duration-200",
            "hover:border-white/30 hover:bg-black/75",
            hydrated && saved
              ? "text-white opacity-100"
              : "text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          {hydrated && saved ? (
            <BookmarkCheck className="size-4 text-white" />
          ) : (
            <Bookmark className="size-4" />
          )}
        </button>

        {/* Scrim and metadata ride in together on intent. */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 pt-12",
            "bg-gradient-to-t from-black/92 via-black/55 to-transparent",
            "transition-opacity duration-300",
            alwaysOn ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <h3
            className={cn(
              "line-clamp-2 text-label-md leading-snug text-white transition-transform duration-300",
              !alwaysOn && "translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0",
            )}
          >
            {media.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-label-sm text-white/60">
            {year && <span>{year}</span>}
            {score && (
              <span className="flex items-center gap-1">
                <Star className="size-3 fill-white text-white" />
                {score}
              </span>
            )}
            <span className="ml-auto rounded border border-white/15 px-1.5 py-px text-[0.625rem] uppercase tracking-wider">
              {media.mediaType === "movie" ? "Film" : "Series"}
            </span>
          </div>
        </div>

        {/* Quick play. Scales in so the affordance reads as arriving, not blinking. */}
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-10 grid size-12 -translate-x-1/2 -translate-y-1/2",
            "place-items-center rounded-full bg-primary text-on-primary",
            "scale-75 opacity-0 transition-[opacity,transform] duration-300 ease-out",
            "group-hover:scale-100 group-hover:opacity-100",
            "group-focus-within:scale-100 group-focus-within:opacity-100",
          )}
        >
          <Play className="size-5 translate-x-px fill-current" />
        </span>

        {typeof progress === "number" && progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-black/70">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => openMedia(media.mediaType, media.id)}
          className="absolute inset-0 z-10 cursor-pointer text-left"
          aria-label={`View details for ${media.title}`}
        >
          <span className="sr-only">{`View details for ${media.title}`}</span>
        </button>
      </div>
    </article>
  );
}
