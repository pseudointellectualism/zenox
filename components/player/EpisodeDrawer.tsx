"use client";

import { Play } from "lucide-react";

import PosterArt from "@/components/PosterArt";
import Dropdown from "@/components/ui/Dropdown";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import type { Season } from "@/lib/types";
import { cn, formatRuntime, truncate } from "@/lib/utils";

interface EpisodeDrawerProps {
  seasons: Season[];
  activeSeason: number;
  activeEpisode: number;
  episodes: Season["episodes"];
  loading: boolean;
  onSeasonChange: (seasonNumber: number) => void;
  onEpisodeChange: (episodeNumber: number) => void;
}

export default function EpisodeDrawer({
  seasons,
  activeSeason,
  activeEpisode,
  episodes,
  loading,
  onSeasonChange,
  onEpisodeChange,
}: EpisodeDrawerProps) {
  const episodeView = useSettingsStore((s) => s.episodeView);
  const carousel = episodeView === "carousel";

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-headline-md text-white">Episodes</h2>

        {seasons.length > 0 && (
          <Dropdown
            label="Select season"
            value={activeSeason}
            options={seasons.map((season) => ({
              value: season.seasonNumber,
              label: season.name || `Season ${season.seasonNumber}`,
            }))}
            onChange={(next) => onSeasonChange(Number(next))}
            size="md"
            align="right"
          />
        )}
      </div>

      {loading ? (
        <ul
          className={cn(
            carousel
              ? "rail rail-hide flex gap-3 overflow-x-auto pb-1"
              : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className={cn(
                "h-24 animate-pulse rounded-xl border border-outline bg-white/[0.03]",
                carousel && "w-72 shrink-0",
              )}
            />
          ))}
        </ul>
      ) : !episodes?.length ? (
        <p className="py-8 text-center text-body-md text-muted">
          No episode data available for this season.
        </p>
      ) : (
        <ul
          className={cn(
            carousel
              ? "rail rail-hide flex snap-x gap-3 overflow-x-auto pb-1"
              : "grid max-h-[28rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {episodes.map((episode) => {
            const active = episode.episodeNumber === activeEpisode;
            return (
              <li key={episode.id} className={cn(carousel && "w-72 shrink-0 snap-start")}>
                <button
                  type="button"
                  onClick={() => onEpisodeChange(episode.episodeNumber)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "group flex w-full gap-3 rounded-xl border p-2.5 text-left transition-colors duration-200",
                    active
                      ? "border-primary bg-primary/8"
                      : "border-outline bg-white/[0.03] hover:border-outline-strong hover:bg-white/[0.06]",
                  )}
                >
                  <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg">
                    <PosterArt
                      path={episode.stillPath}
                      title={`${episode.name} ${episode.episodeNumber}`}
                      variant="still"
                      sizes="96px"
                      showLabel={false}
                    />
                    <span
                      className={cn(
                        "absolute inset-0 grid place-items-center bg-black/45 transition-opacity",
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Play className="size-4 fill-primary text-primary" />
                    </span>
                  </span>

                  <span className="min-w-0 flex-1 py-0.5">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "text-label-sm font-semibold",
                          active ? "text-primary" : "text-secondary",
                        )}
                      >
                        E{episode.episodeNumber}
                      </span>
                      <span className="truncate text-label-md text-white">{episode.name}</span>
                    </span>
                    <span className="mt-1 block text-label-sm text-muted">
                      {formatRuntime(episode.runtime) ?? episode.airDate ?? ""}
                    </span>
                    {episode.overview && (
                      <span className="mt-1.5 hidden text-label-sm leading-snug text-muted sm:line-clamp-2">
                        {truncate(episode.overview, 110)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
