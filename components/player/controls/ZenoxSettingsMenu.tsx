"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Gauge,
  Moon,
  Search,
  Server,
  SlidersHorizontal,
  Subtitles,
  Type,
  Upload,
  Users,
  Volume2,
  X,
} from "lucide-react";
import ZenoxSubtitleCustomizer from "./ZenoxSubtitleCustomizer";
import ZenoxVideoSettings from "./ZenoxVideoSettings";
import ZenoxAdvancedColor from "./ZenoxAdvancedColor";
import {
  ZenoxDownloadsMenu,
  ZenoxServerOneDownloads,
  ZenoxServerTwoDownloads,
} from "./ZenoxDownloads";
import { Toggle } from "@/components/ui/SettingControls";
import FlagIcon from "@/components/ui/FlagIcon";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import {
  extractLanguageName,
  matchSubtitleTrack,
  parseSubtitles,
  type SubtitleCue,
} from "../utils/subtitles";
import type { MediaType } from "@/lib/types";

export interface QualityOption {
  id: number; // -1 for auto, or level index
  label: string; // e.g. "Auto", "4K", "1080p", "720p", "480p", "360p", "240p"
  height?: number;
  bitrate?: number;
  available?: boolean;
}

export interface SubtitleOption {
  id: number; // -1 for off, or track index
  label: string; // e.g. "English", "Off"
  lang?: string;
  src?: string; // external .vtt or .srt url
  content?: string; // raw file content if uploaded
  isCustom?: boolean; // uploaded by user
  source?: string; // e.g. "wyzie", "opensubs", "granite", "meowtv", "source"
  type?: "vtt" | "srt";
  isHearingImpaired?: boolean;
}

