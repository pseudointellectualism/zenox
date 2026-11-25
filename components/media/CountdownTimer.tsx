"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: string | Date;
  className?: string;
  prefix?: string;
  compact?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

function calculateTimeLeft(target: Date): TimeRemaining {
  const diff = target.getTime() - Date.now();
  if (diff <= 0 || isNaN(diff)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, totalMs: diff, isExpired: false };
}

export default function CountdownTimer({
  targetDate,
  className,
  prefix = "Releases in",
  compact = false,
}: CountdownTimerProps) {
  const [time, setTime] = useState<TimeRemaining>(() =>
    calculateTimeLeft(new Date(targetDate)),
  );

  useEffect(() => {
    const target = new Date(targetDate);
    if (isNaN(target.getTime())) return;

    // Initial sync
    setTime(calculateTimeLeft(target));

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft(target);
      setTime(remaining);
      if (remaining.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (time.isExpired) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-label-sm font-semibold text-primary", className)}>
        Releasing soon
      </span>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-label-sm font-medium text-primary backdrop-blur-sm",
        className,
      )}
    >
      <Timer className="size-4 shrink-0 animate-pulse text-primary" />
      {prefix && <span className="font-normal text-white/70">{prefix}</span>}
      <span className="font-mono font-semibold tracking-wide text-primary">
        {time.days > 0 && <span>{time.days}d </span>}
        <span>{pad(time.hours)}h </span>
        <span>{pad(time.minutes)}m </span>
        <span>{pad(time.seconds)}s</span>
      </span>
    </div>
  );
}
