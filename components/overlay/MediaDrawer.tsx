"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Clock,
  Film,
  Loader2,
  Play,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import CountdownTimer from "@/components/media/CountdownTimer";
import PosterArt from "@/components/PosterArt";
import Dropdown from "@/components/ui/Dropdown";
import { buildMediaWatchUrl } from "@/lib/mediaRoute";
import { useIsInWatchlist, useLibraryStore } from "@/lib/store/useLibraryStore";
import { useHydrated } from "@/lib/store/usePlayerStore";
import { tmdbImage } from "@/lib/tmdb-image";
import type { Episode, MediaDetails, MediaType, Season } from "@/lib/types";
import { cn, formatRuntime, rating, yearOf } from "@/lib/utils";

import { useOverlay, type ActiveMedia } from "./OverlayProvider";

interface MediaDrawerProps {
  media: ActiveMedia | null;
  onClose: () => void;
  onSelectMedia?: (type: MediaType, id: number | string) => void;
}

export default function MediaDrawer({ media, onClose, onSelectMedia }: MediaDrawerProps) {
  const { openWatch } = useOverlay();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const router = useRouter();

  const hydrated = useHydrated();
  const saved = useIsInWatchlist(details?.id ?? 0, details?.mediaType ?? "movie");
  const toggleWatchlist = useLibraryStore((s) => s.toggleWatchlist);
  const contentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const trailerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch media details when media prop changes
  useEffect(() => {
    if (trailerTimerRef.current) {
      clearTimeout(trailerTimerRef.current);
      trailerTimerRef.current = null;
    }
    setTrailerPlaying(false);
    setIsMuted(true);

    if (!media) {
      setDetails(null);
      setEpisodes([]);
      setTrailerOpen(false);
      return;
    }

    let active = true;
    setLoading(true);
    setSelectedSeasonNumber(media.season || 1);

    fetch(`/api/details/${media.type}/${media.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((data: { details: MediaDetails; initialSeason: Season | null }) => {
        if (!active) return;
        setDetails(data.details);
        if (data.initialSeason?.episodes) {
          setEpisodes(data.initialSeason.episodes);
        } else {
          setEpisodes([]);
        }
        setLoading(false);
        // Scroll content to top when loading new item
        contentRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

        // Auto play background trailer after 6-7 seconds
        if (data.details.trailerKey) {
          trailerTimerRef.current = setTimeout(() => {
            if (active) {
              setTrailerPlaying(true);
            }
          }, 6500);
        }
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
      if (trailerTimerRef.current) {
        clearTimeout(trailerTimerRef.current);
        trailerTimerRef.current = null;
      }
    };
  }, [media]);

  // Handle season change
  const handleSeasonChange = useCallback(
    async (seasonNum: number) => {
      if (!details || details.mediaType !== "tv") return;
      setSelectedSeasonNumber(seasonNum);
      setEpisodesLoading(true);
      try {
        const res = await fetch(`/api/season/${details.id}/${seasonNum}`);
        if (res.ok) {
          const data = (await res.json()) as { season: Season };
          setEpisodes(data.season.episodes ?? []);
        }
      } catch {
        // Fallback
      } finally {
        setEpisodesLoading(false);
      }
    },
    [details],
  );

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (!media) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (trailerOpen) setTrailerOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [media, onClose, trailerOpen]);

  if (!media) return null;

  const year = details ? yearOf(details.releaseDate) : null;
  const score = details ? rating(details.voteAverage) : null;
  const runtime = details ? formatRuntime(details.runtime) : null;
  const watchHref = details ? `/watch/${details.mediaType}/${details.id}` : "#";

  const releaseTimestamp = details?.releaseDate ? new Date(details.releaseDate).getTime() : NaN;
  const isFutureRelease = !isNaN(releaseTimestamp) && releaseTimestamp > Date.now();
  const UNRELEASED_STATUSES = ["planned", "in production", "post production", "upcoming"];
  const isUnreleasedStatus = details?.status
    ? UNRELEASED_STATUSES.includes(details.status.trim().toLowerCase())
    : false;
  const isUnreleased = Boolean(isFutureRelease || isUnreleasedStatus);

  const formattedReleaseDate = details?.releaseDate
    ? new Date(details.releaseDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center">
      {/* Dimmed backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom-sheet drawer container */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={details?.title ?? "Media details"}
        variants={{
          initial: { y: "100%" },
          animate: {
            y: 0,
            transition: { type: "spring", stiffness: 350, damping: 36 },
          },
          exit: {
            y: "100%",
            transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
          },
        }}
        initial="initial"
        animate="animate"
        exit="exit"
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.75 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 110 || info.velocity.y > 400) {
            onClose();
          }
        }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.75rem] border-t border-x border-white/12 bg-black shadow-[0_-20px_50px_rgba(0,0,0,0.85)]"
      >
        {/* Top drag handle indicator */}
        <div className="absolute inset-x-0 top-0 z-30 flex h-8 cursor-grab active:cursor-grabbing items-center justify-center">
          <div className="h-1.5 w-12 rounded-full bg-white/30 transition-colors hover:bg-white/50" />
        </div>

        {/* Floating close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute right-4 top-4 z-40 grid size-9 place-items-center rounded-full border border-white/15 bg-black/60 text-white/80 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-black/90 hover:text-white"
        >
          <X className="size-4.5" />
        </button>

        {/* Scrollable interior */}
        <div ref={contentRef} className="relative flex-1 overflow-y-auto overscroll-contain rail">
          {loading || !details ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="mt-3 text-body-md text-white/50">Loading details…</p>
            </div>
          ) : (
            <>
              {/* Hero Banner with backdrop (draggable surface with grab cursor) */}
              <div className="relative aspect-video max-h-[52vh] w-full overflow-hidden select-none cursor-grab active:cursor-grabbing sm:aspect-[21/9]">
                <div
                  className="pointer-events-none size-full select-none"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to bottom, #000 60%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.3) 90%, transparent 100%)",
                    maskImage:
                      "linear-gradient(to bottom, #000 60%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.3) 90%, transparent 100%)",
                  }}
                >
                  {details.backdropPath ? (
                    <PosterArt
                      path={details.backdropPath}
                      title={details.title}
                      variant="backdrop"
                      imageSize="original"
                      sizes="(min-width: 1024px) 1024px, 100vw"
                      priority
                      showLabel={false}
                      className="pointer-events-none select-none object-cover object-top"
                    />
                  ) : (
                    <div className="size-full bg-surface-low" />
                  )}

                  {/* Auto-playing trailer preview after 6s */}
                  {trailerPlaying && details.trailerKey && (
                    <div className="pointer-events-none absolute inset-0 z-1 overflow-hidden">
                      <iframe
                        ref={iframeRef}
                        src={`https://www.youtube-nocookie.com/embed/${details.trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${details.trailerKey}&playsinline=1&enablejsapi=1&origin=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`}
                        title={`${details.title} preview`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="pointer-events-none size-full scale-[1.35] object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Volume toggle button for background trailer */}
                {trailerPlaying && details.trailerKey && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = !isMuted;
                      setIsMuted(next);
                      iframeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
                        "*",
                      );
                    }}
                    aria-label={isMuted ? "Unmute preview" : "Mute preview"}
                    className="pointer-events-auto cursor-pointer absolute bottom-28 right-4 z-20 grid size-10 place-items-center rounded-full border border-white/25 bg-black/70 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/90 active:scale-95"
                  >
                    {isMuted ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
                  </button>
                )}
              </div>

              {/* Media Info Section (positioned cleanly above banner) */}
              <div className="relative z-10 -mt-20 px-5 pb-10 sm:-mt-28 sm:px-8 lg:px-10">
                {details.logoPath ? (
                  <div className="mb-4 max-w-[70%] sm:max-w-[50%] md:max-w-[40%] pointer-events-none select-none">
                    <Image
                      src={tmdbImage(details.logoPath, "original")!}
                      alt={details.title}
                      width={520}
                      height={200}
                      priority
                      draggable={false}
                      className="pointer-events-none select-none h-16 w-auto max-w-full object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] sm:h-22 md:h-28"
                    />
                  </div>
                ) : (
                  <h1 className="text-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                    {details.title}
                  </h1>
                )}

                {/* Metadata badges row */}
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {score && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-label-sm font-semibold text-white backdrop-blur-sm">
                      <Star className="size-3.5 fill-white text-white" />
                      {score}
                    </span>
                  )}
                  {year && (
                    <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-label-sm font-medium text-white/85 backdrop-blur-sm">
                      {year}
                    </span>
                  )}
                  {runtime && (
                    <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-label-sm font-medium text-white/85 backdrop-blur-sm">
                      {runtime}
                    </span>
                  )}
                  {details.mediaType === "tv" && details.numberOfSeasons && (
                    <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-label-sm font-medium text-white/85 backdrop-blur-sm">
                      {details.numberOfSeasons} {details.numberOfSeasons === 1 ? "Season" : "Seasons"}
                    </span>
                  )}
                  {details.status && (
                    <span
                      className={cn(
                        "rounded-full border px-3.5 py-1 text-label-sm font-medium backdrop-blur-sm",
                        isUnreleased
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold"
                          : "border-white/20 bg-white/10 text-white/85",
                      )}
                    >
                      {details.status}
                    </span>
                  )}
                  {details.genres?.map((g) => (
                    <span
                      key={g.id}
                      className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-label-sm text-white/75 backdrop-blur-sm"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>

                {/* Action CTA buttons & Streaming Service Banner */}
                <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3.5">
                    {isUnreleased ? (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div
                          className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-6 py-3.5 text-label-md font-semibold text-amber-200 select-none cursor-not-allowed backdrop-blur-sm shadow-md"
                          title="This title is unreleased and cannot be played yet."
                        >
                          <Clock className="size-5 text-amber-400 shrink-0" />
                          <span>Unreleased</span>
                          {formattedReleaseDate && (
                            <span className="text-white/60 font-normal">· {formattedReleaseDate}</span>
                          )}
                        </div>
                        {isFutureRelease && details.releaseDate && (
                          <CountdownTimer targetDate={details.releaseDate} />
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          openWatch(
                            details.mediaType,
                            details.id,
                            details.mediaType === "tv" ? selectedSeasonNumber : undefined,
                            1,
                          );
                        }}
                        className="inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-label-md font-bold text-on-primary transition-all duration-200 hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Play className="size-5 fill-current" />
                        Watch Now
                      </button>
                    )}

                    {details.trailerKey && (
                      <button
                        type="button"
                        onClick={() => setTrailerOpen(true)}
                        className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-label-md font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 active:scale-[0.98]"
                      >
                        <Film className="size-5" />
                        Trailer
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleWatchlist(details)}
                      aria-label={saved ? "In watchlist" : "Add to watchlist"}
                      className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-5 py-3.5 text-label-md font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 active:scale-[0.98]"
                    >
                      {hydrated && saved ? (
                        <>
                          <BookmarkCheck className="size-5 text-primary" />
                          <span className="hidden sm:inline">In List</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="size-5" />
                          <span className="hidden sm:inline">Add to List</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Streaming service banner: prominent standalone logo fully to the right side */}
                  {details.streamingBrand && (
                    <div className="flex items-center sm:ml-auto select-none pt-1 sm:pt-0">
                      <img
                        src={details.streamingBrand.bannerUrl}
                        alt={details.streamingBrand.name}
                        title={`Available on ${details.streamingBrand.name}`}
                        className={cn(
                          "h-10 sm:h-12 md:h-14 w-auto max-w-[130px] sm:max-w-[170px] object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:scale-105",
                          details.streamingBrand.invertOnDark && "brightness-0 invert",
                        )}
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {/* Overview paragraph */}
                {details.overview && (
                  <div className="mt-7 max-w-3xl">
                    <p className="text-body-lg sm:text-title-md leading-relaxed text-white/80 font-normal">
                      {details.overview}
                    </p>
                  </div>
                )}

                {/* Episodes Section (Series Only) */}
                {details.mediaType === "tv" && details.seasons.length > 0 && (
                  <section className="mt-10 border-t border-white/10 pt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-title-lg font-bold text-white">Episodes</h2>

                      {/* Season selector dropdown */}
                      {details.seasons.length > 1 && (
                        <Dropdown
                          label="Select season"
                          value={selectedSeasonNumber}
                          options={details.seasons.map((season) => ({
                            value: season.seasonNumber,
                            label: season.name || `Season ${season.seasonNumber}`,
                            description: `${season.episodeCount} episode${season.episodeCount === 1 ? "" : "s"}`,
                          }))}
                          onChange={(next) => handleSeasonChange(Number(next))}
                          size="sm"
                          align="right"
                        />
                      )}
                    </div>

                    {/* Episodes list */}
                    <div className="mt-5 space-y-3">
                      {episodesLoading ? (
                        <div className="py-12 text-center">
                          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                          <p className="mt-2 text-label-sm text-white/50">Loading episodes…</p>
                        </div>
                      ) : episodes.length === 0 ? (
                        <p className="py-6 text-label-md text-white/50">No episodes available.</p>
                      ) : (
                        episodes.map((ep) => {
                          const epAirTimestamp = ep.airDate ? new Date(ep.airDate).getTime() : NaN;
                          const isEpUnreleased =
                            isUnreleased || (!isNaN(epAirTimestamp) && epAirTimestamp > Date.now());

                          return (
                            <div
                              key={ep.id}
                              onClick={() => {
                                if (isEpUnreleased) return;
                                onClose();
                                openWatch(
                                  "tv",
                                  details.id,
                                  selectedSeasonNumber,
                                  ep.episodeNumber,
                                );
                              }}
                              className={cn(
                                "group flex flex-col gap-3.5 rounded-xl border p-3 transition-colors duration-200 sm:flex-row sm:items-center sm:p-4",
                                isEpUnreleased
                                  ? "border-white/5 bg-white/[0.02] opacity-70 cursor-not-allowed"
                                  : "cursor-pointer border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]",
                              )}
                            >
                              {/* Episode number */}
                              <span
                                className={cn(
                                  "hidden w-6 text-center font-mono text-label-md font-bold text-white/40 sm:block",
                                  !isEpUnreleased && "group-hover:text-primary",
                                )}
                              >
                                {ep.episodeNumber}
                              </span>

                              {/* Thumbnail */}
                              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-white/5 sm:w-36 lg:w-44">
                                {ep.stillPath ? (
                                  <Image
                                    src={tmdbImage(ep.stillPath, "w500")!}
                                    alt={ep.name}
                                    fill
                                    sizes="(min-width: 640px) 176px, 100vw"
                                    draggable={false}
                                    className="object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none select-none"
                                  />
                                ) : (
                                  <div className="grid size-full place-items-center bg-surface-lowest text-white/25">
                                    <Film className="size-6" />
                                  </div>
                                )}
                                {/* Quick play overlay on thumbnail */}
                                <div
                                  className={cn(
                                    "absolute inset-0 grid place-items-center bg-black/40 transition-opacity duration-200",
                                    isEpUnreleased ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                                  )}
                                >
                                  {isEpUnreleased ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-amber-300 backdrop-blur-sm shadow">
                                      <Clock className="size-3 text-amber-400" />
                                      Unreleased
                                    </span>
                                  ) : (
                                    <span className="grid size-9 place-items-center rounded-full bg-primary text-on-primary shadow-md">
                                      <Play className="size-4.5 translate-x-px fill-current" />
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h3
                                    className={cn(
                                      "truncate text-label-md font-semibold text-white",
                                      !isEpUnreleased && "group-hover:text-primary",
                                    )}
                                  >
                                    {ep.name || `Episode ${ep.episodeNumber}`}
                                  </h3>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isEpUnreleased && (
                                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                        Unreleased
                                      </span>
                                    )}
                                    {ep.runtime && (
                                      <span className="text-label-sm text-white/50">
                                        {ep.runtime}m
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {ep.airDate && (
                                  <p className="mt-0.5 text-label-sm text-white/40">{ep.airDate}</p>
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
                  </section>
                )}

                {/* Cast Members Section */}
                {details.cast.length > 0 && (
                  <section className="mt-10 border-t border-white/10 pt-8">
                    <h2 className="text-title-lg font-bold text-white">Cast</h2>
                    <ul className="mt-4 flex gap-3 overflow-x-auto pb-3 rail">
                      {details.cast.slice(0, 14).map((member) => (
                        <li key={member.id} className="w-20 shrink-0 sm:w-24">
                          <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg border border-white/10 bg-white/5">
                            {member.profilePath ? (
                              <Image
                                src={tmdbImage(member.profilePath, "w185")!}
                                alt={member.name}
                                fill
                                sizes="96px"
                                draggable={false}
                                className="object-cover pointer-events-none select-none"
                              />
                            ) : (
                              <div className="grid size-full place-items-center text-label-sm text-white/30">
                                No photo
                              </div>
                            )}
                          </div>
                          <p className="mt-2 truncate text-label-sm font-medium text-white">
                            {member.name}
                          </p>
                          <p className="truncate text-[0.6875rem] text-white/50">{member.character}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Recommendations Section */}
                {details.related.length > 0 && (
                  <section className="mt-10 border-t border-white/10 pt-8">
                    <h2 className="text-title-lg font-bold text-white">More Like This</h2>
                    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
                      {details.related.slice(0, 10).map((item) => (
                        <li key={`${item.mediaType}-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => onSelectMedia?.(item.mediaType, item.id)}
                            className="group block w-full text-left transition-transform hover:-translate-y-1"
                          >
                            <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
                              <PosterArt
                                path={item.posterPath}
                                title={item.title}
                                sizes="(min-width: 1024px) 200px, 45vw"
                              />
                            </div>
                            <p className="mt-2 truncate text-label-sm font-semibold text-white group-hover:text-primary">
                              {item.title}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-[0.6875rem] text-white/50">
                              {yearOf(item.releaseDate) && <span>{yearOf(item.releaseDate)}</span>}
                              {rating(item.voteAverage) && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="size-2.5 fill-white text-white" />
                                  {rating(item.voteAverage)}
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Trailer Overlay Modal */}
      <AnimatePresence>
        {trailerOpen && details?.trailerKey && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setTrailerOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setTrailerOpen(false)}
                aria-label="Close trailer"
                className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full bg-black/70 text-white/80 hover:text-white"
              >
                <X className="size-4" />
              </button>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${details.trailerKey}?autoplay=1&origin=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`}
                title={`${details.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="size-full"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
