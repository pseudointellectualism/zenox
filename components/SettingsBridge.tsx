"use client";

import { useEffect } from "react";

import { accentById, useSettingsStore } from "@/lib/store/useSettingsStore";

/**
 * Pushes viewer preferences onto the document root so plain CSS can react to
 * them. Keeping this in one place means components read tokens, not settings.
 */
export default function SettingsBridge() {
  const accent = useSettingsStore((s) => s.accent);
  const motion = useSettingsStore((s) => s.motion);

  useEffect(() => {
    const { base, hover } = accentById(accent);
    const root = document.documentElement;
    root.dataset.accent = accent;
    root.style.setProperty("--color-primary", base);
    root.style.setProperty("--color-primary-hover", hover);

    // Dynamic background: pure black only for white accent, reverted back to original deep canvas for other accents
    if (accent === "white") {
      root.style.setProperty("--color-canvas", "#000000");
      root.style.setProperty("--color-dim", "#050505");
      root.style.setProperty("--color-bright", "#121212");
      root.style.setProperty("--color-surface-lowest", "#080808");
      root.style.setProperty("--color-surface-low", "#101010");
      root.style.setProperty("--color-surface", "#171717");
      root.style.setProperty("--color-surface-high", "#202020");
      root.style.setProperty("--color-surface-highest", "#2b2b2b");
      root.style.setProperty("--color-secondary", "#a1a1aa");
      root.style.setProperty("--color-secondary-container", "#27272a");
      root.style.setProperty("--color-muted", "#8e8e93");
      root.style.setProperty("--color-badge-4k", "#1f1f1f");
    } else {
      root.style.setProperty("--color-canvas", "#071310");
      root.style.setProperty("--color-dim", "#050505");
      root.style.setProperty("--color-bright", "#1d1728");
      root.style.setProperty("--color-surface-lowest", "#0a0a0a");
      root.style.setProperty("--color-surface-low", "#131829");
      root.style.setProperty("--color-surface", "#1c243c");
      root.style.setProperty("--color-surface-high", "#251e32");
      root.style.setProperty("--color-surface-highest", "#302741");
      root.style.setProperty("--color-secondary", "#7a6bae");
      root.style.setProperty("--color-secondary-container", "#5a4e8c");
      root.style.setProperty("--color-muted", "#756790");
      root.style.setProperty("--color-badge-4k", "#3f8a1d");
    }

    // White accent needs a subtle grey glow instead of a coloured one
    const glowColor = accent === "white"
      ? "rgba(255, 255, 255, 0.10)"
      : `color-mix(in srgb, ${base} 15%, transparent)`;
    root.style.setProperty("--glow-primary-shadow", `0 8px 24px ${glowColor}`);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", accent === "white" ? "#000000" : "#071310");
  }, [accent]);

  useEffect(() => {
    // CSS keys off this to override the OS preference in either direction.
    document.documentElement.dataset.motion = motion;
  }, [motion]);

  return null;
}
