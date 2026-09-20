"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export interface WaitingGif {
  id: string;
  name: string;
  url: string;
  fallbackUrl: string;
  alt: string;
}

export const WAITING_GIFS: WaitingGif[] = [
  {
    id: "dog-dance",
    name: "Dog Dance",
    url: "/loaders/dog-dance.gif",
    fallbackUrl: "https://media.tenor.com/qEefqw7r73AAAAAi/dog-dance.gif",
    alt: "Dancing dog celebrating your stream",
  },
  {
    id: "ops",
    name: "Ops Mascot",
    url: "/loaders/ops.gif",
    fallbackUrl: "https://media.tenor.com/QEBvTb9FaBkAAAAi/ops.gif",
    alt: "Cute waiting mascot",
  },
  {
    id: "cute-dance",
    name: "Cute Dance",
    url: "/loaders/cute-dance.gif",
    fallbackUrl: "https://media.tenor.com/_NakKlSorF8AAAAM/dance-dance-dance-cute.gif",
    alt: "Cute dancing groove",
  },
  {
    id: "cat-dance",
    name: "Cat Dance",
    url: "/loaders/cat-dance.gif",
    fallbackUrl: "https://media.tenor.com/aNKgtdT5ymEAAAAM/cat-dance-cat.gif",
    alt: "Kittens dancing happily",
  },
];

const WAITING_TEMPLATES = [
  "Frying up {source}...",
  "Starting up {source}...",
  "Summoning cinema magic from {source}...",
  "Spinning up the reels on {source}...",
  "Popping fresh digital popcorn...",
  "Warming up the projector...",
  "Polishing the 4K pixels...",
  "Brewing high-definition vibes...",
  "Almost ready for showtime...",
  "Tuning the cinematic audio...",
];

interface StreamWaitingScreenProps {
  isReady?: boolean;
  sourceName?: string;
  title?: string;
  season?: number;
  episode?: number;
  onBack?: () => void;
  hasError?: boolean;
}

export default function StreamWaitingScreen({
  isReady = false,
  sourceName = "Bubbles",
  title,
  season,
  episode,
  onBack,
  hasError = false,
}: StreamWaitingScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  // Pick random GIF and starting line once on client mount so each watch session is fresh
  const [gifIndex, setGifIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState<string>("/loaders/dog-dance.gif");
  const [textVisible, setTextVisible] = useState(true);
  const [takingLonger, setTakingLonger] = useState(false);

  // Show delay message above gif if loading takes longer than 5 seconds
  useEffect(() => {
    if (isReady || hasError) return;
    const timer = setTimeout(() => {
      setTakingLonger(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isReady, hasError]);

  const effectiveSource = useMemo(() => {
    if (!sourceName || sourceName.toLowerCase() === "cinejoy" || sourceName.toLowerCase() === "coda") {
      return "Bubbles";
    }
    return sourceName;
  }, [sourceName]);

  // Generate resolved lines for this source
  const lines = useMemo(() => {
    return WAITING_TEMPLATES.map((tmpl) =>
      tmpl.replace(/\{source\}/g, effectiveSource),
    );
  }, [effectiveSource]);

  useEffect(() => {
    setMounted(true);
    const randomGif = Math.floor(Math.random() * WAITING_GIFS.length);
    const randomLine = Math.floor(Math.random() * lines.length);
    setGifIndex(randomGif);
    setLineIndex(randomLine);
    setImgSrc(WAITING_GIFS[randomGif].url);
  }, [lines.length]);

  // Rotate text every 2.4 seconds with smooth fade
  useEffect(() => {
    if (isReady || hasError) return;

    const interval = setInterval(() => {
      setTextVisible(false);
      setTimeout(() => {
        setLineIndex((prev) => (prev + 1) % lines.length);
        setTextVisible(true);
      }, 250);
    }, 2400);

    return () => clearInterval(interval);
  }, [isReady, hasError, lines.length]);

  // Handle smooth fade out when playback starts
  useEffect(() => {
    if (isReady && !isFadingOut) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isReady, isFadingOut]);

  // If there's an error, dismiss waiting overlay immediately so error card is visible
  if (hasError || !shouldRender) {
    return null;
  }

  const currentGif = WAITING_GIFS[gifIndex] || WAITING_GIFS[0];
  const currentLine = lines[lineIndex] || lines[0];

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl transition-opacity duration-700 ease-out select-none ${isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      aria-label="Loading stream"
    >
      {/* Subtle top back button */}
      {onBack && (
        <div className="absolute left-4 top-4 z-50 sm:left-8 sm:top-8">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md transition-all hover:bg-white/15 hover:text-white active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      )}

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -inset-[100px] flex items-center justify-center opacity-30">
        <div className="h-[320px] w-[320px] rounded-full bg-gradient-to-tr from-primary/40 via-purple-600/30 to-sky-500/20 blur-[100px]" />
      </div>

      {/* Main card content */}
      <div className="relative z-10 flex max-w-sm flex-col items-center px-6 text-center">
        {/* Notice if loading exceeds 5 seconds */}
        {takingLonger && (
          <div className="mb-3.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-xs sm:text-sm font-medium text-white/75 tracking-wide leading-snug">
              This is taking longer than expected. Please wait couple of seconds
            </p>
          </div>
        )}

        {/* GIF animation container */}
        <div className="relative mb-6 flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:h-48 sm:w-48">
          {mounted ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgSrc}
              alt={currentGif.alt}
              onError={() => {
                // Fallback to external tenor URL if local fails
                if (imgSrc !== currentGif.fallbackUrl) {
                  setImgSrc(currentGif.fallbackUrl);
                }
              }}
              className="max-h-full max-w-full rounded-xl object-contain drop-shadow-md"
            />
          ) : (
            <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}

          {/* Tiny pulsating badge */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-md border border-white/10">
            <span className="size-1.5 rounded-full bg-primary animate-ping" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Rotating animated line */}
        <div className="min-h-[2.5rem] flex items-center justify-center">
          <p
            className={`text-title-md sm:text-title-lg font-bold tracking-tight text-white transition-all duration-300 transform ${textVisible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-1 scale-95"
              }`}
          >
            {currentLine}
          </p>
        </div>

        {/* Optional Media Title & Episode info */}
        {title && (
          <p className="mt-2 text-label-md sm:text-body-sm font-medium text-white/60 line-clamp-1">
            {title}
            {season !== undefined && episode !== undefined && (
              <span className="ml-1.5 text-primary/90 font-semibold">
                S{season}:E{episode}
              </span>
            )}
          </p>
        )}

        {/* Sleek animated shimmering progress wave */}
        <div className="mt-6 w-48 overflow-hidden rounded-full bg-white/10 p-[1px]">
          <div className="h-1 w-full rounded-full bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}
