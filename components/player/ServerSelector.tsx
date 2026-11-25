"use client";

import { Radio, ShieldCheck } from "lucide-react";

import type { ResolvedSource } from "@/lib/providers";
import { cn } from "@/lib/utils";

interface ServerSelectorProps {
  sources: ResolvedSource[];
  activeId: string | null;
  onSelect: (providerId: string) => void;
  /** Providers that errored this session, shown as degraded. */
  failedIds: string[];
}

export default function ServerSelector({
  sources,
  activeId,
  onSelect,
  failedIds,
}: ServerSelectorProps) {
  if (!sources.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="mr-1 flex items-center gap-2 text-label-sm uppercase tracking-[0.14em] text-secondary">
        <Radio className="size-3.5" />
        Server
      </span>

      <div role="tablist" aria-label="Playback server" className="flex flex-wrap gap-2">
        {sources.map((source) => {
          const active = source.providerId === activeId;
          const failed = failedIds.includes(source.providerId);
          return (
            <button
              key={source.providerId}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(source.providerId)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-label-sm transition-colors duration-200",
                active
                  ? "border-transparent bg-primary text-on-primary"
                  : "border-outline bg-[rgba(60,50,79,0.7)] text-muted hover:border-outline-strong hover:text-white",
                failed && !active && "opacity-45",
              )}
            >
              {source.label}
              {source.kind === "hls" && (
                <span
                  className={cn(
                    "rounded px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wider",
                    active ? "bg-black/20 text-on-primary" : "bg-white/10 text-secondary",
                  )}
                >
                  HLS
                </span>
              )}
            </button>
          );
        })}
      </div>

      <span className="ml-auto hidden items-center gap-1.5 text-label-sm text-muted sm:flex">
        <ShieldCheck className="size-3.5 text-primary" />
        Sandboxed playback
      </span>
    </div>
  );
}
