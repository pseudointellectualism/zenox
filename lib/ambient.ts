"use client";

import { useEffect } from "react";

/**
 * The page background takes its hue from whatever artwork is currently on
 * screen, so the canvas reads as spill from the poster rather than a fixed
 * brand wash. Written to a CSS variable and consumed by AmbientBackdrop, which
 * keeps the transition on the compositor instead of in React state.
 */
export const AMBIENT_VAR = "--ambient-hue";
const DEFAULT_HUE = 220;

export function useAmbient(hue: number | null | undefined) {
  useEffect(() => {
    if (hue === null || hue === undefined) return;
    const root = document.documentElement;
    root.style.setProperty(AMBIENT_VAR, String(hue));
    return () => {
      root.style.setProperty(AMBIENT_VAR, String(DEFAULT_HUE));
    };
  }, [hue]);
}
