"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  FastForward,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Settings,
  SkipForward,
  Subtitles,
  Tv,
  Volume2,
  VolumeX,
} from "lucide-react";
import ZenoxProgressBar, { formatTime, type PlayerSegment } from "./ZenoxProgressBar";
import ZenoxSettingsMenu, {
  type MenuView,
  type QualityOption,
  type SubtitleOption,
  type AudioTrackOption,
} from "./ZenoxSettingsMenu";
import type { SubtitleCue } from "../utils/subtitles";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useConnectionsStore } from "@/lib/store/useConnectionsStore";
import type { MediaType } from "@/lib/types";

// Circular 10-second icons with "10" centered inside
function Rewind10Icon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="900"
        stroke="none"
        fill="currentColor"
      >
        10
      </text>
    </svg>
  );
}

function Forward10Icon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="900"
        stroke="none"
        fill="currentColor"
      >
        10
      </text>
    </svg>
  );
}

interface ZenoxBottomControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onTogglePip?: () => void;
  hasPip?: boolean;
  qualities: QualityOption[];
  currentQuality: number;
  onSelectQuality: (id: number) => void;
  currentServer?: number;
  onSelectServer?: (id: number) => void;
  subtitles: SubtitleOption[];
  currentSubtitle: number;
  onSelectSubtitle: (id: number) => void;
  onUploadSubtitle?: (track: SubtitleOption, cues?: SubtitleCue[]) => void;
  playbackRate: number;
  onSelectPlaybackRate: (rate: number) => void;
  audioTracks?: AudioTrackOption[];
  currentAudioTrack?: number;
  onSelectAudioTrack?: (id: number) => void;
  mediaType: MediaType;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
  onOpenEpisodes?: () => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  settingsOpen?: boolean;
  onToggleSettings?: () => void;
  onCloseSettings?: () => void;
  tmdbId?: string | number;
  mediaTitle?: string;
  season?: number;
  episode?: number;
  releaseYear?: number;
  segments?: PlayerSegment[];
}

