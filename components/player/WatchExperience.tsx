"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import EpisodeDrawer from "@/components/player/EpisodeDrawer";
import PlayerContainer from "@/components/player/PlayerContainer";
import ServerSelector from "@/components/player/ServerSelector";
import { resolveAll, type StreamProviderConfig } from "@/lib/providers";
import { useLibraryStore } from "@/lib/store/useLibraryStore";
import { useHydrated, usePlayerStore } from "@/lib/store/usePlayerStore";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { tmdbImage } from "@/lib/tmdb-image";
import type { MediaDetails, Season } from "@/lib/types";
import { yearOf } from "@/lib/utils";

interface WatchExperienceProps {
  details: MediaDetails;
  providers: StreamProviderConfig[];
  initialSeason: Season | null;
}

/** Progress is persisted at most this often while playing. */
const SAVE_INTERVAL_MS = 5000;

export default function WatchExperience({
  details,
  providers,
  initialSeason,
}: WatchExperienceProps) {
  const isTv = details.mediaType === "tv";
  const hydrated = useHydrated();

  const [seasonNumber, setSeasonNumber] = useState(initialSeason?.seasonNumber ?? 1);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [season, setSeason] = useState<Season | null>(initialSeason);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(0);

  const autoplayNext = useSettingsStore((s) => s.autoplayNext);
  const resumePlayback = useSettingsStore((s) => s.resumePlayback);

  const lastSaveRef = useRef(0);
  const setPreferredProvider = usePlayerStore((s) => s.setPreferredProvider);
  const saveMark = usePlayerStore((s) => s.saveMark);
  const recordProgress = useLibraryStore((s) => s.recordProgress);

  const sources = useMemo(
    () =>
      resolveAll(providers, {
        type: details.mediaType,
        id: details.id,
        season: seasonNumber,
        episode: episodeNumber,
        title: details.title,
        year: yearOf(details.releaseDate),
      }),
    [providers, details, seasonNumber, episodeNumber],
  );

  const activeSource =
    sources.find((s) => s.providerId === activeProviderId) ?? sources[0] ?? null;

  // Restore the viewer's server preference and resume point once the store rehydrates.
  useEffect(() => {
    if (!hydrated) return;
    const state = usePlayerStore.getState();

    const preferred = state.preferredProviderId;
    if (preferred && providers.some((p) => p.id === preferred)) setActiveProviderId(preferred);

    const mark = state.getMark(details.mediaType, details.id);
    if (!mark) return;
    if (resumePlayback) setStartTime(mark.positionSeconds);
    if (isTv && mark.season && mark.episode) {
      setSeasonNumber(mark.season);
      setEpisodeNumber(mark.episode);
    }
  }, [hydrated, providers, details.mediaType, details.id, isTv, resumePlayback]);

  // Pull episodes whenever the drawer moves to a season we do not have loaded.
  useEffect(() => {
    if (!isTv || season?.seasonNumber === seasonNumber) return;

    let cancelled = false;
    setSeasonLoading(true);

    fetch(`/api/season/${details.id}/${seasonNumber}`)
      .then((res) => res.json() as Promise<{ season: Season }>)
      .then((data) => {
        if (!cancelled) setSeason(data.season);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setSeasonLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isTv, seasonNumber, season?.seasonNumber, details.id]);

  const handleSelectServer = (providerId: string) => {
    setActiveProviderId(providerId);
    setPreferredProvider(providerId);
    setFailedIds((prev) => prev.filter((id) => id !== providerId));
  };

  /** Drop to the next healthy server, keeping the current timestamp. */
  const handleSourceError = useCallback(
    (providerId: string) => {
      setFailedIds((prev) => (prev.includes(providerId) ? prev : [...prev, providerId]));
      setActiveProviderId((current) => {
        const from = current ?? sources[0]?.providerId ?? null;
        if (from !== providerId) return current;
        const next = sources.find(
          (s) => s.providerId !== providerId && !failedIds.includes(s.providerId),
        );
        return next?.providerId ?? current;
      });
    },
    [sources, failedIds],
  );

  const handleProgress = useCallback(
    (position: number, duration: number) => {
      const now = Date.now();
      if (now - lastSaveRef.current < SAVE_INTERVAL_MS || duration <= 0) return;
      lastSaveRef.current = now;

      saveMark(details.mediaType, details.id, {
        positionSeconds: position,
        durationSeconds: duration,
        season: isTv ? seasonNumber : undefined,
        episode: isTv ? episodeNumber : undefined,
      });
      recordProgress(details, {
        positionSeconds: position,
        durationSeconds: duration,
        season: isTv ? seasonNumber : undefined,
        episode: isTv ? episodeNumber : undefined,
      });
    },
    [details, isTv, seasonNumber, episodeNumber, saveMark, recordProgress],
  );

  /** Roll into the next episode when one finishes. */
  const handleEnded = useCallback(() => {
    if (!autoplayNext || !isTv || !season?.episodes) return;
    const next = season.episodes.find((e) => e.episodeNumber === episodeNumber + 1);
    if (next) {
      setStartTime(0);
      setEpisodeNumber(next.episodeNumber);
    }
  }, [autoplayNext, isTv, season, episodeNumber]);

  return (
    <div className="space-y-5">
      <ServerSelector
        sources={sources}
        activeId={activeSource?.providerId ?? null}
        onSelect={handleSelectServer}
        failedIds={failedIds}
      />

      <PlayerContainer
        source={activeSource}
        title={details.title}
        poster={tmdbImage(details.backdropPath, "w1280")}
        startTime={startTime}
        onProgress={handleProgress}
        onSourceError={handleSourceError}
        onEnded={handleEnded}
      />

      {isTv && (
        <EpisodeDrawer
          seasons={details.seasons}
          activeSeason={seasonNumber}
          activeEpisode={episodeNumber}
          episodes={season?.episodes}
          loading={seasonLoading}
          onSeasonChange={(next) => {
            setSeasonNumber(next);
            setEpisodeNumber(1);
            setStartTime(0);
          }}
          onEpisodeChange={(next) => {
            setEpisodeNumber(next);
            setStartTime(0);
          }}
        />
      )}
    </div>
  );
}
