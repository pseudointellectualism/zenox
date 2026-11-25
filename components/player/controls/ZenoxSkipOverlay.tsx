"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FastForward, X } from "lucide-react";
import type { PlayerSegment } from "./ZenoxProgressBar";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useConnectionsStore } from "@/lib/store/useConnectionsStore";
import type { MediaType } from "@/lib/types";

export interface ZenoxSkipOverlayProps {
  currentTime: number;
  duration: number;
  segments?: PlayerSegment[];
  mediaType: MediaType;
  hasNextEpisode: boolean;
  onNextEpisode?: () => void;
  onSeek: (time: number) => void;
  season?: number;
  episode?: number;
  controlsVisible: boolean;
  isPlaying?: boolean;
}

export default function ZenoxSkipOverlay({
  currentTime,
  duration,
  segments,
  mediaType,
  hasNextEpisode,
  onNextEpisode,
  onSeek,
  season = 1,
  episode = 1,
  controlsVisible,
  isPlaying = true,
}: ZenoxSkipOverlayProps) {
  // 10,000ms (10s) elapsed progress tracker
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);

  const theintrodb = useConnectionsStore((s) => s.theintrodb);
  const theintrodbEnabled = theintrodb?.enabled ?? true;
  const autoplayNext = useSettingsStore((s) => s.autoplayNext) ?? true;

  // Stable ref for onNextEpisode callback to avoid effect churn
  const onNextEpisodeRef = useRef(onNextEpisode);
  useEffect(() => {
    onNextEpisodeRef.current = onNextEpisode;
  }, [onNextEpisode]);

  // Active segment detection based on currentTime
  const activeSegment = useMemo(() => {
    if (!theintrodbEnabled || !segments || segments.length === 0) return null;
    return segments.find((s) => currentTime >= s.start && currentTime < s.end) || null;
  }, [theintrodbEnabled, segments, currentTime]);

  // Series Next Episode detection when near end (last 90s of episode if no credits segment tagged)
  const showSeriesNextEpisode = useMemo(() => {
    if (mediaType !== "tv" || !hasNextEpisode || !onNextEpisodeRef.current) return false;
    if (activeSegment) return false;
    return duration > 180 && currentTime >= duration - 90;
  }, [mediaType, hasNextEpisode, activeSegment, duration, currentTime]);

  // Whether the next episode prompt (with countdown) should be active
  const isNextEpisodePrompt = useMemo(() => {
    if (mediaType !== "tv" || !hasNextEpisode || !onNextEpisodeRef.current) return false;
    if (activeSegment?.type === "credits") return true;
    if (showSeriesNextEpisode) return true;
    return false;
  }, [mediaType, hasNextEpisode, activeSegment, showSeriesNextEpisode]);

  // Reset elapsed timer and cancellation whenever the episode changes
  useEffect(() => {
    setElapsedMs(0);
    setIsCancelled(false);
  }, [season, episode]);

  // If prompt is not active, keep elapsedMs at 0
  useEffect(() => {
    if (!isNextEpisodePrompt) {
      setElapsedMs(0);
    }
  }, [isNextEpisodePrompt]);

  // Auto-advance countdown timer: runs only when prompt is active, autoplayNext is true, video is playing, and not cancelled!
  // Pauses automatically whenever the user pauses the video.
  useEffect(() => {
    if (!isNextEpisodePrompt || !autoplayNext || !isPlaying || isCancelled) {
      return;
    }

    const stepMs = 100;
    const interval = setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + stepMs;
        if (next >= 10000) {
          clearInterval(interval);
          // Automatically advance to next episode without user input!
          onNextEpisodeRef.current?.();
          return 10000;
        }
        return next;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [isNextEpisodePrompt, autoplayNext, isPlaying, isCancelled]);

  // Seconds remaining (10, 9, 8, ... 1)
  const secondsRemaining = Math.max(1, Math.ceil((10000 - elapsedMs) / 1000));
  // Slider progress percentage from 0% to 100%
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / 10000) * 100));

  // Regular skip action for intro, recap, preview, or movie credits
  const regularSkip = useMemo(() => {
    if (!activeSegment) return null;
    if (activeSegment.type === "intro") {
      return {
        label: "Skip Intro",
        onClick: () => onSeek(activeSegment.end + 0.2),
      };
    }
    if (activeSegment.type === "recap") {
      return {
        label: "Skip Recap",
        onClick: () => onSeek(activeSegment.end + 0.2),
      };
    }
    if (activeSegment.type === "preview") {
      return {
        label: "Skip Preview",
        onClick: () => onSeek(activeSegment.end + 0.2),
      };
    }
    if (activeSegment.type === "credits" && (mediaType !== "tv" || !hasNextEpisode)) {
      return {
        label: "Skip Credits",
        onClick: () => onSeek(activeSegment.end),
      };
    }
    return null;
  }, [activeSegment, mediaType, hasNextEpisode, onSeek]);

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onNextEpisodeRef.current?.();
    },
    [],
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 flex flex-col justify-end items-end p-4 sm:p-8"
      style={{
        paddingBottom: controlsVisible
          ? "calc(6.75rem + env(safe-area-inset-bottom))"
          : "calc(1.75rem + env(safe-area-inset-bottom))",
        transition: "padding-bottom 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <AnimatePresence mode="wait">
        {/* State 1: Next Episode with Slider Animation (Credits / Near End) */}
        {isNextEpisodePrompt && !isCancelled && (
          <motion.div
            key={`next-ep-countdown-${season}-${episode}`}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto select-none"
          >
            <div className="relative group w-56 sm:w-64 rounded-xl border-2 border-black bg-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Small X button top right */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCancelled(true);
                }}
                title="Cancel next episode"
                aria-label="Cancel auto-advance"
                className="absolute top-2.5 right-2.5 z-20 flex size-5 items-center justify-center rounded-full text-black/45 hover:text-black hover:bg-black/10 active:scale-90 transition-all cursor-pointer"
              >
                <X className="size-3.5 stroke-[2.5]" />
              </button>

              {/* Main Next Episode click target */}
              <button
                type="button"
                onClick={handleNext}
                className="flex flex-col w-full px-5 pt-3.5 pb-3 text-left hover:bg-neutral-50 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex flex-col pr-5">
                  <span className="text-base sm:text-lg font-black tracking-tight text-black leading-tight">
                    Next episode
                  </span>
                  {autoplayNext && (
                    <span className="text-xs sm:text-sm font-semibold text-neutral-600 mt-1 leading-tight">
                      Starting in {secondsRemaining}
                    </span>
                  )}
                </div>
              </button>

              {/* Slider / progress bar animating from left to right over 10s */}
              {autoplayNext && (
                <div className="h-1.5 w-full bg-neutral-200/80 overflow-hidden">
                  <div
                    className="h-full bg-black transition-[width] duration-100 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* State 2: Regular Skip Content (Intro, Recap, Preview, etc.) */}
        {!isNextEpisodePrompt && regularSkip && (
          <motion.div
            key={`regular-skip-${regularSkip.label}`}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto select-none"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                regularSkip.onClick();
              }}
              className="group flex items-center gap-2.5 rounded-lg border-2 border-black bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-200 hover:bg-neutral-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className="font-bold tracking-tight text-black">{regularSkip.label}</span>
              <FastForward className="size-4 text-black group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
