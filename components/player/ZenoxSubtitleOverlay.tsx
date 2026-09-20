"use client";

import type { SubtitleCue } from "./utils/subtitles";
import {
  DEFAULT_SUBTITLE_STYLES,
  useSettingsStore,
  type SubtitleStyles,
} from "@/lib/store/useSettingsStore";

interface ZenoxSubtitleOverlayProps {
  cues: SubtitleCue[];
  currentTime: number;
  controlsVisible: boolean;
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return "0, 0, 0";
}

export function getSubtitleTextShadow(
  fontStyle: SubtitleStyles["fontStyle"],
  borderThickness = 1,
): string {
  switch (fontStyle) {
    case "raised":
      return "0 2px 0 rgba(0,0,0,0.8), 0 1.5px 1.5px rgba(0,0,0,0.9)";
    case "depressed":
      return "0 -2px 0 rgba(0,0,0,0.8), 0 -1.5px 1.5px rgba(0,0,0,0.9)";
    case "Border": {
      const t = Math.max(0.5, Math.min(5, borderThickness || 1));
      const s = "rgba(0,0,0,0.95)";
      return [
        `${t}px ${t}px 0 ${s}`,
        `-${t}px ${t}px 0 ${s}`,
        `${t}px -${t}px 0 ${s}`,
        `-${t}px -${t}px 0 ${s}`,
        `${t}px 0 0 ${s}`,
        `-${t}px 0 0 ${s}`,
        `0 ${t}px 0 ${s}`,
        `0 -${t}px 0 ${s}`,
      ].join(", ");
    }
    case "dropShadow":
      return "2.5px 2.5px 4.5px rgba(0,0,0,0.9)";
    case "default":
    default:
      return "none";
  }
}

export default function ZenoxSubtitleOverlay({
  cues,
  currentTime,
  controlsVisible,
}: ZenoxSubtitleOverlayProps) {
  const styles =
    useSettingsStore((s) => s.subtitleStyles) ?? DEFAULT_SUBTITLE_STYLES;

  if (!cues || cues.length === 0) return null;

  // Account for subtitle delay / timing offset
  const effectiveTime = currentTime - (styles.delay || 0);

  // Find active cue matching effectiveTime
  const activeCue = cues.find(
    (cue) => effectiveTime >= cue.start && effectiveTime <= cue.end,
  );

  if (!activeCue || !activeCue.text) return null;

  // Font family class
  const fontClass =
    styles.fontFamily === "serif"
      ? "font-serif"
      : styles.fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

  // Text shadow from Basement
  const textShadowStyle = getSubtitleTextShadow(
    styles.fontStyle || "dropShadow",
    styles.borderThickness ?? 1,
  );

  // Background color with opacity (NO blur as requested)
  const bgStyle =
    styles.backgroundOpacity === 0
      ? "transparent"
      : `rgba(${hexToRgb(styles.backgroundColor || "#000000")}, ${
          (styles.backgroundOpacity ?? 30) / 100
        })`;

  // Numeric scale font size (75 is standard ~1.25rem; 85 is 85%)
  const numericSize =
    typeof styles.size === "number" ? styles.size : parseInt(styles.size) || 85;
  const fontSizeRem = (numericSize / 75) * 1.25;

  // Vertical position (0 = top, 1 = bottom)
  const isTop = styles.verticalPosition === 0;
  const positionClass = isTop
    ? "top-10 sm:top-14"
    : controlsVisible
      ? "bottom-24 sm:bottom-28"
      : "bottom-8 sm:bottom-12";

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4 sm:px-6 transition-all duration-300 ease-out pb-[env(safe-area-inset-bottom)] ${positionClass}`}
    >
      <div
        style={{
          backgroundColor: bgStyle,
          borderRadius: `${styles.backgroundRadius ?? 4}px`,
        }}
        className="max-w-[85%] sm:max-w-[75%] px-4 py-1.5 text-center shadow-lg transition-all duration-150"
      >
        <p
          style={{
            color: styles.color || "#ffffff",
            textShadow: textShadowStyle,
            fontSize: `clamp(13px, ${fontSizeRem.toFixed(2)}rem, 42px)`,
            fontWeight: styles.bold ? 700 : 600,
          }}
          className={`whitespace-pre-line leading-snug tracking-wide ${fontClass}`}
        >
          {activeCue.text}
        </p>
      </div>
    </div>
  );
}
