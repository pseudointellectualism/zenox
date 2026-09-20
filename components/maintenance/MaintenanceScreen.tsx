import React from "react";
import { RefreshCw } from "lucide-react";

interface MaintenanceScreenProps {
  message?: string;
}

export default function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black p-4 text-center select-none">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="relative z-10 flex max-w-lg flex-col items-center rounded-3xl border border-white/15 bg-black/70 p-8 sm:p-12 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        {/* Brand Header */}
        <span className="zenox-wordmark text-4xl sm:text-5xl font-black leading-none select-none">
          zenox.
        </span>

        {/* Maintenance Badge */}
        <div className="mt-6 flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
          </span>
          <span className="uppercase tracking-widest text-[10px]">Maintenance in Progress</span>
        </div>

        {/* Headline */}
        <h1 className="mt-5 font-[family-name:var(--font-sora)] text-2xl sm:text-3xl font-bold tracking-tight text-white">
          We&apos;ll be right back
        </h1>

        {/* Custom Admin Maintenance Message */}
        <p className="mt-3 text-sm leading-relaxed text-white/70 max-w-md">
          {message ||
            "Zenox is currently undergoing scheduled system updates and maintenance. We will be back online shortly!"}
        </p>

        {/* Refresh button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <a
            href="/"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-on-primary shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Check Again</span>
          </a>
        </div>

        <p className="mt-8 text-[11px] text-white/40">
          Streaming servers and catalog updates are actively applying.
        </p>
      </div>
    </div>
  );
}
