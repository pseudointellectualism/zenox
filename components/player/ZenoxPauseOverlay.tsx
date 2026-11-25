"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, RotateCcw, RotateCw, Star } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb-image";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import type { MediaDetails, MediaType } from "@/lib/types";
import { formatTime } from "./controls/ZenoxProgressBar";

export interface ZenoxPauseOverlayProps {
  details?: MediaDetails;
  mediaType: MediaType;
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  hasStartedPlayback?: boolean;
  isBuffering?: boolean;
  onResume: () => void;
  onSeek: (time: number) => void;
}

export default function ZenoxPauseOverlay({
  details,
  mediaType,
  season,
  episode,
  currentTime,
  duration,
  isPlaying,
  hasStartedPlayback = true,
  isBuffering = false,
  onResume,
  onSeek,
}: ZenoxPauseOverlayProps) {
  const pauseOverlayEnabled = useSettingsStore((s) => s.pauseOverlayEnabled) ?? true;
  const pauseOverlayDelay = useSettingsStore((s) => s.pauseOverlayDelay) ?? 5;
  const pauseOverlayHideOnMove = useSettingsStore((s) => s.pauseOverlayHideOnMove) ?? true;

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear existing timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Schedule overlay appearance after pauseOverlayDelay seconds of pause
  // Never schedule while stream is loading, initial buffering, or hasn't started playback
  const scheduleOverlay = useCallback(() => {
    clearTimer();
    if (!pauseOverlayEnabled || isPlaying || !hasStartedPlayback || isBuffering) {
      return;
    }

    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, Math.max(1, pauseOverlayDelay) * 1000);
  }, [clearTimer, pauseOverlayEnabled, isPlaying, hasStartedPlayback, isBuffering, pauseOverlayDelay]);

  // Handle play/pause transitions & loading screen states
  useEffect(() => {
    if (isPlaying || !hasStartedPlayback || isBuffering) {
      clearTimer();
      setIsVisible(false);
    } else {
      scheduleOverlay();
    }

    return () => clearTimer();
  }, [isPlaying, hasStartedPlayback, isBuffering, scheduleOverlay, clearTimer]);

  // Handle mouse movement behavior while paused
  useEffect(() => {
    if (isPlaying || !hasStartedPlayback || isBuffering || !pauseOverlayEnabled) {
      return;
    }

    const handleMouseMove = () => {
      if (pauseOverlayHideOnMove) {
        setIsVisible(false);
        scheduleOverlay();
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isPlaying, hasStartedPlayback, isBuffering, pauseOverlayEnabled, pauseOverlayHideOnMove, scheduleOverlay]);

  // Never render overlay if playback hasn't started or is still loading/buffering
  if (!details || !pauseOverlayEnabled || !hasStartedPlayback || isBuffering) return null;

  const backdropUrl =
    tmdbImage(details.backdropPath, "w1280") ||
    tmdbImage(details.backdropPath, "original") ||
    tmdbImage(details.posterPath, "w780");

  const logoUrl = tmdbImage(details.logoPath, "w500");
  const year = details.releaseDate ? details.releaseDate.slice(0, 4) : null;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100));
  const remainingSeconds = Math.max(0, duration - currentTime);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="zenox-pause-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          onClick={onResume}
          className="fixed inset-0 z-40 flex flex-col justify-between p-6 sm:p-12 cursor-pointer select-none overflow-hidden"
        >
          {/* Ambient Blurred Backdrop Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {backdropUrl && (
              <motion.img
                initial={{ scale: 1.08, filter: "blur(8px)" }}
                animate={{ scale: 1, filter: "blur(6px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                src={backdropUrl}
                alt={details.title}
                className="size-full object-cover object-center opacity-25"
              />
            )}
            {/* Cinematic Gradient Vignettes */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          </div>

          {/* Top Bar: Clean PAUSED Badge (no glowing dot, no X button) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex items-center justify-start w-full"
          >
            <div className="flex items-center px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              <span className="text-xs font-bold uppercase tracking-widest text-white/90">
                Paused
              </span>
            </div>
          </div>

          {/* Bottom / Middle Hero Information */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex flex-col max-w-3xl pb-2 sm:pb-6 cursor-default"
          >
            {/* Title / Logo */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={details.title}
                className="max-h-20 sm:max-h-28 max-w-xs sm:max-w-md object-contain object-left mb-3 filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
              />
            ) : (
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                {details.title}
              </h2>
            )}

            {/* TV Show Season & Episode pill */}
            {mediaType === "tv" && season && episode && (
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-md text-xs sm:text-sm font-bold text-white tracking-wide">
                  Season {season} · Episode {episode}
                </span>
              </div>
            )}

            {/* Metadata badges row */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold text-white/80 mb-3">
              {year && (
                <span className="px-2.5 py-0.5 rounded bg-white/10 border border-white/10">
                  {year}
                </span>
              )}
              {details.voteAverage > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold">
                  <Star className="size-3 fill-amber-300 text-amber-300" />
                  {details.voteAverage.toFixed(1)}
                </span>
              )}
              {remainingSeconds > 0 && (
                <span className="text-white/60">
                  {formatTime(remainingSeconds)} remaining
                </span>
              )}
              {details.genres?.slice(0, 3).map((g) => (
                <span
                  key={g.id}
                  className="px-2.5 py-0.5 rounded bg-white/10 border border-white/10 text-white/70"
                >
                  {g.name}
                </span>
              ))}
            </div>

            {/* Overview Synopsis */}
            {details.overview && (
              <p className="text-sm sm:text-base text-white/75 line-clamp-3 leading-relaxed max-w-2xl mb-6 drop-shadow">
                {details.overview}
              </p>
            )}

            {/* Playback Progress Timeline Bar */}
            <div className="w-full max-w-xl mb-6">
              <div className="flex items-center justify-between text-xs font-semibold text-white/60 mb-1.5 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onResume}
                className="group flex items-center gap-2.5 px-7 py-3 rounded-full bg-white text-black font-bold text-sm sm:text-base shadow-[0_4px_24px_rgba(255,255,255,0.25)] hover:bg-neutral-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="size-4 sm:size-5 fill-black text-black group-hover:scale-110 transition-transform" />
                <span>Resume Playback</span>
              </button>

              <button
                type="button"
                onClick={() => onSeek(Math.max(0, currentTime - 10))}
                title="Rewind 10s"
                className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/20 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
              >
                <RotateCcw className="size-4" />
                <span>-10s</span>
              </button>

              <button
                type="button"
                onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                title="Forward 10s"
                className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/20 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
              >
                <RotateCw className="size-4" />
                <span>+10s</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
