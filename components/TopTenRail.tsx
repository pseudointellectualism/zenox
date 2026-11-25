"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion } from "motion/react";

import PosterArt from "@/components/PosterArt";
import { useOverlay } from "@/components/overlay/OverlayProvider";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useAppReducedMotion } from "@/lib/useMotionPreference";
import type { MediaSummary } from "@/lib/types";
import { cn, rating, yearOf } from "@/lib/utils";

interface TopTenRailProps {
  movies: MediaSummary[];
  shows: MediaSummary[];
}

/**
 * Ranked rail. The numeral is the graphic: an outlined figure sitting behind
 * and beside each poster, so position reads before the artwork does.
 */
export default function TopTenRail({ movies, shows }: TopTenRailProps) {
  const [mode, setMode] = useState<"movie" | "tv">("movie");
  const [edges, setEdges] = useState({ start: true, end: false });
  const railRef = useRef<HTMLUListElement>(null);
  const cardTitles = useSettingsStore((s) => s.cardTitles);
  const showTitles = cardTitles === "always";
  const { openMedia } = useOverlay();
  const reduce = useAppReducedMotion();

  const items = (mode === "movie" ? movies : shows).slice(0, 10);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setEdges({
      start: el.scrollLeft <= 8,
      end: maxScroll <= 8 || el.scrollLeft >= maxScroll - 8,
    });
  }, [railRef]);

  useEffect(() => {
    measure();
    const el = railRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, railRef, mode]);

  const scrollBy = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;

    const cards = Array.from(el.querySelectorAll("li:not([aria-hidden])")) as HTMLElement[];
    if (!cards.length) return;

    const currentScroll = el.scrollLeft;
    const viewportWidth = el.clientWidth;
    const startOffset = cards[0]?.offsetLeft || 0;

    let targetCard: HTMLElement | undefined;
    if (direction === 1) {
      targetCard = cards.find((card) => card.offsetLeft >= currentScroll + viewportWidth - 60);
      if (!targetCard) targetCard = cards[cards.length - 1];
    } else {
      targetCard = [...cards].reverse().find((card) => card.offsetLeft <= currentScroll - viewportWidth + 60);
      if (!targetCard) targetCard = cards[0];
    }

    if (targetCard) {
      const targetScroll = Math.max(0, targetCard.offsetLeft - startOffset);
      el.scrollTo({ left: targetScroll, behavior: "smooth" });
    }
  };

  if (!items.length) return null;

  return (
    <section className="relative py-8">
      <div className="mx-auto mb-5 flex max-w-page flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-end gap-3">
          <h2 className="top-ten-title">TOP 10</h2>
          <p className="mb-1.5 max-w-[7rem] text-label-sm uppercase leading-tight tracking-[0.18em] text-white/45">
            Content today
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            role="radiogroup"
            aria-label="Top 10 media type"
            className="flex items-center gap-0.5 rounded-full border border-white/12 bg-white/[0.06] p-0.5"
          >
            {(["movie", "tv"] as const).map((value) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    if (mode !== value) {
                      setMode(value);
                      railRef.current?.scrollTo({ left: 0, behavior: "smooth" });
                    }
                  }}
                  className={cn(
                    "relative rounded-full px-4 py-1.5 text-label-sm transition-colors duration-200",
                    active ? "text-black font-medium" : "text-white/60 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="top-ten-segmented"
                      className="absolute inset-0 -z-10 rounded-full bg-white"
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 34 }
                      }
                    />
                  )}
                  {value === "movie" ? "Movies" : "Shows"}
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-1.5 md:flex">
            <RailButton dir="left" disabled={edges.start} onClick={() => scrollBy(-1)} />
            <RailButton dir="right" disabled={edges.end} onClick={() => scrollBy(1)} />
          </div>
        </div>
      </div>

      <ul
        ref={railRef}
        onScroll={measure}
        className="rail rail-hide mx-auto flex max-w-page snap-x gap-2 overflow-x-auto overflow-y-hidden px-4 pb-6 pt-7 sm:gap-4 sm:px-6"
      >
        {/* Matches the catalog rails, and gives the first numeral room to breathe. */}
        <li aria-hidden className="w-2 shrink-0 sm:w-6 lg:w-10" />

        {items.map((media, i) => (
          <li
            key={`${media.mediaType}-${media.id}`}
            className="flex shrink-0 snap-start items-end"
          >
            <span aria-hidden className="top-ten-numeral">
              {i + 1}
            </span>

            <button
              type="button"
              onClick={() => openMedia(media.mediaType, media.id)}
              className={cn(
                "group block cursor-pointer text-left w-[42vw] min-w-[145px] max-w-[215px] sm:w-[28vw] md:w-[20vw] lg:w-[15vw] xl:w-[12.8vw] 2xl:w-[11.2vw]",
                i === 9 ? "-ml-8 sm:-ml-12" : "-ml-5 sm:-ml-7",
              )}
              aria-label={`View details for ${media.title}`}
            >
              <span className="relative block aspect-2/3 overflow-hidden rounded-xl border border-white/10 transition-transform duration-300 group-hover:-translate-y-1.5">
                <PosterArt
                  path={media.posterPath}
                  title={media.title}
                  sizes="(min-width: 1280px) 215px, (min-width: 768px) 20vw, 42vw"
                  priority={i < 4}
                />
              </span>
              {showTitles && (
                <>
                  <span className="mt-2 block truncate text-label-md text-white">{media.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-label-sm text-white/50">
                    {rating(media.voteAverage) && (
                      <span className="flex items-center gap-1">
                        <Star className="size-3 fill-primary text-primary" />
                        <span className="tabular-nums">{rating(media.voteAverage)}</span>
                      </span>
                    )}
                    {yearOf(media.releaseDate) && (
                      <span className="tabular-nums">{yearOf(media.releaseDate)}</span>
                    )}
                  </span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RailButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Scroll Top 10 ${dir === "left" ? "backward" : "forward"}`}
      className="grid size-9 place-items-center rounded-full border border-white/12 bg-white/5 text-white transition-[background-color,border-color,transform] duration-200 hover:border-white/25 hover:bg-white/12 active:scale-95 disabled:pointer-events-none disabled:opacity-25"
    >
      <Icon className="size-4.5" />
    </button>
  );
}
