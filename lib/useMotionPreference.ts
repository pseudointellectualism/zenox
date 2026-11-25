"use client";

import { useReducedMotion } from "motion/react";

import { useSettingsStore } from "@/lib/store/useSettingsStore";

/**
 * Resolves the viewer's effective motion preference.
 *
 * The OS setting is the default, but it is not the final word: a viewer whose
 * system reports `reduce` must still be able to opt back into animation, and
 * one whose system says nothing must be able to opt out. Components read this
 * rather than `useReducedMotion()` directly so both overrides are honoured.
 */
export function useAppReducedMotion(): boolean {
  const preference = useSettingsStore((s) => s.motion);
  const systemPrefersReduced = useReducedMotion();

  if (preference === "full") return false;
  if (preference === "reduced") return true;
  return Boolean(systemPrefersReduced);
}
