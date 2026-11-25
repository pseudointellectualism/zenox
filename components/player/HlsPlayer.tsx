"use client";

import { useCallback, useRef } from "react";
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  isHLSProvider,
  type MediaPlayerInstance,
  type MediaProviderAdapter,
} from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import HLS from "hls.js";

import { useSettingsStore } from "@/lib/store/useSettingsStore";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

interface HlsPlayerProps {
  src: string;
  title: string;
  poster?: string | null;
  startTime?: number;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  onError?: () => void;
  onEnded?: () => void;
}

/** Caption scale, mapped onto Vidstack's own captions font-size variable. */
const CAPTION_SCALE = { sm: "0.85", md: "1", lg: "1.3" } as const;

/**
 * Native HLS playback. hls.js is bundled locally rather than pulled from the
 * Vidstack CDN default, so `script-src 'self'` in middleware.ts holds.
 */
export default function HlsPlayer({
  src,
  title,
  poster,
  startTime = 0,
  onProgress,
  onError,
  onEnded,
}: HlsPlayerProps) {
  const player = useRef<MediaPlayerInstance>(null);

  const defaultVolume = useSettingsStore((s) => s.defaultVolume);
  const subtitlesEnabled = useSettingsStore((s) => s.subtitlesEnabled);
  const subtitleLanguage = useSettingsStore((s) => s.subtitleLanguage);
  const subtitleSize = useSettingsStore((s) => s.subtitleSize);

  const attachLocalHls = (provider: MediaProviderAdapter | null) => {
    if (isHLSProvider(provider)) provider.library = HLS;
  };

  /** Once tracks are known, turn on the viewer's preferred caption language. */
  const applyCaptionPreference = useCallback(() => {
    if (!subtitlesEnabled) return;
    const tracks = player.current?.textTracks;
    if (!tracks) return;

    for (const track of tracks) {
      if (track.kind !== "subtitles" && track.kind !== "captions") continue;
      if (track.language?.startsWith(subtitleLanguage)) {
        track.mode = "showing";
        return;
      }
    }
  }, [subtitlesEnabled, subtitleLanguage]);

  return (
    <MediaPlayer
      ref={player}
      className="size-full overflow-hidden rounded-xl bg-black"
      style={{ "--media-user-font-size": `calc(${CAPTION_SCALE[subtitleSize]} * 1em)` }}
      title={title}
      src={src}
      currentTime={startTime}
      volume={defaultVolume}
      crossOrigin
      playsInline
      streamType="on-demand"
      load="visible"
      onProviderChange={attachLocalHls}
      onCanPlay={applyCaptionPreference}
      onError={() => onError?.()}
      onEnded={() => onEnded?.()}
      onTimeUpdate={({ currentTime }) => {
        onProgress?.(currentTime, player.current?.state.duration ?? 0);
      }}
    >
      <MediaProvider>
        {poster && <Poster className="vds-poster" src={poster} alt="" />}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