export default function ZenoxBottomControls({
  isPlaying,
  onTogglePlay,
  onSkip,
  currentTime,
  duration,
  buffered,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  onTogglePip,
  hasPip = true,
  qualities,
  currentQuality,
  onSelectQuality,
  currentServer,
  onSelectServer,
  subtitles,
  currentSubtitle,
  onSelectSubtitle,
  onUploadSubtitle,
  playbackRate,
  onSelectPlaybackRate,
  audioTracks = [],
  currentAudioTrack = 0,
  onSelectAudioTrack,
  mediaType,
  hasNextEpisode,
  onNextEpisode,
  onOpenEpisodes,
  onScrubStart,
  onScrubEnd,
  settingsOpen: controlledSettingsOpen,
  onToggleSettings,
  onCloseSettings,
  tmdbId,
  mediaTitle,
  season,
  episode,
  releaseYear,
  segments = [],
}: ZenoxBottomControlsProps) {
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false);
  const settingsOpen = controlledSettingsOpen ?? internalSettingsOpen;
  const toggleSettings = onToggleSettings ?? (() => setInternalSettingsOpen((v) => !v));
  const closeSettings = onCloseSettings ?? (() => setInternalSettingsOpen(false));

  const [volumeHovered, setVolumeHovered] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  // Time display mode: "standard" (00:00 / 10:00) vs "remaining" (xx:xx left · Finishes at xx:xx)
  const [timeDisplayMode, setTimeDisplayMode] = useState<"standard" | "remaining">("standard");
  const clockFormat = useSettingsStore((s) => s.clockFormat) ?? "12h";

  // Tracks which submenu settings should open into
  const [settingsView, setSettingsView] = useState<MenuView>("main");

  const isSubtitlesMenuOpen =
    settingsOpen &&
    (settingsView === "subtitles" || settingsView === "subtitles-customize");

  const isSettingsMenuOpen =
    settingsOpen &&
    settingsView !== "subtitles" &&
    settingsView !== "subtitles-customize";

  const handleSubtitlesButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubtitlesMenuOpen) {
      closeSettings();
    } else {
      setSettingsView("subtitles");
      if (!settingsOpen) {
        toggleSettings();
      }
    }
  };

  const handleSettingsButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSettingsMenuOpen) {
      closeSettings();
    } else {
      setSettingsView("main");
      if (!settingsOpen) {
        toggleSettings();
      }
    }
  };

  const effectiveVolume = isMuted ? 0 : volume;

  const calculateVolumeFromX = useCallback(
    (clientX: number) => {
      if (!volumeBarRef.current) return;
      const rect = volumeBarRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onVolumeChange(ratio);
    },
    [onVolumeChange],
  );

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVolume(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    calculateVolumeFromX(e.clientX);
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingVolume) return;
    calculateVolumeFromX(e.clientX);
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingVolume) {
      setIsDraggingVolume(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Global window release fallback
  useEffect(() => {
    if (!isDraggingVolume) return;
    const onWindowPointerUp = () => setIsDraggingVolume(false);
    window.addEventListener("pointerup", onWindowPointerUp);
    return () => window.removeEventListener("pointerup", onWindowPointerUp);
  }, [isDraggingVolume]);

  const handleVolumeWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    onVolumeChange(newVol);
  };

  // Finish time calculation for remaining mode
  const remainingSeconds = Math.max(0, duration - currentTime);
  const finishDate = new Date(Date.now() + remainingSeconds * 1000);
  const finishTimeStr = finishDate.toLocaleTimeString([], {
    hour: clockFormat === "24h" ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: clockFormat !== "24h",
  });

  // TheIntroDB settings & timeline colors
  const theintrodb = useConnectionsStore((s) => s.theintrodb);
  const theintrodbEnabled = theintrodb?.enabled ?? true;
  const theintrodbColors = theintrodb?.colors;

  return (
    <div className="relative flex w-full flex-col px-3 pb-3 pt-2 sm:px-8 sm:pb-6 select-none pb-[calc(0.75rem+env(safe-area-inset-bottom))] pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))]">
      {/* Settings Backdrop: Click anywhere closes settings first without pausing video */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => {
              e.stopPropagation();
              closeSettings();
            }}
            className="fixed inset-0 z-40 cursor-default"
          />
        )}
      </AnimatePresence>

      {/* Settings Popover (Clean bottom-to-top entrance animation) */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            key="settings-popover"
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 340,
              mass: 0.8,
            }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute bottom-16 sm:bottom-20 right-2 sm:right-8 z-50 pointer-events-auto max-w-[calc(100vw-1rem)]"
          >
            <ZenoxSettingsMenu
              qualities={qualities}
              currentQuality={currentQuality}
              onSelectQuality={onSelectQuality}
              currentServer={currentServer}
              onSelectServer={onSelectServer}
              subtitles={subtitles}
              currentSubtitle={currentSubtitle}
              onSelectSubtitle={onSelectSubtitle}
              onUploadSubtitle={onUploadSubtitle}
              playbackRate={playbackRate}
              onSelectPlaybackRate={onSelectPlaybackRate}
              audioTracks={audioTracks}
              currentAudioTrack={currentAudioTrack}
              onSelectAudioTrack={onSelectAudioTrack}
              onClose={closeSettings}
              initialView={settingsView}
              onViewChange={setSettingsView}
              tmdbId={tmdbId}
              mediaTitle={mediaTitle}
              mediaType={mediaType}
              season={season}
              episode={episode}
              releaseYear={releaseYear}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress timeline bar */}
      <div className="mb-2">
        <ZenoxProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onSeek={onSeek}
          onScrubStart={onScrubStart}
          onScrubEnd={onScrubEnd}
          segments={theintrodbEnabled ? segments : []}
          segmentColors={theintrodbColors}
        />
      </div>

      {/* Control buttons row (z-50 so controls remain interactive above backdrop) */}
      <div className="relative z-50 flex items-center justify-between gap-4">
        {/* Left cluster */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Play/Pause (Enlarged) */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid size-11 sm:size-12 place-items-center rounded-full text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="size-5.5 sm:size-6 fill-current" />
            ) : (
              <Play className="size-5.5 sm:size-6 fill-current translate-x-0.5" />
            )}
          </button>

          {/* 10s Rewind (Enlarged with circular 10s icon) */}
          <button
            type="button"
            onClick={() => onSkip(-10)}
            aria-label="Rewind 10 seconds"
            className="grid size-10 sm:size-10.5 place-items-center rounded-full text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
          >
            <Rewind10Icon className="size-5.5 sm:size-6" />
          </button>

          {/* 10s Fast Forward (Enlarged with circular 10s icon) */}
          <button
            type="button"
            onClick={() => onSkip(10)}
            aria-label="Fast forward 10 seconds"
            className="grid size-10 sm:size-10.5 place-items-center rounded-full text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
          >
            <Forward10Icon className="size-5.5 sm:size-6" />
          </button>

          {/* Volume cluster with ultra-responsive draggable slider */}
          <div
            onMouseEnter={() => setVolumeHovered(true)}
            onMouseLeave={() => setVolumeHovered(false)}
            onWheel={handleVolumeWheel}
            className="hidden sm:flex items-center"
          >
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
              className="grid size-10 sm:size-10.5 place-items-center rounded-full text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="size-5.5 stroke-[2.5] text-white/80" />
              ) : (
                <Volume2 className="size-5.5 stroke-[2.5]" />
              )}
            </button>

            {/* Draggable volume slider with zero-latency thumb & bar */}
            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                volumeHovered || isDraggingVolume
                  ? "w-22 sm:w-28 opacity-100 pr-2"
                  : "w-0 opacity-0"
              }`}
            >
              <div
                ref={volumeBarRef}
                onPointerDown={handleVolumePointerDown}
                onPointerMove={handleVolumePointerMove}
                onPointerUp={handleVolumePointerUp}
                className="relative flex h-7 w-full cursor-pointer items-center touch-none select-none"
              >
                {/* Track background */}
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                  {/* Fill: transition-none when dragging so it is 1:1 hardware synced with cursor */}
                  <div
                    className={`h-full rounded-full bg-primary ${
                      isDraggingVolume ? "transition-none" : "transition-all duration-100"
                    }`}
                    style={{ width: `${effectiveVolume * 100}%` }}
                  />
                </div>

                {/* Visible Thumb indicator with Basement halo style */}
                <div
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 size-4 rounded-full border-[3px] border-primary/50 bg-white shadow-[0_0_8px_var(--color-primary)] ${
                    isDraggingVolume || volumeHovered
                      ? "scale-100 opacity-100"
                      : "scale-0 opacity-0"
                  } ${isDraggingVolume ? "transition-none" : "transition-all duration-100"}`}
                  style={{ left: `calc(${effectiveVolume * 100}% - 8px)` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Timestamp button (toggles remaining / finish time) */}
          <button
            type="button"
            onClick={() => setTimeDisplayMode((m) => (m === "standard" ? "remaining" : "standard"))}
            aria-label="Toggle time display mode"
            title="Click to toggle remaining time & finish time"
            className="cursor-pointer rounded-lg px-1 sm:px-2.5 py-1 text-label-sm sm:text-base font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          >
            {timeDisplayMode === "standard" ? (
              <span className="flex items-center">
                <span>{formatTime(currentTime)}</span>
                <span className="mx-1 text-white/35">/</span>
                <span>{formatTime(duration)}</span>
              </span>
            ) : (
              <span className="flex items-center">
                <span>{formatTime(remainingSeconds)} left</span>
                <span className="hidden sm:inline mx-1.5 text-white/40 font-bold">·</span>
                <span className="hidden sm:inline">Finishes at {finishTimeStr}</span>
              </span>
            )}
          </button>
        </div>

        {/* Right cluster (All buttons tiny bigger) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* TV Shows: Episodes list drawer */}
          {mediaType === "tv" && onOpenEpisodes && (
            <button
              type="button"
              onClick={onOpenEpisodes}
              aria-label="Episodes"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-label-md font-medium text-white backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:bg-white/15 active:scale-95"
            >
              <Tv className="size-4.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Episodes</span>
            </button>
          )}

          {/* TV Shows: Next Episode button */}
          {mediaType === "tv" && hasNextEpisode && onNextEpisode && (
            <button
              type="button"
              onClick={onNextEpisode}
              aria-label="Next episode"
              className="grid size-10 sm:size-10.5 place-items-center rounded-full text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
            >
              <SkipForward className="size-5 stroke-[2.5]" />
            </button>
          )}

          {/* Subtitles button: opens Subtitles settings, indicates when open, and closes when clicked again */}
          <button
            type="button"
            onClick={handleSubtitlesButtonClick}
            aria-label="Subtitles"
            title={
              isSubtitlesMenuOpen
                ? "Close Subtitles"
                : currentSubtitle !== -1
                ? "Subtitles: On"
                : "Subtitles: Off"
            }
            className={`grid size-10 sm:size-10.5 place-items-center rounded-full transition-all duration-200 active:scale-95 ${
              isSubtitlesMenuOpen
                ? currentSubtitle !== -1
                  ? "bg-primary text-on-primary font-bold shadow-sm ring-2 ring-primary/40"
                  : "bg-primary/20 text-primary"
                : currentSubtitle !== -1
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-white hover:bg-white/15"
            }`}
          >
            <Subtitles className="size-5 stroke-[2.5]" />
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={handleSettingsButtonClick}
            aria-label="Playback Settings"
            title={isSettingsMenuOpen ? "Close Settings" : "Playback Settings"}
            className={`grid size-10 sm:size-10.5 place-items-center rounded-full transition-all duration-200 active:scale-95 ${
              isSettingsMenuOpen
                ? "bg-primary/20 text-primary rotate-45"
                : "text-white hover:bg-white/15"
            }`}
          >
            <Settings className="size-5 stroke-[2.5] transition-transform duration-300" />
          </button>

          {/* Picture in Picture */}
          {hasPip && onTogglePip && (
            <button
              type="button"
              onClick={onTogglePip}
              aria-label="Picture in Picture"
              className="hidden sm:grid size-10 sm:size-10.5 place-items-center rounded-full text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
            >
              <PictureInPicture2 className="size-5 stroke-[2.5]" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="grid size-10 sm:size-10.5 place-items-center rounded-full text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
          >
            {isFullscreen ? (
              <Minimize className="size-5 stroke-[2.5]" />
            ) : (
              <Maximize className="size-5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