function renderSubtitleSourceBadge(
  source?: string,
  isCustom?: boolean,
  isHearingImpaired?: boolean,
  active?: boolean,
) {
  if (isCustom) {
    return (
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${active ? "bg-black/15 text-black font-black" : "bg-white/15 text-white/80"
          }`}
      >
        Custom
      </span>
    );
  }

  if (!source) return null;

  const srcLower = source.toLowerCase();
  let badgeClasses = "bg-white/10 text-white/70";
  let badgeLabel = source.toUpperCase();

  if (srcLower.includes("wyzie")) {
    badgeClasses = active
      ? "bg-black/20 text-black font-bold"
      : "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    badgeLabel = "WYZIE";
  } else if (srcLower.includes("opensub")) {
    badgeClasses = active
      ? "bg-black/20 text-black font-bold"
      : "bg-amber-500/20 text-amber-300 border border-amber-500/30";
    badgeLabel = "OPENSUBS";
  } else if (srcLower.includes("granite")) {
    badgeClasses = active
      ? "bg-black/20 text-black font-bold"
      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    badgeLabel = "GRANITE";
  } else if (srcLower.includes("meowtv")) {
    badgeClasses = active
      ? "bg-black/20 text-black font-bold"
      : "bg-purple-500/20 text-purple-300 border border-purple-500/30";
    badgeLabel = "MEOWTV";
  } else if (srcLower.includes("source") || srcLower.includes("cinejoy")) {
    badgeClasses = active
      ? "bg-black/20 text-black font-bold"
      : "bg-teal-500/20 text-teal-300 border border-teal-500/30";
    badgeLabel = "SOURCE";
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2">
      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeClasses}`}>
        {badgeLabel}
      </span>
      {isHearingImpaired && (
        <span
          className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${active ? "bg-black/15 text-black" : "bg-white/10 text-white/75"
            }`}
        >
          CC
        </span>
      )}
    </div>
  );
}

export interface AudioTrackOption {
  id: number;
  label: string;
  lang?: string;
}

export type MenuView =
  | "main"
  | "quality"
  | "sources"
  | "subtitles"
  | "subtitles-group"
  | "subtitles-customize"
  | "audio"
  | "sleep-timer"
  | "watch-party"
  | "playback"
  | "advanced-color"
  | "downloads"
  | "downloads-server1"
  | "downloads-server2";

export interface StreamServerOption {
  id: number;
  name: string;
  description: string;
}

export const STREAM_SERVERS: StreamServerOption[] = [
  { id: 0, name: "Stellar", description: "Default high-speed streaming source" },
  { id: 1, name: "Sydney", description: "Alternative high-performance source" },
  { id: 2, name: "Sienna", description: "Relies on 3 multi-subserver sources" },
];

interface ZenoxSettingsMenuProps {
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
  onClose?: () => void;
  initialView?: MenuView;
  onViewChange?: (view: MenuView) => void;
  tmdbId?: string | number;
  mediaTitle?: string;
  mediaType?: MediaType;
  season?: number;
  episode?: number;
  releaseYear?: number;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const SLEEP_TIMER_OPTIONS = [
  { id: "off", label: "Off" },
  { id: "15", label: "15 Minutes" },
  { id: "30", label: "30 Minutes" },
  { id: "45", label: "45 Minutes" },
  { id: "60", label: "60 Minutes" },
  { id: "end", label: "End of Episode" },
];

export default function ZenoxSettingsMenu({
  qualities,
  currentQuality,
  onSelectQuality,
  currentServer = 0,
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
  onClose,
  initialView = "main",
  onViewChange,
  tmdbId,
  mediaTitle,
  mediaType,
  season,
  episode,
  releaseYear,
}: ZenoxSettingsMenuProps) {
  const [view, setView] = useState<MenuView>(initialView);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [customizerSource, setCustomizerSource] = useState<"main" | "subtitles">("main");
  const [selectedSleepTimer, setSelectedSleepTimer] = useState<string>("off");
  const [subtitleSearchQuery, setSubtitleSearchQuery] = useState<string>("");
  const [selectedLanguageGroup, setSelectedLanguageGroup] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const navigateTo = (nextView: MenuView) => {
    setDirection("forward");
    setView(nextView);
    onViewChange?.(nextView);
  };

  const navigateBack = () => {
    setDirection("backward");
    setView("main");
    onViewChange?.("main");
  };

  const navigateBackToSubtitles = () => {
    setDirection("backward");
    setView("subtitles");
    onViewChange?.("subtitles");
  };

  const navigateBackToPlayback = () => {
    setDirection("backward");
    setView("playback");
    onViewChange?.("playback");
  };

  const navigateBackToDownloads = () => {
    setDirection("backward");
    setView("downloads");
    onViewChange?.("downloads");
  };

  const preferredQuality = useSettingsStore((s) => s.preferredQuality) ?? "1080p";

  // Find the highest resolution tier actually available in this stream (4K, 1080p, 720p, etc.)
  const highestAvailableQuality = useMemo(() => {
    const found = qualities.find((q) => q.id !== -1 && q.available !== false);
    return found ? found.label : null;
  }, [qualities]);

  const autoResolvedLabel = useMemo(() => {
    if (preferredQuality === "auto") {
      return highestAvailableQuality;
    }
    const prefItem = qualities.find((q) => q.label.toLowerCase() === preferredQuality.toLowerCase());
    if (prefItem && prefItem.available !== false) {
      return prefItem.label;
    }
    return highestAvailableQuality;
  }, [preferredQuality, highestAvailableQuality, qualities]);

  const currentQualityLabel =
    currentQuality === -1
      ? autoResolvedLabel
        ? `Auto (${autoResolvedLabel})`
        : "Auto"
      : qualities.find((q) => q.id === currentQuality)?.label || "Auto";
  const currentSubtitleLabel =
    subtitles.find((s) => s.id === currentSubtitle)?.label || "Off";
  const isSubtitlesEnabled = currentSubtitle !== -1;

  const hasMultipleAudio = Boolean(audioTracks && audioTracks.length > 1);
  const currentAudioLabel = hasMultipleAudio
    ? audioTracks.find((a) => a.id === currentAudioTrack)?.label ||
    `Track ${(currentAudioTrack ?? 0) + 1}`
    : "Default";

  const subtitleLanguage = useSettingsStore((s) => s.subtitleLanguage) ?? "en";
  const setSetting = useSettingsStore((s) => s.set);

  const toggleSubtitlesEnabled = () => {
    if (isSubtitlesEnabled) {
      onSelectSubtitle(-1);
      setSetting("subtitlesEnabled", false);
    } else {
      // Pick preferred language from settings (e.g. French, Arabic) if available
      const preferredTrack = matchSubtitleTrack(subtitles, subtitleLanguage);
      if (preferredTrack) {
        onSelectSubtitle(preferredTrack.id);
      } else {
        const firstAvailable = subtitles.find((s) => s.id !== -1);
        if (firstAvailable) {
          onSelectSubtitle(firstAvailable.id);
        } else {
          onSelectSubtitle(0);
        }
      }
      setSetting("subtitlesEnabled", true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "srt" && ext !== "vtt" && ext !== "sub") {
      setUploadError("Unsupported format. Please upload a .srt or .vtt file.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== "string") {
        setUploadError("Failed to read subtitle file.");
        return;
      }

      try {
        const cues = parseSubtitles(content);
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        const newTrack: SubtitleOption = {
          id: 50000 + Math.floor(Math.random() * 10000),
          label: cleanName,
          lang: "Custom",
          content,
          isCustom: true,
        };

        onUploadSubtitle?.(newTrack, cues);
        onSelectSubtitle(newTrack.id);
        onClose?.();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Error parsing subtitle file.");
      }
    };

    reader.onerror = () => {
      setUploadError("Failed to read file.");
    };

    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  // Group subtitles by language
  const groupedSubtitles = useMemo(() => {
    const groups: Map<string, { languageName: string; tracks: SubtitleOption[] }> = new Map();

    for (const sub of subtitles) {
      const langName = sub.isCustom
        ? "Uploaded"
        : extractLanguageName(sub.lang, sub.label);
      const groupKey = langName.trim().toLowerCase();
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { languageName: langName, tracks: [] });
      }
      groups.get(groupKey)!.tracks.push(sub);
    }

    const result: Array<{
      languageName: string;
      tracks: SubtitleOption[];
      isGroup: boolean;
    }> = [];

    groups.forEach(({ languageName, tracks }) => {
      result.push({
        languageName,
        tracks,
        isGroup: tracks.length > 1,
      });
    });

    // Sort: "Uploaded" first, then "English", then alphabetical
    return result.sort((a, b) => {
      if (a.languageName === "Uploaded") return -1;
      if (b.languageName === "Uploaded") return 1;
      if (a.languageName === "English") return -1;
      if (b.languageName === "English") return 1;
      return a.languageName.localeCompare(b.languageName);
    });
  }, [subtitles]);

  // Filter groups by search query
  const filteredSubtitleGroups = useMemo(() => {
    const q = subtitleSearchQuery.trim().toLowerCase();
    if (!q) return groupedSubtitles;

    return groupedSubtitles
      .map((g) => {
        if (g.languageName.toLowerCase().includes(q)) {
          return g;
        }
        const matchingTracks = g.tracks.filter(
          (t) =>
            t.label.toLowerCase().includes(q) ||
            (t.lang && t.lang.toLowerCase().includes(q)) ||
            (t.source && t.source.toLowerCase().includes(q)),
        );
        if (matchingTracks.length > 0) {
          return {
            ...g,
            tracks: matchingTracks,
            isGroup: matchingTracks.length > 1,
          };
        }
        return null;
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [groupedSubtitles, subtitleSearchQuery]);


  const slideVariants = {
    initial: (dir: "forward" | "backward") => ({
      opacity: 0,
      x: dir === "forward" ? 16 : -16,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.16, ease: "easeOut" as const },
    },
    exit: (dir: "forward" | "backward") => ({
      opacity: 0,
      x: dir === "forward" ? -16 : 16,
      transition: { duration: 0.12, ease: "easeIn" as const },
    }),
  };

  const sleepTimerLabel =
    SLEEP_TIMER_OPTIONS.find((s) => s.id === selectedSleepTimer)?.label || "Off";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-4.5rem)] sm:max-h-[75vh] overflow-y-auto overscroll-contain touch-pan-y [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] rounded-2xl border border-white/15 bg-black/94 p-3 text-white shadow-2xl backdrop-blur-2xl transition-all duration-200 ${view === "subtitles-customize"
          ? "w-84 sm:w-[370px]"
          : view === "downloads-server1" || view === "downloads-server2"
            ? "w-88 sm:w-[410px]"
            : "w-80 sm:w-88"
        }`}
    >
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        {/* ============================================================ */}
        {/* MAIN VIEW: CINEJOY-STYLE 2X2 CARDS GRID + ACTION ROWS        */}
        {/* ============================================================ */}
        {view === "main" && (
          <motion.div
            key="main"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-2.5"
          >
            {/* Top 2x2 Grid of Rounded Cards */}
            <div className="grid grid-cols-2 gap-2">
              {/* Quality Card */}
              <button
                type="button"
                onClick={() => navigateTo("quality")}
                className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.06] p-3 text-left transition-all hover:border-white/25 hover:bg-white/[0.1] active:scale-[0.98]"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 group-hover:text-white/75">
                  <span className="rounded bg-primary/20 px-1 py-0.2 text-[9px] font-black text-primary">
                    HQ
                  </span>
                  <span>QUALITY</span>
                </div>
                <div className="mt-2 text-base font-bold text-white tracking-tight">
                  {currentQualityLabel}
                </div>
              </button>

              {/* Server Card */}
              <button
                type="button"
                onClick={() => navigateTo("sources")}
                className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.06] p-3 text-left transition-all hover:border-white/25 hover:bg-white/[0.1] active:scale-[0.98]"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 group-hover:text-white/75">
                  <Server className="size-3.5 stroke-[2.5] text-white/80" />
                  <span>SERVER</span>
                </div>
                <div className="mt-2 text-base font-bold text-white tracking-tight truncate">
                  {currentServer === 2 ? "Sienna" : currentServer === 1 ? "Sydney" : "Stellar"}
                </div>
              </button>

              {/* Subtitles Card */}
              <button
                type="button"
                onClick={() => navigateTo("subtitles")}
                className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.06] p-3 text-left transition-all hover:border-white/25 hover:bg-white/[0.1] active:scale-[0.98]"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 group-hover:text-white/75">
                  <Subtitles className="size-3.5 stroke-[2.5] text-white/80" />
                  <span>SUBTITLES</span>
                </div>
                <div className="mt-2 text-base font-bold text-white tracking-tight truncate">
                  {currentSubtitleLabel}
                </div>
              </button>

              {/* Audio Card (grayed out & disabled when only 1 audio track or undetected) */}
              <button
                type="button"
                disabled={!hasMultipleAudio}
                onClick={() => {
                  if (hasMultipleAudio) navigateTo("audio");
                }}
                className={`group flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${hasMultipleAudio
                    ? "border-white/10 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.1] active:scale-[0.98] cursor-pointer"
                    : "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed pointer-events-none"
                  }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 group-hover:text-white/75">
                  <Volume2 className="size-3.5 stroke-[2.5] text-white/80" />
                  <span>AUDIO</span>
                </div>
                <div className="mt-2 text-base font-bold text-white tracking-tight truncate">
                  {currentAudioLabel}
                </div>
              </button>
            </div>

            {/* Action Rows */}
            <div className="flex flex-col gap-0.5 pt-1">
              {/* Sleep Timer (Commented out for future use) */}
              {/*
              <button
                type="button"
                onClick={() => navigateTo("sleep-timer")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-label-md font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Moon className="size-4.5 stroke-[2.5] text-white/90" />
                  <span>Sleep Timer</span>
                </div>
                <div className="flex items-center gap-1.5 text-label-sm font-semibold text-white/60">
                  <span>{sleepTimerLabel}</span>
                  <ChevronRight className="size-4 stroke-[2.5] text-white/60" />
                </div>
              </button>
              */}

              {/* Download */}
              <button
                type="button"
                onClick={() => navigateTo("downloads")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-label-md font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Download className="size-4.5 stroke-[2.5] text-white/90" />
                  <span>Download</span>
                </div>
                <ChevronRight className="size-4 stroke-[2.5] text-white/60" />
              </button>

              {/* Watch Party */}
              <button
                type="button"
                onClick={() => navigateTo("watch-party")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-label-md font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Users className="size-4.5 stroke-[2.5] text-white/90" />
                  <span>Watch Party</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Next update
                  </span>
                  <ChevronRight className="size-4 stroke-[2.5] text-white/60" />
                </div>
              </button>

              <div className="my-1.5 h-px bg-white/10" />

              {/* Enable Subtitles Toggle Row with animated spring Toggle */}
              <div className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-label-md font-semibold text-white/90">
                <div className="flex items-center gap-3">
                  <Subtitles className="size-4.5 stroke-[2.5] text-white/90" />
                  <span>Enable Subtitles</span>
                </div>
                <Toggle
                  id="toggle-subtitles"
                  checked={isSubtitlesEnabled}
                  onChange={toggleSubtitlesEnabled}
                  label="Enable Subtitles"
                />
              </div>

              {/* Playback Settings */}
              <button
                type="button"
                onClick={() => navigateTo("playback")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-label-md font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Gauge className="size-4.5 stroke-[2.5] text-white/90" />
                  <span>Playback Settings</span>
                </div>
                <ChevronRight className="size-4 stroke-[2.5] text-white/60" />
              </button>

              {/* Subtitle Settings */}
              <button
                type="button"
                onClick={() => {
                  setCustomizerSource("main");
                  navigateTo("subtitles-customize");
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-label-md font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Type className="size-4.5 stroke-[2.5] text-white/90" />
                  <span>Subtitle Settings</span>
                </div>
                <ChevronRight className="size-4 stroke-[2.5] text-white/60" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* QUALITY SUBMENU                                              */}
        {/* ============================================================ */}
        {view === "quality" && (
          <motion.div
            key="quality"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <button
              type="button"
              onClick={navigateBack}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-label-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
            >
              <ChevronLeft className="size-4 stroke-[2.5]" />
              <span>Quality</span>
            </button>
            <div className="my-1 h-px bg-white/10" />

            {qualities.map((q) => {
              const active = q.id === currentQuality;
              const isAvailable = q.available !== false;

              return (
                <button
                  key={`${q.label}-${q.id}`}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    if (!isAvailable) return;
                    onSelectQuality(q.id);
                    onClose?.();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-label-md transition-all ${!isAvailable
                      ? "cursor-not-allowed text-white/30"
                      : active
                        ? "bg-primary text-on-primary font-bold shadow-sm"
                        : "text-white/85 hover:bg-white/10 hover:text-white active:scale-[0.99]"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{q.label}</span>
                    {q.id === -1 && autoResolvedLabel && (
                      <span className="text-[11px] opacity-70 font-normal">
                        ({autoResolvedLabel})
                      </span>
                    )}
                    {!isAvailable && (
                      <span className="text-[10px] uppercase tracking-wider text-white/25">
                        Unavailable
                      </span>
                    )}
                  </div>
                  {active && <Check className="size-4 stroke-[3]" />}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SERVER / SOURCES SUBMENU                                     */}
        {/* ============================================================ */}
        {view === "sources" && (
          <motion.div
            key="sources"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <button
              type="button"
              onClick={navigateBack}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-label-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
            >
              <ChevronLeft className="size-4 stroke-[2.5]" />
              <span>Streaming Servers</span>
            </button>
            <div className="my-1 h-px bg-white/10" />

            {STREAM_SERVERS.map((srv) => {
              const active = srv.id === currentServer;
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => {
                    onSelectServer?.(srv.id);
                    onClose?.();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-label-md transition-all ${active
                      ? "bg-primary text-on-primary font-bold shadow-sm"
                      : "text-white/85 hover:bg-white/10 hover:text-white active:scale-[0.99]"
                    }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold">{srv.name}</span>
                    <span
                      className={`text-[11px] font-normal ${active ? "opacity-80" : "text-white/50"
                        }`}
                    >
                      {srv.description}
                    </span>
                  </div>
                  {active && <Check className="size-4 stroke-[3]" />}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SUBTITLES TRACKS LIST SUBMENU                                */}
        {/* ============================================================ */}
        {view === "subtitles" && (
          <motion.div
            key="subtitles"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            {/* Header: < Settings (left) and Customize (right) */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={navigateBack}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-label-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
              >
                <ChevronLeft className="size-4 stroke-[2.5]" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomizerSource("subtitles");
                  navigateTo("subtitles-customize");
                }}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-label-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.98]"
              >
                <SlidersHorizontal className="size-3.5 stroke-[2.5] text-white" />
                <span>Customize</span>
              </button>
            </div>

            {/* Search Language Bar */}
            <div className="relative my-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/40 pointer-events-none" />
              <input
                type="text"
                value={subtitleSearchQuery}
                onChange={(e) => setSubtitleSearchQuery(e.target.value)}
                placeholder="Search language..."
                className="w-full rounded-xl bg-white/[0.06] border border-white/10 py-2 pl-9 pr-8 text-label-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/[0.1] transition-all"
              />
              {subtitleSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSubtitleSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Upload Subtitle File Option */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-3.5 py-2 text-label-md text-white/90 transition-all hover:bg-white/[0.09] hover:border-white/40 active:scale-[0.99] group mb-0.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white/80 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <Upload className="size-3.5 stroke-[2.5]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-white text-xs">Upload Subtitle File</span>
                  <span className="text-[10px] text-white/50">Supports .srt or .vtt</span>
                </div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt,.vtt,.sub,text/vtt,text/plain"
              className="hidden"
              onChange={handleFileUpload}
            />

            {uploadError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-200">
                <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Off option (placed above the line) */}
            <button
              type="button"
              onClick={() => {
                onSelectSubtitle(-1);
                onClose?.();
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-label-md transition-colors ${currentSubtitle === -1
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-white/85 hover:bg-white/10 hover:text-white active:scale-[0.99]"
                }`}
            >
              <span>Off</span>
              {currentSubtitle === -1 && <Check className="size-4 stroke-[3]" />}
            </button>

            {/* The line separating the languages that will be shown */}
            <div className="my-1 h-px bg-white/10" />

            {/* Subtitle languages list container */}
            <div className="max-h-[44vh] overflow-y-auto pr-0.5 flex flex-col gap-1 rail rail-hide no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {filteredSubtitleGroups.length === 0 ? (
                <div className="px-3 py-4 text-center text-label-sm text-white/40">
                  {subtitleSearchQuery
                    ? `No languages matching "${subtitleSearchQuery}"`
                    : "No subtitles available"}
                </div>
              ) : (
                filteredSubtitleGroups.map((group) => {
                  if (group.isGroup) {
                    // Group of multiple tracks for this language (e.g. multiple English subtitles)
                    const activeTrackInGroup = group.tracks.find(
                      (t) => t.id === currentSubtitle,
                    );
                    const isGroupActive = Boolean(activeTrackInGroup);

                    return (
                      <button
                        key={group.languageName}
                        type="button"
                        onClick={() => {
                          setSelectedLanguageGroup(group.languageName);
                          navigateTo("subtitles-group");
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-label-md transition-colors ${isGroupActive
                            ? "bg-white/[0.12] text-white font-medium"
                            : "text-white/85 hover:bg-white/10 hover:text-white active:scale-[0.99]"
                          }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FlagIcon lang={group.languageName} />
                          <span className="truncate">{group.languageName}</span>
                          {isGroupActive && (
                            <span className="text-[11px] text-white/60 font-normal truncate">
                              • {activeTrackInGroup?.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                            {group.tracks.length}
                          </span>
                          <ChevronRight className="size-4 text-white/40" />
                        </div>
                      </button>
                    );
                  }

                  // Single track for this language
                  const track = group.tracks[0];
                  const active = track.id === currentSubtitle;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => {
                        onSelectSubtitle(track.id);
                        onClose?.();
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-label-md transition-colors ${active
                          ? "bg-primary text-on-primary font-bold shadow-sm"
                          : "text-white/85 hover:bg-white/10 hover:text-white active:scale-[0.99]"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <FlagIcon lang={group.languageName} isCustom={track.isCustom} />
                        <span className="truncate">{track.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {renderSubtitleSourceBadge(track.source, track.isCustom, track.isHearingImpaired, active)}
                        {active && <Check className="size-4 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SUBTITLES LANGUAGE GROUP SUBMENU (e.g. English variants)     */}
        {/* ============================================================ */}
        {view === "subtitles-group" && (
          <motion.div
            key="subtitles-group"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <button
              type="button"
              onClick={navigateBackToSubtitles}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-label-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
            >
              <ChevronLeft className="size-4 stroke-[2.5]" />
              <div className="flex items-center gap-2 truncate">
                <FlagIcon lang={selectedLanguageGroup || ""} />
                <span>{selectedLanguageGroup || "Subtitles"}</span>
              </div>
            </button>
            <div className="my-1 h-px bg-white/10" />

            <div className="max-h-[46vh] overflow-y-auto pr-0.5 flex flex-col gap-1 rail rail-hide no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {groupedSubtitles
                .find(
                  (g) =>
                    g.languageName.toLowerCase() ===
                    selectedLanguageGroup?.toLowerCase(),
                )
                ?.tracks.map((sub) => {
                  const active = sub.id === currentSubtitle;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        onSelectSubtitle(sub.id);
                        onClose?.();
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-label-md transition-colors ${active
                          ? "bg-primary text-on-primary font-bold shadow-sm"
                          : "text-white/85 hover:bg-white/10 hover:text-white active:scale-[0.99]"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <FlagIcon lang={selectedLanguageGroup || ""} isCustom={sub.isCustom} />
                        <span className="truncate">{sub.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {renderSubtitleSourceBadge(sub.source, sub.isCustom, sub.isHearingImpaired, active)}
                        {active && <Check className="size-4 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SUBTITLES CUSTOMIZER SUBMENU (SPACIOUS & SMOOTH SCROLL)      */}
        {/* ============================================================ */}
        {view === "subtitles-customize" && (
          <motion.div
            key="subtitles-customize"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <ZenoxSubtitleCustomizer
              onBack={() => {
                if (customizerSource === "main") {
                  navigateBack();
                } else {
                  navigateBackToSubtitles();
                }
              }}
              backLabel={customizerSource === "main" ? "Settings" : "Subtitles"}
            />
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* AUDIO TRACKS SUBMENU                                         */}
        {/* ============================================================ */}
        {view === "audio" && (
          <motion.div
            key="audio"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <button
              type="button"
              onClick={navigateBack}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-label-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
            >
              <ChevronLeft className="size-4 stroke-[2.5]" />
              <span>Audio</span>
            </button>
            <div className="my-1 h-px bg-white/10" />

            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
              {audioTracks && audioTracks.length > 0 ? (
                audioTracks.map((track) => {
                  const isSelected = track.id === currentAudioTrack;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => {
                        onSelectAudioTrack?.(track.id);
                        navigateBack();
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-label-md transition-colors ${isSelected
                          ? "bg-primary text-on-primary font-bold shadow-sm"
                          : "text-white/85 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      <span>{track.label}</span>
                      {isSelected && <Check className="size-4 stroke-[3]" />}
                    </button>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-white/40">
                  No additional audio tracks available
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SLEEP TIMER SUBMENU                                          */}
        {/* ============================================================ */}
        {view === "sleep-timer" && (
          <motion.div
            key="sleep-timer"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <button
              type="button"
              onClick={navigateBack}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-label-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
            >
              <ChevronLeft className="size-4 stroke-[2.5]" />
              <span>Sleep Timer</span>
            </button>
            <div className="my-1 h-px bg-white/10" />

            {SLEEP_TIMER_OPTIONS.map((opt) => {
              const active = selectedSleepTimer === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedSleepTimer(opt.id);
                    onClose?.();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-label-md transition-colors ${active
                      ? "bg-primary text-on-primary font-bold shadow-sm"
                      : "text-white/85 hover:bg-white/10 hover:text-white active:scale-[0.99]"
                    }`}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="size-4 stroke-[3]" />}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* WATCH PARTY SUBMENU                                          */}
        {/* ============================================================ */}
        {view === "watch-party" && (
          <motion.div
            key="watch-party"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-3"
          >
            <button
              type="button"
              onClick={navigateBack}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-label-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
            >
              <ChevronLeft className="size-4 stroke-[2.5]" />
              <span>Watch Party</span>
            </button>
            <div className="h-px bg-white/10" />

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Users className="size-5 stroke-[2.5]" />
              </div>
              <div className="inline-block rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary mb-2">
                Coming in Next Update
              </div>
              <p className="font-semibold text-white">Watch With Friends</p>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                Watch parties are currently in development and require the upcoming multiplayer backend. Stay tuned for the next update!
              </p>
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-xl bg-white/10 py-2 text-xs font-bold text-white/40"
              >
                Coming in Next Update
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* PLAYBACK SETTINGS (SPEED, BRIGHTNESS, BOOSTER, AUTOPLAY, AD) */}
        {/* ============================================================ */}
        {view === "playback" && (
          <motion.div
            key="playback"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <ZenoxVideoSettings
              onBack={navigateBack}
              onOpenAdvancedColor={() => navigateTo("advanced-color")}
              playbackRate={playbackRate}
              onSelectPlaybackRate={onSelectPlaybackRate}
            />
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* ADVANCED COLOR SUBMENU                                       */}
        {/* ============================================================ */}
        {view === "advanced-color" && (
          <motion.div
            key="advanced-color"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <ZenoxAdvancedColor onBack={navigateBackToPlayback} />
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* DOWNLOADS SUBMENU (Server 1 / Server 2 / Subtitle download) */}
        {/* ============================================================ */}
        {view === "downloads" && (
          <motion.div
            key="downloads"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <ZenoxDownloadsMenu
              onBack={navigateBack}
              onSelectServer={(srv) =>
                navigateTo(srv === "server1" ? "downloads-server1" : "downloads-server2")
              }
              subtitles={subtitles}
              currentSubtitle={currentSubtitle}
              mediaTitle={mediaTitle}
            />
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* DOWNLOADS - SERVER 1                                         */}
        {/* ============================================================ */}
        {view === "downloads-server1" && (
          <motion.div
            key="downloads-server1"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <ZenoxServerOneDownloads
              onBack={navigateBackToDownloads}
              tmdbId={tmdbId}
              mediaTitle={mediaTitle}
              mediaType={mediaType}
              season={season}
              episode={episode}
            />
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* DOWNLOADS - SERVER 2                                         */}
        {/* ============================================================ */}
        {view === "downloads-server2" && (
          <motion.div
            key="downloads-server2"
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-1"
          >
            <ZenoxServerTwoDownloads onBack={navigateBackToDownloads} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
