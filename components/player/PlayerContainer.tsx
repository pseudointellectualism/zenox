"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ServerCog } from "lucide-react";

import type { ResolvedSource } from "@/lib/providers";

const HlsPlayer = dynamic(() => import("@/components/player/HlsPlayer"), {
  ssr: false,
  loading: () => <PlayerSkeleton />,
});

interface PlayerContainerProps {
  source: ResolvedSource | null;
  title: string;
  poster?: string | null;
  startTime?: number;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  onSourceError?: (providerId: string) => void;
  onEnded?: () => void;
}

/** How long an embed gets to signal `load` before it is treated as failed. */
const EMBED_TIMEOUT_MS = 12_000;

export default function PlayerContainer({
  source,
  title,
  poster,
  startTime = 0,
  onProgress,
  onSourceError,
  onEnded,
}: PlayerContainerProps) {
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restart the loading state whenever the viewer switches server or episode.
  useEffect(() => {
    if (!source) return;
    setLoading(true);

    if (source.kind !== "embed") return;
    timerRef.current = setTimeout(() => {
      onSourceError?.(source.providerId);
    }, EMBED_TIMEOUT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [source, onSourceError]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-outline bg-surface-lowest">
      {!source ? (
        <NoServerConfigured />
      ) : source.kind === "hls" ? (
        <HlsPlayer
          key={source.url}
          src={source.url}
          title={title}
          poster={poster}
          startTime={startTime}
          onProgress={onProgress}
          onError={() => onSourceError?.(source.providerId)}
          onEnded={onEnded}
        />
      ) : (
        <>
          <iframe
            key={source.url}
            src={source.url}
            title={`${title} on ${source.label}`}
            className="size-full border-0 bg-black"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            /* No allow-top-navigation: an embed can never steer the parent tab. */
            sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-presentation"
            referrerPolicy="origin"
            onLoad={() => {
              clearTimer();
              setLoading(false);
            }}
            onError={() => {
              clearTimer();
              onSourceError?.(source.providerId);
            }}
          />
          {loading && <PlayerSkeleton />}
        </>
      )}
    </div>
  );
}

function PlayerSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-surface-lowest">
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(149,255,80,0.10), rgba(4,18,11,0) 70%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-3">
        <span className="size-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="text-label-sm text-muted">Connecting to server…</p>
      </div>
    </div>
  );
}

function NoServerConfigured() {
  return (
    <div className="grid size-full place-items-center px-6 py-10 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-white/5 text-secondary">
          <ServerCog className="size-6" />
        </span>
        <h2 className="mt-4 text-title-lg text-white">No playback server configured</h2>
        <p className="mt-2 text-body-md text-muted">
          Zenox ships with no sources. Register your own licensed endpoints in
          <code className="mx-1 rounded bg-white/8 px-1.5 py-0.5 text-label-sm text-white/80">
            STREAM_PROVIDERS
          </code>
          and they appear here as selectable servers.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-outline bg-black/40 p-3 text-left text-label-sm leading-relaxed text-muted">
{`STREAM_PROVIDERS=[{
  "id": "studio",
  "label": "Studio CDN",
  "kind": "hls",
  "movie": "https://cdn.example.com/m/{id}/master.m3u8",
  "tv": "https://cdn.example.com/t/{id}/{season}/{episode}/master.m3u8"
}]`}
        </pre>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-label-sm text-muted">
          <AlertTriangle className="size-3.5" />
          Embed origins are added to the CSP allowlist automatically.
        </p>
      </div>
    </div>
  );
}
