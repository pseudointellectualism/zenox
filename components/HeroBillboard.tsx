"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Clock, Info, Play, Star } from "lucide-react";

import PosterArt from "@/components/PosterArt";
import { useOverlay } from "@/components/overlay/OverlayProvider";
import { useAmbient } from "@/lib/ambient";
import { buildMediaWatchUrl } from "@/lib/mediaRoute";
import { useIsInWatchlist, useLibraryStore } from "@/lib/store/useLibraryStore";
import { useHydrated } from "@/lib/store/usePlayerStore";
import { tmdbImage } from "@/lib/tmdb-image";
import type { MediaSummary } from "@/lib/types";
import { cn, formatRuntime, hueFromSeed, rating, truncate, yearOf } from "@/lib/utils";

interface HeroBillboardProps {
  items: MediaSummary[];
  /** Runtime in minutes, when the caller has detail-level data for the lead title. */
  leadRuntime?: number | null;
}

/**
 * The billboard carries the page's headline and primary CTA, so none of it is
 * gated behind an entrance animation. A staggered reveal holds delayed elements
 * at their hidden state, which means a stalled animation clock can paint the
 * title while leaving the buttons invisible. Motion here lives in the backdrop
 * fade and the ambient tint instead, neither of which can hide content.
 */
export default function HeroBillboard({ items, leadRuntime }: HeroBillboardProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const hydrated = useHydrated();
  const toggleWatchlist = useLibraryStore((s) => s.toggleWatchlist);
  const { openMedia, openWatch } = useOverlay();

  // Auto-advance every 15 seconds, pausing when user hovers or interacts
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const count = Math.min(items.length, 5);
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, 15000);
    return () => clearInterval(timer);
  }, [index, isPaused, items.length]);

  const featured = items[index];
  const saved = useIsInWatchlist(featured?.id ?? 0, featured?.mediaType ?? "movie");

  // Fetch title logos for billboard items
  useEffect(() => {
    const leadItems = items.slice(0, 5);
    leadItems.forEach((item) => {
      const key = `${item.mediaType}-${item.id}`;
      const logoVal = item.logoPath ?? null;
      if (item.logoPath) {
        setLogos((prev) => (prev[key] === logoVal ? prev : { ...prev, [key]: logoVal }));
      } else if (!(key in logos)) {
        fetch(`/api/logo/${item.mediaType}/${item.id}`)
          .then((r) => r.json())
          .then((d: { logoPath: string | null }) => {
            setLogos((prev) => ({ ...prev, [key]: d.logoPath }));
          })
          .catch(() => {
            setLogos((prev) => ({ ...prev, [key]: null }));
          });
      }
    });
  }, [items]);

  // Spill the artwork's hue into the page canvas.
  useAmbient(featured ? hueFromSeed(featured.title) : null);

  if (!featured) return null;

  const currentLogo = featured.logoPath || logos[`${featured.mediaType}-${featured.id}`];
  const year = yearOf(featured.releaseDate);
  const releaseYearNum = year ? parseInt(year, 10) : 0;
  // Recent high-definition productions are labeled 4K, earlier/standard titles are labeled HD
  const is4K = releaseYearNum >= 2021;
  const score = rating(featured.voteAverage);
  const runtime = index === 0 ? formatRuntime(leadRuntime) : null;
  const releaseTimestamp = featured?.releaseDate ? new Date(featured.releaseDate).getTime() : NaN;
  const isFutureRelease = !isNaN(releaseTimestamp) && releaseTimestamp > Date.now();

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative min-h-[82vh] w-full overflow-hidden lg:min-h-[88vh]"
    >
      {/*
        Artwork and its scrims share one masked layer, so they fade out together
        and the page's own background carries on underneath. Covering the bottom
        with an opaque colour instead would paint over the ambient backdrop and
        leave a hard edge where the section ends.
      */}
      <div aria-hidden className="hero-visual absolute inset-0">
        {/* Keyed so switching titles replays the fade rather than cutting. */}
        <div key={featured.id} className="absolute inset-0 hero-fade">
          <PosterArt
            path={featured.backdropPath}
            title={featured.title}
            variant="backdrop"
            imageSize="original"
            sizes="100vw"
            priority
            showLabel={false}
            className="object-cover object-top sm:object-center"
          />
        </div>

        {/* Natural gradient fade matching streaming references: vibrant artwork on right, readable on left */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 24%, rgba(0,0,0,0.15) 50%, transparent 75%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.15) 60%, transparent 85%)",
          }}
        />
      </div>

      <div className="relative flex min-h-[84vh] w-full flex-col justify-end px-4 pb-16 pt-24 sm:px-12 lg:min-h-[90vh] lg:px-16 lg:pb-24">
        <div key={featured.id} className="max-w-2xl">
          {currentLogo ? (
            <div className="mb-5 max-w-[80%] sm:max-w-[65%] md:max-w-[55%]">
              <Image
                src={tmdbImage(currentLogo, "original")!}
                alt={featured.title}
                width={560}
                height={220}
                priority
                className="h-20 w-auto max-w-full object-contain object-left brightness-110 drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] sm:h-28 md:h-36"
              />
            </div>
          ) : (
            <h1 className="text-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
              {featured.title}
            </h1>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {is4K ? (
              <span className="rounded bg-white/20 px-2.5 py-0.5 text-label-sm font-semibold text-white">
                4K
              </span>
            ) : (
              <span className="rounded border border-white/25 bg-white/10 px-2.5 py-0.5 text-label-sm font-semibold text-white/90">
                HD
              </span>
            )}
            {year && <Meta>{year}</Meta>}
            {score && (
              <Meta>
                <Star className="size-3.5 fill-white text-white" />
                {score}
              </Meta>
            )}
            {runtime && <Meta>{runtime}</Meta>}
            <Meta>{featured.mediaType === "movie" ? "Film" : "Series"}</Meta>
          </div>

          {featured.overview && (
            <p className="mt-5 max-w-xl text-body-lg sm:text-title-md leading-relaxed text-white/80 font-normal">
              {truncate(featured.overview, 185)}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            {isFutureRelease ? (
              <button
                type="button"
                onClick={() => openMedia(featured.mediaType, featured.id)}
                className="inline-flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-7 py-3.5 text-label-md font-semibold text-amber-200 backdrop-blur-sm transition-[background-color,transform] duration-200 hover:bg-amber-500/25 active:scale-[0.98]"
              >
                <Clock className="size-5 text-amber-400" />
                Unreleased
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openWatch(featured.mediaType, featured.id, 1, 1)}
                className="inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-label-md font-bold text-on-primary transition-[background-color,transform] duration-200 hover:bg-primary-hover active:scale-[0.98]"
              >
                <Play className="size-5 fill-current" />
                Watch Now
              </button>
            )}

            <button
              type="button"
              onClick={() => openMedia(featured.mediaType, featured.id)}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-label-md font-semibold text-white backdrop-blur-sm transition-[background-color,transform] duration-200 hover:bg-white/20 active:scale-[0.98]"
            >
              <Info className="size-5" />
              Details
            </button>

            <button
              type="button"
              onClick={() => toggleWatchlist(featured)}
              aria-pressed={hydrated ? saved : undefined}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-label-md font-medium text-white backdrop-blur-sm transition-[background-color,transform] duration-200 hover:bg-white/20 active:scale-[0.98]"
            >
              {hydrated && saved ? (
                <>
                  <BookmarkCheck className="size-5 text-primary" />
                  In My List
                </>
              ) : (
                <>
                  <Bookmark className="size-5" />
                  Watchlist
                </>
              )}
            </button>
          </div>
        </div>

        {items.length > 1 && (
          <div className="mt-10 flex items-center gap-2" role="tablist" aria-label="Featured titles">
            {items.slice(0, 5).map((item, i) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={i === index}
                aria-label={item.title}
                onClick={() => setIndex(i)}
                className="group/dot py-2"
              >
                <span
                  className={cn(
                    "block h-[3px] rounded-full transition-[width,background-color] duration-500",
                    i === index ? "w-12 bg-primary" : "w-6 bg-white/30 group-hover/dot:bg-white/60",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-label-sm text-white/80 backdrop-blur-sm">
      {children}
    </span>
  );
}
