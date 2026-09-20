"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { MediaType } from "@/lib/types";

interface ZenoxTopControlsProps {
  title: string;
  mediaType: MediaType;
  year?: string | number | null;
  season?: number;
  episode?: number;
  episodeTitle?: string | null;
  onBack?: () => void;
  backHref?: string;
}

export default function ZenoxTopControls({
  title,
  mediaType,
  year,
  season,
  episode,
  episodeTitle,
  onBack,
  backHref = "/",
}: ZenoxTopControlsProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-8 sm:py-6 select-none pt-[calc(0.75rem+env(safe-area-inset-top))] pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))]">
      {/* Left side: Back button & Title lockup */}
      <div className="flex min-w-0 items-center gap-3.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex items-center justify-center p-1.5 shrink-0 bg-transparent text-white/80 transition-all duration-200 hover:text-white hover:scale-110 active:scale-90"
          >
            <ArrowLeft className="size-6 sm:size-7 stroke-[2.5] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
          </button>
        ) : (
          <Link
            href={backHref}
            aria-label="Go back"
            className="flex items-center justify-center p-1.5 shrink-0 bg-transparent text-white/80 transition-all duration-200 hover:text-white hover:scale-110 active:scale-90"
          >
            <ArrowLeft className="size-6 sm:size-7 stroke-[2.5] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
          </Link>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-title-lg font-bold text-white tracking-tight sm:text-headline-md">
              {title}
            </h1>
            {year && (
              <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-label-sm font-medium text-white/70">
                {year}
              </span>
            )}
          </div>

          {mediaType === "tv" && season && episode && (
            <p className="mt-0.5 truncate text-label-sm font-medium text-white/60">
              Season {season}, Episode {episode}
              {episodeTitle && ` — "${episodeTitle}"`}
            </p>
          )}
        </div>
      </div>

      {/* Right side: Zenox brand mark */}
      <div className="hidden sm:flex items-center shrink-0">
        <span className="zenox-wordmark text-2xl font-black leading-none select-none opacity-90 transition-opacity hover:opacity-100">
          zenox.
        </span>
      </div>
    </div>
  );
}
