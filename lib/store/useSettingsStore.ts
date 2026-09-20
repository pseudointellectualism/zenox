"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Viewer preferences. Every entry here is read by real UI somewhere. If a
 * control cannot change behaviour, it does not belong in this store.
 */

export type AccentId = "white" | "mint" | "amber" | "cyan" | "rose";

/**
 * "system" follows the OS `prefers-reduced-motion` setting. The other two
 * override it in either direction, so a viewer is never locked out of
 * animation by an OS toggle they set for a different reason.
 */
export type MotionPreference = "system" | "full" | "reduced";

export interface Accent {
  id: AccentId;
  label: string;
  base: string;
  hover: string;
}

/** Each accent is light enough to carry black label text at WCAG AA. */
export const ACCENTS: Accent[] = [
  { id: "white", label: "Classic", base: "#ffffff", hover: "#e0e0e0" },
  { id: "cyan", label: "Cold Open", base: "#1AFFF5", hover: "#70fffa" },
  { id: "mint", label: "Zenox", base: "#7BFF2A", hover: "#9dff60" },
  { id: "amber", label: "Projector", base: "#FFA320", hover: "#ffbc57" },
  { id: "rose", label: "Late Show", base: "#FF2355", hover: "#ff577e" },
];

export const SUBTITLE_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
] as const;

export type ClockFormat = "12h" | "24h";

export type PreferredQuality = "auto" | "1080p" | "720p" | "480p" | "360p";
export type PreferredServer = "primary" | "sydney" | "sienna";

interface SettingsState {
  // Appearance
  accent: AccentId;
  cardTitles: "hover" | "always";
  episodeView: "carousel" | "grid";
  motion: MotionPreference;
  pauseOverlayEnabled: boolean;
  pauseOverlayDelay: number;
  pauseOverlayHideOnMove: boolean;

  // Playback
  autoplayNext: boolean;
  resumePlayback: boolean;
  defaultVolume: number;
  clockFormat: ClockFormat;
  preferredQuality: PreferredQuality;
  preferredServer: PreferredServer;

  // Subtitles
  subtitlesEnabled: boolean;
  subtitleLanguage: string;
  subtitleSize: "sm" | "md" | "lg";
  subtitleStyles: SubtitleStyles;

  // Video
  videoSettings: VideoSettings;

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  setSubtitleStyles: (styles: Partial<SubtitleStyles>) => void;
  setVideoSettings: (settings: Partial<VideoSettings>) => void;
  reset: () => void;
}

export interface VideoSettings {
  brightness: number; // 50 - 150, default 100
  volumeBoost: number; // 100 - 300, default 100
  autoplay: boolean; // default true
  contrast: number; // 50 - 200, default 100
  saturation: number; // 0 - 200, default 100
  hue: number; // 0 - 360, default 0
}

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  brightness: 100,
  volumeBoost: 100,
  autoplay: true,
  contrast: 100,
  saturation: 100,
  hue: 0,
};

export interface SubtitleStyles {
  // Text & Typography
  size: number; // percentage (e.g. 75 = 75%)
  color: string; // "#ffffff"
  bold: boolean; // false
  fontStyle: "dropShadow" | "Border" | "raised" | "depressed" | "default"; // Basement default: dropShadow
  borderThickness: number; // in px, default 1
  fontFamily: "sans" | "serif" | "mono"; // "sans"

  // Background & Radius (NO blur, NO blur intensity)
  backgroundOpacity: number; // 0 to 100, default 25
  backgroundColor: string; // "#000000"
  backgroundRadius: number; // 0 to 16, default 4

  // Position & Sync
  verticalPosition: number; // 1 = bottom (default), 0 = top
  delay: number; // in seconds, default 0
}

export const DEFAULT_SUBTITLE_STYLES: SubtitleStyles = {
  size: 85, // 85%
  color: "#ffffff", // white
  bold: false,
  fontStyle: "dropShadow", // drop shadow
  borderThickness: 1,
  fontFamily: "sans",
  backgroundOpacity: 30, // 30%
  backgroundColor: "#000000",
  backgroundRadius: 4, // 4px
  verticalPosition: 1,
  delay: 0,
};

const DEFAULTS = {
  accent: "white" as AccentId,
  cardTitles: "hover" as const,
  episodeView: "carousel" as const,
  motion: "system" as MotionPreference,
  pauseOverlayEnabled: true,
  pauseOverlayDelay: 5,
  pauseOverlayHideOnMove: true,
  autoplayNext: true,
  resumePlayback: true,
  defaultVolume: 1.0,
  clockFormat: "12h" as ClockFormat,
  preferredQuality: "auto" as PreferredQuality,
  preferredServer: "primary" as PreferredServer,
  subtitlesEnabled: false,
  subtitleLanguage: "en",
  subtitleSize: "md" as const,
  subtitleStyles: DEFAULT_SUBTITLE_STYLES,
  videoSettings: DEFAULT_VIDEO_SETTINGS,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      setSubtitleStyles: (patch) =>
        set((state) => ({
          subtitleStyles: { ...state.subtitleStyles, ...patch },
        })),
      setVideoSettings: (patch) =>
        set((state) => ({
          videoSettings: { ...(state.videoSettings ?? DEFAULT_VIDEO_SETTINGS), ...patch },
        })),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "zenox.settings.v1",
      version: 7,
      // v1 stored a `reduceMotion` boolean, which could only ever add reduction
      // on top of the OS setting. Carry a saved `true` across as an explicit
      // "reduced"; anything else falls back to following the system.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<SettingsState> & { reduceMotion?: boolean };
        let next = state;
        if (version < 2) {
          const { reduceMotion, ...rest } = next;
          next = { ...rest, motion: reduceMotion ? "reduced" : "system" };
        }
        // v3 retired the "lime" accent, which was lifted from another site.
        if ((next as { accent?: string }).accent === "lime") {
          next = { ...next, accent: "white" as AccentId };
        }
        // v4 added "white" as default; migrate old default "mint" to "white"
        if (version < 4 && (next as { accent?: string }).accent === "mint") {
          next = { ...next, accent: "white" as AccentId };
        }
        // v5 defaults volume to 1.0 (100%)
        if (version < 5 && next.defaultVolume === 0.8) {
          next = { ...next, defaultVolume: 1.0 };
        }
        // v6 updates default subtitle styles: 85% text size, 30% bg opacity, 4px corner rounding, drop shadow, white
        if (version < 6) {
          next = {
            ...next,
            subtitleStyles: {
              ...DEFAULT_SUBTITLE_STYLES,
              ...(next.subtitleStyles || {}),
              size: next.subtitleStyles?.size === 75 ? 85 : (next.subtitleStyles?.size ?? 85),
              backgroundOpacity:
                next.subtitleStyles?.backgroundOpacity === 25
                  ? 30
                  : (next.subtitleStyles?.backgroundOpacity ?? 30),
              backgroundRadius: next.subtitleStyles?.backgroundRadius ?? 4,
              fontStyle: next.subtitleStyles?.fontStyle ?? "dropShadow",
              color: next.subtitleStyles?.color ?? "#ffffff",
            },
          };
        }
        // v7 sets preferred quality default to "auto" (Auto 4K)
        if (version < 7) {
          next = {
            ...next,
            preferredQuality: "auto" as PreferredQuality,
          };
        }
        return next as SettingsState;
      },
    },
  ),
);

export function accentById(id: AccentId): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}
