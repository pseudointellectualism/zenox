"use client";

import { Check, ServerCog } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  SegmentOption,
  Segmented,
  SelectField,
  SettingCard,
  SettingRow,
  SliderField,
  Toggle,
} from "@/components/ui/SettingControls";
import type { StreamProviderConfig } from "@/lib/providers";
import { useLibraryStore } from "@/lib/store/useLibraryStore";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import {
  ACCENTS,
  SUBTITLE_LANGUAGES,
  useSettingsStore,
  type AccentId,
  type ClockFormat,
  type MotionPreference,
  type PreferredQuality,
  type PreferredServer,
} from "@/lib/store/useSettingsStore";
import { cn } from "@/lib/utils";

const SERVER_OPTIONS: SegmentOption<PreferredServer>[] = [
  { value: "primary", label: "Stellar" },
  { value: "sydney", label: "Sydney" },
  { value: "sienna", label: "Sienna" },
];

const PREFERRED_QUALITIES: SegmentOption<PreferredQuality>[] = [
  { value: "auto", label: "Auto (4K)" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
  { value: "360p", label: "360p" },
];

const CLOCK_FORMATS: SegmentOption<ClockFormat>[] = [
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
];

const TITLE_MODES: SegmentOption<"hover" | "always">[] = [
  { value: "hover", label: "On hover" },
  { value: "always", label: "Always" },
];

const EPISODE_VIEWS: SegmentOption<"carousel" | "grid">[] = [
  { value: "carousel", label: "Carousel" },
  { value: "grid", label: "Grid" },
];

const MOTION_MODES: SegmentOption<MotionPreference>[] = [
  { value: "system", label: "System" },
  { value: "full", label: "Full" },
  { value: "reduced", label: "Reduced" },
];

const SUBTITLE_SIZES: SegmentOption<"sm" | "md" | "lg">[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

/* ------------------------------------------------------------- appearance */

export function AppearancePanel() {
  const s = useSettingsStore();

  return (
    <SettingCard title="Appearance" description="How the catalog looks and how much it moves.">
      <SettingRow
        label="Accent"
        description="Used for play actions, active states, and the mark. One accent at a time."
      >
        <AccentPicker value={s.accent} onChange={(next) => s.set("accent", next)} />
      </SettingRow>

      <SettingRow
        label="Card titles"
        description="Show titles over poster art at all times, or only when a card is focused."
      >
        <Segmented
          label="Card titles"
          value={s.cardTitles}
          options={TITLE_MODES}
          onChange={(next) => s.set("cardTitles", next)}
        />
      </SettingRow>

      <SettingRow
        label="Episode view"
        description="How episodes are laid out on a series page."
      >
        <Segmented
          label="Episode view"
          value={s.episodeView}
          options={EPISODE_VIEWS}
          onChange={(next) => s.set("episodeView", next)}
        />
      </SettingRow>

      <SettingRow
        label="Motion"
        description="System follows your device setting. Full keeps ambient drift and entrance animation on even if your device asks to reduce it."
      >
        <Segmented
          label="Motion"
          value={s.motion}
          options={MOTION_MODES}
          onChange={(next) => s.set("motion", next)}
        />
      </SettingRow>

      <SettingRow
        label="Pause overlay"
        description="Display a cinematic title backdrop and info screen when video is paused."
        htmlFor="set-pause-overlay"
      >
        <Toggle
          id="set-pause-overlay"
          label="Pause overlay"
          checked={s.pauseOverlayEnabled}
          onChange={(next) => s.set("pauseOverlayEnabled", next)}
        />
      </SettingRow>

      <AnimatePresence>
        {s.pauseOverlayEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden flex flex-col gap-5 pl-4 border-l-2 border-white/15 my-2"
          >
            <SettingRow
              label="Overlay delay"
              description="Seconds of pause before the cinematic pause screen fades in."
            >
              <SliderField
                label="Overlay delay"
                value={s.pauseOverlayDelay}
                onChange={(next) => s.set("pauseOverlayDelay", next)}
                min={1}
                max={15}
                step={1}
                format={(v) => `${v}s`}
              />
            </SettingRow>

            <SettingRow
              label="Hide on mouse movement"
              description="Temporarily hide the pause overlay whenever you move the mouse."
              htmlFor="set-pause-hide-move"
            >
              <Toggle
                id="set-pause-hide-move"
                label="Hide on mouse movement"
                checked={s.pauseOverlayHideOnMove}
                onChange={(next) => s.set("pauseOverlayHideOnMove", next)}
              />
            </SettingRow>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingCard>
  );
}

function AccentPicker({
  value,
  onChange,
}: {
  value: AccentId;
  onChange: (next: AccentId) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex items-center gap-2">
      {ACCENTS.map((accent) => {
        const active = accent.id === value;
        const isWhite = accent.id === "white";
        return (
          <button
            key={accent.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={accent.label}
            title={accent.label}
            onClick={() => onChange(accent.id)}
            style={{ backgroundColor: accent.base }}
            className={cn(
              "grid size-8 place-items-center rounded-full transition-transform duration-200",
              "ring-offset-2 ring-offset-black/60 hover:scale-110",
              active
                ? isWhite
                  ? "ring-2 ring-white/50"
                  : "ring-2 ring-white"
                : "ring-0",
            )}
          >
            {active && <Check className="size-4 text-black" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- playback */

export function PlaybackPanel() {
  const s = useSettingsStore();

  return (
    <SettingCard title="Playback" description="Defaults applied every time a title opens.">
      <SettingRow
        label="Autoplay next episode"
        description="Automatically count down from 10 and start the next episode when credits appear."
        htmlFor="set-autoplay"
      >
        <Toggle
          id="set-autoplay"
          label="Autoplay next episode"
          checked={s.autoplayNext}
          onChange={(next) => s.set("autoplayNext", next)}
        />
      </SettingRow>

      <SettingRow
        label="Resume where you left off"
        description="Start from your saved position instead of the beginning."
        htmlFor="set-resume"
      >
        <Toggle
          id="set-resume"
          label="Resume where you left off"
          checked={s.resumePlayback}
          onChange={(next) => s.set("resumePlayback", next)}
        />
      </SettingRow>

      <SettingRow label="Default volume" description="Applied to the native player on load.">
        <SliderField
          label="Default volume"
          value={s.defaultVolume}
          onChange={(next) => s.set("defaultVolume", next)}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </SettingRow>

      <SettingRow
        label="Clock format"
        description="Show remaining and finish times in 12-hour (AM/PM) or 24-hour format."
      >
        <Segmented
          label="Clock format"
          value={s.clockFormat || "12h"}
          options={CLOCK_FORMATS}
          onChange={(next) => s.set("clockFormat", next)}
        />
      </SettingRow>

      <SettingRow
        label="Preferred quality"
        description="Target quality used when starting playback and when Auto quality is enabled."
      >
        <Segmented
          label="Preferred quality"
          value={s.preferredQuality || "auto"}
          options={PREFERRED_QUALITIES}
          onChange={(next) => s.set("preferredQuality", next)}
        />
      </SettingRow>

      <SettingRow
        label="Preferred server"
        description="Source tried first on every title. Switch between Stellar, Sydney, and Sienna (Vidfast)."
      >
        <Segmented
          label="Preferred server"
          value={s.preferredServer || "primary"}
          options={SERVER_OPTIONS}
          onChange={(next) => s.set("preferredServer", next as PreferredServer)}
        />
      </SettingRow>
    </SettingCard>
  );
}

/* --------------------------------------------------------------- servers */

export function ServersPanel({ providers }: { providers: StreamProviderConfig[] }) {
  const preferred = usePlayerStore((p) => p.preferredProviderId);
  const setPreferred = usePlayerStore((p) => p.setPreferredProvider);

  if (!providers.length) {
    return (
      <SettingCard title="Servers" description="Where playback is resolved from.">
        <div className="flex flex-col items-center border-t border-white/8 py-10 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-white/6 text-white/50">
            <ServerCog className="size-5" />
          </span>
          <p className="mt-3 text-label-md text-white">No servers registered</p>
          <p className="mt-1.5 max-w-sm text-label-sm leading-relaxed text-white/65">
            Zenox ships with no playback sources. Add your own licensed endpoints to the
            <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-white/70">
              STREAM_PROVIDERS
            </code>
            environment variable and they appear here.
          </p>
        </div>
      </SettingCard>
    );
  }

  const options = providers.map((p) => ({ value: p.id, label: p.label }));

  return (
    <SettingCard title="Servers" description="Where playback is resolved from.">
      <SettingRow
        label="Preferred server"
        description="Tried first on every title. Zenox falls back automatically if it stalls."
      >
        <SelectField
          label="Preferred server"
          value={preferred ?? options[0].value}
          options={options}
          onChange={setPreferred}
        />
      </SettingRow>

      <SettingRow label="Registered" description="Configured through the environment, not the UI.">
        <span className="text-label-sm tabular-nums text-white/75">
          {providers.length} {providers.length === 1 ? "server" : "servers"}
        </span>
      </SettingRow>
    </SettingCard>
  );
}

/* ------------------------------------------------------------- subtitles */

export function SubtitlesPanel() {
  const s = useSettingsStore();

  return (
    <SettingCard title="Subtitles" description="Applied to the native player where tracks exist.">
      <SettingRow
        label="Enable subtitles"
        description="Turn tracks on by default when a title provides them."
        htmlFor="set-subs"
      >
        <Toggle
          id="set-subs"
          label="Enable subtitles"
          checked={s.subtitlesEnabled}
          onChange={(next) => s.set("subtitlesEnabled", next)}
        />
      </SettingRow>

      <SettingRow label="Language" description="Preferred track when several are available.">
        <SelectField
          label="Subtitle language"
          value={s.subtitleLanguage}
          options={SUBTITLE_LANGUAGES}
          onChange={(next) => s.set("subtitleLanguage", next)}
          placement="top"
        />
      </SettingRow>

      <SettingRow label="Text size" description="Caption scale inside the player.">
        <Segmented
          label="Subtitle text size"
          value={s.subtitleSize}
          options={SUBTITLE_SIZES}
          onChange={(next) => s.set("subtitleSize", next)}
        />
      </SettingRow>
    </SettingCard>
  );
}

/* ---------------------------------------------------------------- profile */

export function ProfilePanel() {
  const watchlist = useLibraryStore((l) => l.watchlist);
  const history = useLibraryStore((l) => l.history);
  const clearWatchlist = useLibraryStore((l) => l.clearWatchlist);
  const clearHistory = useLibraryStore((l) => l.clearHistory);
  const marks = usePlayerStore((p) => p.marks);
  const clearMarks = usePlayerStore((p) => p.clearMarks);
  const resetSettings = useSettingsStore((s) => s.reset);

  const stats = [
    { label: "Saved titles", value: watchlist.length },
    { label: "In progress", value: history.length },
    { label: "Resume points", value: Object.keys(marks).length },
  ];

  return (
    <div className="space-y-5">
      <SettingCard
        title="Local profile"
        description="Your list, progress and preferences live in this browser. Nothing leaves the device, and there is no account backend configured."
      >
        <div className="grid grid-cols-3 gap-3 border-t border-white/8 py-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-white">
                {stat.value}
              </p>
              <p className="mt-0.5 text-label-sm text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </SettingCard>

      <SettingCard title="Stored data" description="Clearing is immediate and cannot be undone.">
        <SettingRow label="Watchlist" description="Every title you have saved.">
          <DangerButton onClick={clearWatchlist} disabled={!watchlist.length}>
            Clear list
          </DangerButton>
        </SettingRow>
        <SettingRow label="Continue watching" description="Playback history and progress bars.">
          <DangerButton
            onClick={() => {
              clearHistory();
              clearMarks();
            }}
            disabled={!history.length && !Object.keys(marks).length}
          >
            Clear history
          </DangerButton>
        </SettingRow>
        <SettingRow label="Preferences" description="Returns every setting on this page to default.">
          <DangerButton onClick={resetSettings}>Reset</DangerButton>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function DangerButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-4 py-1.5 text-label-sm transition-colors duration-200",
        "border-rose-400/30 text-rose-300 hover:border-rose-400/60 hover:bg-rose-500/10",
        "disabled:pointer-events-none disabled:border-white/10 disabled:text-white/25",
      )}
    >
      {children}
    </button>
  );
}
