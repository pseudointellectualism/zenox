import type { MediaType } from "./types";

/**
 * Playback provider registry.
 *
 * Zenox ships with ZERO built-in sources. Every playback endpoint is supplied by
 * the operator through the `STREAM_PROVIDERS` environment variable, so the UI is
 * fully functional and testable without bundling anyone else's catalog.
 *
 * Config is read on the server and handed to the player as props — the client
 * never reaches into the environment.
 */

export type ProviderKind = "embed" | "hls";

export interface StreamProviderConfig {
  /** Stable slug used as the persisted "last server" key. */
  id: string;
  /** Shown on the server-selector pill. */
  label: string;
  /** `hls` renders a native Vidstack player, `embed` renders a sandboxed iframe. */
  kind: ProviderKind;
  /** URL template for films. Tokens: {id} {title} {year} */
  movie?: string;
  /** URL template for episodes. Tokens: {id} {season} {episode} {title} {year} */
  tv?: string;
}

export interface SourceContext {
  type: MediaType;
  id: string | number;
  season?: number;
  episode?: number;
  title?: string;
  year?: string | null;
}

export interface ResolvedSource {
  providerId: string;
  label: string;
  kind: ProviderKind;
  url: string;
}

function isProvider(value: unknown): value is StreamProviderConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    (v.kind === "embed" || v.kind === "hls") &&
    (typeof v.movie === "string" || typeof v.tv === "string")
  );
}

/** Server-side only: parses `STREAM_PROVIDERS`. Returns `[]` when unset or malformed. */
export function getStreamProviders(): StreamProviderConfig[] {
  const raw = process.env.STREAM_PROVIDERS;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProvider);
  } catch {
    console.warn("[zenox] STREAM_PROVIDERS is not valid JSON — no playback servers registered.");
    return [];
  }
}

/** Pure and client-safe: fills a provider template for the given media context. */
export function resolveSource(
  provider: StreamProviderConfig,
  ctx: SourceContext,
): ResolvedSource | null {
  const template = ctx.type === "movie" ? provider.movie : provider.tv;
  if (!template) return null;

  const url = template
    .replaceAll("{id}", String(ctx.id))
    .replaceAll("{season}", String(ctx.season ?? 1))
    .replaceAll("{episode}", String(ctx.episode ?? 1))
    .replaceAll("{title}", encodeURIComponent(ctx.title ?? ""))
    .replaceAll("{year}", ctx.year ?? "");

  return { providerId: provider.id, label: provider.label, kind: provider.kind, url };
}

export function resolveAll(
  providers: StreamProviderConfig[],
  ctx: SourceContext,
): ResolvedSource[] {
  return providers
    .map((p) => resolveSource(p, ctx))
    .filter((s): s is ResolvedSource => s !== null);
}

/** Distinct origins across every configured template, for the CSP allowlist. */
export function providerOrigins(providers: StreamProviderConfig[]): {
  frame: string[];
  media: string[];
} {
  const frame = new Set<string>();
  const media = new Set<string>();

  for (const p of providers) {
    for (const template of [p.movie, p.tv]) {
      if (!template) continue;
      try {
        const origin = new URL(template.replace(/\{[a-z]+\}/g, "1")).origin;
        (p.kind === "embed" ? frame : media).add(origin);
      } catch {
        // Relative or malformed template — same-origin, nothing to allowlist.
      }
    }
  }

  return { frame: [...frame], media: [...media] };
}
