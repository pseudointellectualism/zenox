"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Film, Loader2, Play, X } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb-image";
import type { Episode, MediaDetails, Season } from "@/lib/types";

interface ZenoxEpisodeDrawerProps {
  open: boolean;
  onClose: () => void;
  details: MediaDetails;
  currentSeason: number;
  currentEpisode: number;
  onSelectEpisode: (season: number, episode: number) => void;
}

export default function ZenoxEpisodeDrawer({
  open,
  onClose,
  details,
  currentSeason,
  currentEpisode,
  onSelectEpisode,
}: ZenoxEpisodeDrawerProps) {
  const [selectedSeason, setSelectedSeason] = useState(currentSeason || 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Record<number, Episode[]>>({});

  const seasons = (details.seasons || []).filter(
    (s) => s.seasonNumber > 0 || details.seasons?.length === 1,
  );

  // Sync selected season when currentSeason changes
  useEffect(() => {
    if (currentSeason) {
      setSelectedSeason(currentSeason);
    }
  }, [currentSeason]);

  // Fetch real episodes for the active season
  useEffect(() => {
    if (!open || !details?.id) return;

    if (cacheRef.current[selectedSeason]) {
      setEpisodes(cacheRef.current[selectedSeason]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/season/${details.id}/${selectedSeason}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load season episodes");
        const data = (await res.json()) as { season: Season };
        const list = data.season?.episodes ?? [];
        cacheRef.current[selectedSeason] = list;
        if (active) {
          setEpisodes(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          const seasonData = details.seasons?.find((s) => s.seasonNumber === selectedSeason);
          const count = seasonData?.episodeCount || 10;
          const fallbackEpisodes: Episode[] = Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            episodeNumber: i + 1,
            seasonNumber: selectedSeason,
            name: `Episode ${i + 1}`,
            overview: "",
            stillPath: null,
            runtime: details.runtime ?? null,
            airDate: null,
            voteAverage: 0,
          }));
          setEpisodes(fallbackEpisodes);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, details?.id, selectedSeason, details.runtime, details.seasons]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop blur with smooth fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Drawer container with spring slide animation */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/15 bg-black/95 p-5 shadow-2xl backdrop-blur-2xl sm:max-w-2xl sm:p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-title-lg font-bold text-white">Episodes</h2>
                <p className="text-label-sm text-white/50">{details.title}</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close episodes"
                className="grid size-9 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/15 active:scale-95"
              >
                <X className="size-4.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Season Selector */}
            {seasons.length > 1 && (
              <div className="my-4 flex items-center gap-2 overflow-x-auto pb-1 rail shrink-0">
                {seasons.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSeason(s.seasonNumber)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-label-sm font-medium transition-all ${
                      selectedSeason === s.seasonNumber
                        ? "bg-primary text-on-primary font-bold shadow-sm"
                        : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    {s.name || `Season ${s.seasonNumber}`}
                  </button>
                ))}
              </div>
            )}

            {/* Episodes List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mt-2 rail">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="mt-3 text-label-sm text-white/50">Loading episodes…</p>
                </div>
              ) : episodes.length === 0 ? (
                <div className="py-20 text-center text-label-md text-white/50">
                  No episodes available for this season.
                </div>
              ) : (
                episodes.map((ep) => {
                  const isCurrent =
                    selectedSeason === currentSeason && ep.episodeNumber === currentEpisode;

                  return (
                    <div
                      key={ep.id || ep.episodeNumber}
                      onClick={() => {
                        onSelectEpisode(selectedSeason, ep.episodeNumber);
                        onClose();
                      }}
                      className={`group flex cursor-pointer flex-col gap-3.5 rounded-2xl border p-3.5 transition-all duration-200 sm:flex-row sm:items-center sm:p-4 ${
                        isCurrent
                          ? "border-primary/50 bg-white/10 shadow-lg"
                          : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]"
                      }`}
                    >
                      {/* Episode number */}
                      <span className="hidden w-6 text-center font-mono text-label-md font-bold text-white/40 group-hover:text-primary sm:block shrink-0">
                        {ep.episodeNumber}
                      </span>

                      {/* Thumbnail */}
                      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-white/5 sm:w-40 lg:w-48">
                        {ep.stillPath || details.backdropPath ? (
                          <Image
                            src={
                              tmdbImage(ep.stillPath || details.backdropPath, "w500") ||
                              tmdbImage(details.backdropPath, "w342")!
                            }
                            alt={ep.name || `Episode ${ep.episodeNumber}`}
                            fill
                            sizes="(min-width: 640px) 192px, 100vw"
                            draggable={false}
                            className="object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none select-none"
                          />
                        ) : (
                          <div className="grid size-full place-items-center bg-white/5 text-white/25">
                            <Film className="size-6" />
                          </div>
                        )}

                        {/* Quick play overlay on thumbnail */}
                        <div
                          className={`absolute inset-0 grid place-items-center transition-opacity duration-200 ${
                            isCurrent
                              ? "bg-black/30 opacity-100"
                              : "bg-black/40 opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <span
                            className={`grid size-9 place-items-center rounded-full shadow-md ${
                              isCurrent
                                ? "bg-primary text-on-primary"
                                : "bg-white/90 text-black group-hover:bg-primary group-hover:text-on-primary"
                            }`}
                          >
                            <Play className="size-4.5 translate-x-px fill-current" />
                          </span>
                        </div>
                      </div>

                      {/* Info matching details page */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3
                              className={`truncate text-label-md font-semibold transition-colors ${
                                isCurrent ? "text-primary font-bold" : "text-white group-hover:text-primary"
                              }`}
                            >
                              {ep.name || `Episode ${ep.episodeNumber}`}
                            </h3>
                            {isCurrent && (
                              <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/30">
                                Playing
                              </span>
                            )}
                          </div>
                          {ep.runtime && (
                            <span className="shrink-0 text-label-sm text-white/50 font-medium">
                              {ep.runtime}m
                            </span>
                          )}
                        </div>

                        {ep.airDate && (
                          <p className="mt-0.5 text-[12px] text-white/40">{ep.airDate}</p>
                        )}

                        {ep.overview && (
                          <p className="mt-1.5 line-clamp-2 text-label-sm leading-relaxed text-white/60">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
