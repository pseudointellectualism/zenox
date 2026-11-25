"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from "react";
import {
  DEFAULT_THEINTRODB_COLORS,
  type TheIntroDbColors,
} from "@/lib/store/useConnectionsStore";

export interface PlayerSegment {
  type: "intro" | "recap" | "credits" | "preview";
  start: number; // in seconds
  end: number; // in seconds
  label?: string;
}

interface ZenoxProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  segments?: PlayerSegment[];
  segmentColors?: TheIntroDbColors;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ZenoxProgressBar({
  currentTime,
  duration,
  buffered,
  onSeek,
  onScrubStart,
  onScrubEnd,
  segments = [],
  segmentColors,
}: ZenoxProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, Math.max(0, (buffered / duration) * 100)) : 0;

  const calculateTimeFromX = useCallback(
    (clientX: number): number => {
      if (!barRef.current || duration <= 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration],
  );

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || duration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverX(x);
    setHoverTime((x / rect.width) * duration);

    if (isDragging) {
      setDragTime(calculateTimeFromX(e.clientX));
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverX(null);
      setHoverTime(null);
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    onScrubStart?.();
    const target = calculateTimeFromX(e.clientX);
    setDragTime(target);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!e.touches[0]) return;
    setIsDragging(true);
    onScrubStart?.();
    const target = calculateTimeFromX(e.touches[0].clientX);
    setDragTime(target);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e: globalThis.MouseEvent) => {
      setDragTime(calculateTimeFromX(e.clientX));
    };

    const handleGlobalTouchMove = (e: globalThis.TouchEvent) => {
      if (!e.touches[0]) return;
      setDragTime(calculateTimeFromX(e.touches[0].clientX));
    };

    const handleGlobalUp = (e: globalThis.MouseEvent) => {
      setIsDragging(false);
      onScrubEnd?.();
      const finalTime = calculateTimeFromX(e.clientX);
      onSeek(finalTime);
      setHoverX(null);
      setHoverTime(null);
    };

    const handleGlobalTouchEnd = (e: globalThis.TouchEvent) => {
      setIsDragging(false);
      onScrubEnd?.();
      if (e.changedTouches[0]) {
        const finalTime = calculateTimeFromX(e.changedTouches[0].clientX);
        onSeek(finalTime);
      }
      setHoverX(null);
      setHoverTime(null);
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
    window.addEventListener("touchend", handleGlobalTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
    };
  }, [isDragging, calculateTimeFromX, onSeek, onScrubEnd]);

  const hoveredSegment = useMemo(() => {
    const t = isDragging ? dragTime : hoverTime;
    if (t === null || !segments || segments.length === 0) return null;
    return segments.find((s) => t >= s.start && t <= s.end);
  }, [isDragging, dragTime, hoverTime, segments]);

  return (
    <div
      ref={barRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="group relative flex h-7 w-full cursor-pointer touch-none items-center select-none"
    >
      {/* Hover timestamp tooltip */}
      {(hoverTime !== null || isDragging) && hoverX !== null && (
        <div
          className="pointer-events-none absolute -top-8.5 z-30 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/90 px-3 py-0.5 text-label-sm font-semibold text-white shadow-xl backdrop-blur-md"
          style={{ left: `${hoverX}px` }}
        >
          <span>{formatTime(isDragging ? dragTime : hoverTime!)}</span>
          {hoveredSegment && (
            <span
              className="rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-black shadow-sm"
              style={{
                backgroundColor:
                  segmentColors?.[hoveredSegment.type] ||
                  DEFAULT_THEINTRODB_COLORS[hoveredSegment.type],
              }}
            >
              {hoveredSegment.label || hoveredSegment.type}
            </span>
          )}
        </div>
      )}

      {/* Progress track background */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20 transition-all duration-200 group-hover:h-2.5">
        {/* Buffered indicator */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/30 transition-all duration-300 ease-out"
          style={{ width: `${bufferedPct}%` }}
        />

        {/* TheIntroDB Colored Segments (Intro, Recap, Credits, Preview) */}
        {duration > 0 &&
          segments.map((seg, idx) => {
            const startSec = Math.max(0, seg.start);
            const endSec = Math.min(duration, seg.end);
            if (endSec <= startSec) return null;
            const leftPct = (startSec / duration) * 100;
            const widthPct = ((endSec - startSec) / duration) * 100;
            const color =
              segmentColors?.[seg.type] ||
              DEFAULT_THEINTRODB_COLORS[seg.type] ||
              "#f97316";

            return (
              <div
                key={`seg-${seg.type}-${idx}`}
                className="absolute inset-y-0 z-10 opacity-90 transition-opacity duration-200 hover:opacity-100"
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}88`,
                }}
                title={seg.label || seg.type.toUpperCase()}
              />
            );
          })}

        {/* Current played indicator (themed with active accent) */}
        <div
          className="absolute inset-y-0 left-0 z-20 rounded-full bg-primary transition-all duration-75 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Scrubber thumb handle (themed with active accent) */}
      <div
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${progressPct}%` }}
      >
        <div
          className={`size-3.5 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)] transition-transform duration-150 ${
            isDragging ? "scale-125" : "scale-0 group-hover:scale-100"
          }`}
        />
      </div>
    </div>
  );
}
