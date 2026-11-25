"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import CountdownTimer from "@/components/media/CountdownTimer";
import ZenoxPlayer from "@/components/player/ZenoxPlayer";
import { buildMediaWatchUrl } from "@/lib/mediaRoute";
import { fetchPlaybackSession } from "@/lib/stream/client";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { tmdbImage } from "@/lib/tmdb-image";
import type { MediaDetails, MediaType } from "@/lib/types";

interface MediaWatchClientProps {
  details: MediaDetails;
  mediaType: MediaType;
  initialSeason: number;
  initialEpisode: number;
  initialStreamUrl?: string;
}

export default function MediaWatchClient({
  details,
  mediaType,
  initialSeason,
  initialEpisode,
  initialStreamUrl,
}: MediaWatchClientProps) {
  const router = useRouter();
  const preferredServer = useSettingsStore((s) => s.preferredServer) || "primary";
  const defaultServerIndex = preferredServer === "sienna" ? 2 : preferredServer === "sydney" ? 1 : 0;
  const [streamUrl, setStreamUrl] = useState<string | null>(initialStreamUrl ?? null);

  const releaseTimestamp = details?.releaseDate ? new Date(details.releaseDate).getTime() : NaN;
  const isFutureRelease = !isNaN(releaseTimestamp) && releaseTimestamp > Date.now();
  const UNRELEASED_STATUSES = ["planned", "in production", "post production", "upcoming"];
  const isUnreleasedStatus = details?.status
    ? UNRELEASED_STATUSES.includes(details.status.trim().toLowerCase())
    : false;
  const isUnreleased = Boolean(isFutureRelease || isUnreleasedStatus);

  useEffect(() => {
    if (isUnreleased) return;

    // If we already have the initial stream URL on mount, don't refetch
    if (initialStreamUrl && streamUrl === initialStreamUrl) {
      return;
    }

    let isCurrent = true;
    fetchPlaybackSession({
      mediaId: details.id,
      mediaType,
      season: initialSeason,
      episode: initialEpisode,
      serverIndex: defaultServerIndex,
      title: details.title,
      year: details.releaseYear || (details.releaseDate ? details.releaseDate.slice(0, 4) : undefined),
      imdbId: details.imdbId || undefined,
    }).then((url) => {
      if (isCurrent && url) {
        setStreamUrl(url);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [details.id, mediaType, initialSeason, initialEpisode, initialStreamUrl, defaultServerIndex, isUnreleased]);

  if (isUnreleased) {
    const formattedReleaseDate = details.releaseDate
      ? new Date(details.releaseDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black px-6 text-center">
        {details.backdropPath && (
          <div className="absolute inset-0 z-0 opacity-20 filter blur-xl">
            <Image
              src={tmdbImage(details.backdropPath, "original")!}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="relative z-10 mx-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-5 py-2 text-label-md font-semibold text-amber-300 backdrop-blur-md">
            <Clock className="size-5 text-amber-400" />
            <span>Unreleased Title</span>
          </div>

          <h1 className="text-3xl font-bold text-white sm:text-4xl">{details.title}</h1>

          {formattedReleaseDate && (
            <p className="text-body-md text-white/70">
              Releases on <span className="font-semibold text-white">{formattedReleaseDate}</span>
            </p>
          )}

          {isFutureRelease && details.releaseDate && (
            <div className="pt-2">
              <CountdownTimer targetDate={details.releaseDate} className="text-base px-5 py-2.5" />
            </div>
          )}

          <div className="pt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-label-md font-medium text-white transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="size-4" />
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleEpisodeChange = (season: number, episode: number) => {
    const nextUrl = buildMediaWatchUrl(mediaType, details.id, season, episode);
    router.replace(nextUrl);
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <ZenoxPlayer
      details={details}
      mediaType={mediaType}
      season={initialSeason}
      episode={initialEpisode}
      src={streamUrl ?? undefined}
      onEpisodeChange={handleEpisodeChange}
      onBack={handleBack}
      backHref="/"
    />
  );
}
