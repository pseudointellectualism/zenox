import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 8100 -> "2h 15m" */
export function formatRuntime(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

/** 754 -> "12:34" */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function yearOf(date?: string | null): string | null {
  if (!date) return null;
  const y = date.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

export function rating(vote?: number | null): string | null {
  if (typeof vote !== "number" || vote <= 0) return null;
  return vote.toFixed(1);
}

/**
 * Deterministic hue pair derived from a title, used to paint placeholder
 * artwork when no poster is available. Keeps the grid varied but stable
 * between server and client renders.
 */
export function hueFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 360;
}

export function posterGradient(seed: string): { from: string; to: string } {
  const hue = hueFromSeed(seed);
  return {
    from: `hsl(${hue} 42% 22%)`,
    to: `hsl(${(hue + 48) % 360} 38% 9%)`,
  };
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
