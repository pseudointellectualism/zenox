"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Download,
  FileDown,
  Loader2,
  RotateCcw,
  Server,
  Subtitles,
} from "lucide-react";
import {
  fetchServerOneDownloads,
  extractDetailTags,
  type DownloadLink,
  type DownloadResponse,
} from "@/lib/downloadServers";
import type { SubtitleOption } from "./ZenoxSettingsMenu";
import type { MediaType } from "@/lib/types";

// ============================================================================
// 1. MAIN DOWNLOADS SUBMENU (Server 1 / Server 2 + Download current subtitle)
// ============================================================================
interface ZenoxDownloadsMenuProps {
  onBack: () => void;
  onSelectServer: (server: "server1" | "server2") => void;
  subtitles: SubtitleOption[];
  currentSubtitle: number;
  mediaTitle?: string;
}

export function ZenoxDownloadsMenu({
  onBack,
  onSelectServer,
  subtitles,
  currentSubtitle,
  mediaTitle,
}: ZenoxDownloadsMenuProps) {
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [isDownloadingSub, setIsDownloadingSub] = useState(false);

  const activeSub =
    currentSubtitle !== -1
      ? subtitles.find((s) => s.id === currentSubtitle)
      : null;

  const handleDownloadCurrentSubtitle = async () => {
    if (!activeSub) return;
    setIsDownloadingSub(true);
    setSubStatus(null);

    try {
      let content = "";
      let isVtt = false;

      if (activeSub.src) {
        const fetchUrl = activeSub.src.startsWith("http")
          ? `/api/v1/subtitles/proxy?url=${encodeURIComponent(activeSub.src)}`
          : activeSub.src;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error("Could not fetch subtitle file.");
        content = await res.text();
        isVtt =
          activeSub.src.toLowerCase().includes(".vtt") ||
          content.trim().startsWith("WEBVTT");
      } else if (typeof window !== "undefined") {
        // Fallback: extract from video.textTracks if rendered natively
        const video = document.querySelector("video");
        if (video && video.textTracks) {
          const track = Array.from(video.textTracks).find(
            (t) =>
              t.label === activeSub.label || t.language === activeSub.lang,
          );
          if (track && track.cues && track.cues.length > 0) {
            isVtt = true;
            let generated = "WEBVTT\n\n";
            for (let i = 0; i < track.cues.length; i++) {
              const cue = track.cues[i] as VTTCue;
              const formatT = (sec: number) => {
                const h = Math.floor(sec / 3600)
                  .toString()
                  .padStart(2, "0");
                const m = Math.floor((sec % 3600) / 60)
                  .toString()
                  .padStart(2, "0");
                const s = Math.floor(sec % 60)
                  .toString()
                  .padStart(2, "0");
                const ms = Math.floor((sec % 1) * 1000)
                  .toString()
                  .padStart(3, "0");
                return `${h}:${m}:${s}.${ms}`;
              };
              generated += `${i + 1}\n${formatT(cue.startTime)} --> ${formatT(cue.endTime)}\n${cue.text}\n\n`;
            }
            content = generated;
          }
        }
      }

      if (!content) {
        throw new Error("No subtitle content available to download.");
      }

      const ext = isVtt ? "vtt" : "srt";
      const mime = isVtt
        ? "text/vtt;charset=utf-8"
        : "application/x-subrip;charset=utf-8";
      const blob = new Blob([content], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const cleanTitle = (mediaTitle || "subtitles").replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      const labelPart = (activeSub.lang || activeSub.label || "track").replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      link.download = `${cleanTitle}-${labelPart}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      setSubStatus("Subtitle downloaded successfully!");
      setTimeout(() => setSubStatus(null), 3000);
    } catch (err) {
      setSubStatus(
        err instanceof Error ? err.message : "Failed to download subtitle.",
      );
    } finally {
      setIsDownloadingSub(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-white select-none">
      {/* Header: < Download */}
      <div className="flex items-center justify-between px-0.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.99]"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>Download</span>
        </button>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* Server Selection Buttons */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-white/50 px-0.5">
          Select Server
        </span>
        <div className="grid grid-cols-2 gap-2">
          {/* Server 1 Button */}
          <button
            type="button"
            onClick={() => onSelectServer("server1")}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-3 text-xs sm:text-sm font-bold text-on-primary transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <Server className="size-4 stroke-[2.5]" />
            <span>Server 1</span>
          </button>

          {/* Server 2 Button */}
          <button
            type="button"
            onClick={() => onSelectServer("server2")}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 px-3 text-xs sm:text-sm font-bold text-white/90 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <Server className="size-4 stroke-[2.5]" />
            <span>Server 2</span>
          </button>
        </div>
      </div>

      <div className="my-0.5 h-px w-full bg-white/10" />

      {/* Download Current Subtitle Button */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          disabled={!activeSub || isDownloadingSub}
          onClick={handleDownloadCurrentSubtitle}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs sm:text-sm font-bold transition-all ${
            activeSub
              ? "border-white/15 bg-white/5 text-white/90 hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-[0.99]"
              : "border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed"
          }`}
        >
          {isDownloadingSub ? (
            <Loader2 className="size-4 animate-spin text-white/70" />
          ) : (
            <Subtitles className="size-4 stroke-[2.5]" />
          )}
          <span>Download current subtitle</span>
        </button>

        {activeSub && (
          <p className="text-center text-[11px] font-semibold text-white/50">
            Selected: <span className="text-white/80">{activeSub.label}</span>
          </p>
        )}

        {!activeSub && (
          <p className="text-center text-[11px] text-white/40">
            Turn on subtitles to download the active subtitle file (.srt / .vtt)
          </p>
        )}

        {subStatus && (
          <p
            className={`text-center text-xs font-semibold ${
              subStatus.includes("success")
                ? "text-primary"
                : "text-rose-400"
            }`}
          >
            {subStatus}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 2. SERVER 1 DOWNLOAD VIEW (Matches Basement2 layout & user's screenshot)
// ============================================================================
interface ZenoxServerOneDownloadsProps {
  onBack: () => void;
  tmdbId?: string | number;
  mediaTitle?: string;
  mediaType?: MediaType;
  season?: number;
  episode?: number;
}

export function ZenoxServerOneDownloads({
  onBack,
  tmdbId,
  mediaTitle,
  mediaType,
  season,
  episode,
}: ZenoxServerOneDownloadsProps) {
  const [downloads, setDownloads] = useState<DownloadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDownloads = () => {
    if (!tmdbId) {
      setError("Media details are missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchServerOneDownloads({
      tmdbId,
      type: mediaType,
      season,
      episode,
    })
      .then((data) => {
        setDownloads(data);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load Server 1 downloads.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDownloads();
  }, [tmdbId, mediaType, season, episode]);

  return (
    <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-1 text-white select-none rail">
      {/* Header: < Download | Server 1 */}
      <div className="flex items-center justify-between px-0.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.99]"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>Download | Server 1</span>
        </button>

        <button
          type="button"
          onClick={loadDownloads}
          title="Refresh downloads"
          className="rounded-xl p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <RotateCcw className="size-3.5 stroke-[2.5]" />
        </button>
      </div>

      <div className="h-px w-full bg-white/10 shrink-0" />

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-white/70">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs font-semibold">Loading available downloads...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center">
          <p className="text-xs font-semibold text-rose-300">{error}</p>
          <button
            type="button"
            onClick={loadDownloads}
            className="mt-2.5 rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!downloads?.links || downloads.links.length === 0) && (
        <div className="py-8 text-center text-xs text-white/50">
          <p>No downloads found for this title on Server 1.</p>
        </div>
      )}

      {/* Results List: Matches user's screenshot */}
      {!loading && !error && downloads?.links && downloads.links.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {downloads.links.map((link) => {
            const tags = extractDetailTags(link);
            return (
              <a
                key={`${link.proxiedUrl}-${link.filename}`}
                href={link.proxiedUrl}
                target="_blank"
                rel="noreferrer"
                download={link.filename}
                className="group block rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition-all hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Top row: Quality | Format and Size */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white tracking-tight">
                        {link.quality}
                      </span>
                      {link.size && (
                        <span className="font-sans text-xs font-semibold tabular-nums text-white/50">
                          {link.size}
                        </span>
                      )}
                    </div>

                    {/* File Title line */}
                    <p className="mt-1 line-clamp-2 break-words text-xs text-white/60 font-medium">
                      {link.filename}
                    </p>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Download Icon */}
                  <div className="mt-0.5 shrink-0 rounded-lg p-1.5 text-white/70 transition-colors group-hover:bg-primary/20 group-hover:text-primary">
                    <Download className="size-4.5 stroke-[2.5]" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. SERVER 2 DOWNLOAD VIEW (Placeholder state)
// ============================================================================
interface ZenoxServerTwoDownloadsProps {
  onBack: () => void;
}

export function ZenoxServerTwoDownloads({
  onBack,
}: ZenoxServerTwoDownloadsProps) {
  return (
    <div className="flex flex-col gap-3 text-white select-none">
      {/* Header: < Download | Server 2 */}
      <div className="flex items-center justify-between px-0.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.99]"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>Download | Server 2</span>
        </button>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* Coming Soon Notice */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <Server className="mx-auto size-8 text-white/60 mb-2" />
        <p className="font-semibold text-white">Server 2 is coming soon</p>
        <p className="mt-1 text-xs text-white/50 leading-relaxed">
          Server 2 is currently being configured. Please use Server 1 for
          available video downloads.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20 active:scale-95"
        >
          Back to Downloads
        </button>
      </div>
    </div>
  );
}
