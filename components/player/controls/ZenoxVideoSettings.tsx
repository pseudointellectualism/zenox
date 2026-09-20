"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Palette,
  Volume2,
} from "lucide-react";
import {
  DEFAULT_VIDEO_SETTINGS,
  useSettingsStore,
} from "@/lib/store/useSettingsStore";
import { Toggle } from "@/components/ui/SettingControls";

interface ZenoxVideoSettingsProps {
  onBack: () => void;
  onOpenAdvancedColor: () => void;
  playbackRate: number;
  onSelectPlaybackRate: (rate: number) => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2];

function BasementEffectSlider({
  label,
  icon: IconComponent,
  value,
  min,
  max,
  step = 5,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(String(value));

  useEffect(() => {
    if (!isEditing) setEditInput(String(value));
  }, [value, isEditing]);

  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rawRatio = (clientX - rect.left) / rect.width;
      const clampedRatio = Math.max(0, Math.min(1, rawRatio));
      const rawVal = min + clampedRatio * (max - min);
      const stepped = Math.round((rawVal - min) / step) * step + min;
      onChange(Math.max(min, Math.min(max, stepped)));
    },
    [min, max, step, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const commitEdit = () => {
    setIsEditing(false);
    const parsed = parseInt(editInput, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    } else {
      setEditInput(String(value));
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-bold text-white/90">{label}</span>
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5">
        <IconComponent className="size-4.5 stroke-[2.5] text-white/90 shrink-0" />

        {/* Basement2 Slider Track with Halo Ring Thumb */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="group/slider relative flex h-7 flex-1 cursor-pointer touch-none select-none items-center px-2 py-2"
        >
          {/* Unfilled track (h-1 expanding to h-1.5 on hover) */}
          <div
            ref={trackRef}
            dir="ltr"
            className={`relative h-1 w-full rounded-full bg-white/20 transition-[height] duration-100 group-hover/slider:h-1.5 ${
              isDragging ? "!h-1.5" : ""
            }`}
          >
            {/* Filled progress bar (themed with accent) */}
            <div
              className={`absolute left-0 top-0 flex h-full items-center justify-end rounded-full bg-primary ${
                isDragging ? "transition-none" : "transition-[width] duration-75"
              }`}
              style={{ width: `${percentage}%` }}
            >
              {/* Basement2 Halo Thumb: translucent halo ring + solid white center dot */}
              <div
                className={`size-4 min-w-4 rounded-full border-[3.5px] border-primary/50 bg-white shadow-[0_0_8px_var(--color-primary)] transition-[transform] duration-100 transform translate-x-1/2 ${
                  isDragging ? "scale-115 shadow-md" : "group-hover/slider:scale-110"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Stepper Pill: <  100%  > */}
        <div className="flex shrink-0 items-center overflow-hidden rounded-lg bg-white/10">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - step))}
            aria-label={`Decrease ${label}`}
            className="px-2 py-1.5 text-white/80 transition hover:text-white active:scale-95"
          >
            <ChevronLeft className="size-3.5 stroke-[2.5]" />
          </button>
          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="w-14 bg-transparent py-1 text-center font-sans text-xs font-bold text-white tabular-nums outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              title="Click to type exact value"
              className="w-14 py-1 text-center font-sans text-xs font-bold text-white tabular-nums transition hover:bg-white/10"
            >
              {value}%
            </button>
          )}
          <button
            type="button"
            onClick={() => onChange(Math.min(max, value + step))}
            aria-label={`Increase ${label}`}
            className="px-2 py-1.5 text-white/80 transition hover:text-white active:scale-95"
          >
            <ChevronRight className="size-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ZenoxVideoSettings({
  onBack,
  onOpenAdvancedColor,
  playbackRate,
  onSelectPlaybackRate,
}: ZenoxVideoSettingsProps) {
  const videoSettings =
    useSettingsStore((s) => s.videoSettings) ?? DEFAULT_VIDEO_SETTINGS;
  const setVideoSettings = useSettingsStore((s) => s.setVideoSettings);
  const setGlobal = useSettingsStore((s) => s.set);

  const handleAutoplayToggle = () => {
    const nextVal = !videoSettings.autoplay;
    setVideoSettings({ autoplay: nextVal });
    setGlobal("autoplayNext", nextVal);
  };

  return (
    <div className="flex flex-col gap-3.5 text-white select-none">
      {/* Header: < Settings */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-label-md font-bold text-white/90 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>Settings</span>
        </button>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 1. Playback speed (Basement2 style pill buttons) */}
      <div className="space-y-1.5 px-0.5">
        <label className="text-xs font-bold text-white/90">Playback speed</label>
        <div className="flex items-center rounded-xl bg-white/[0.06] p-1 gap-1">
          {SPEED_OPTIONS.map((rate) => {
            const active = playbackRate === rate;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => onSelectPlaybackRate(rate)}
                className={`flex-1 py-1.5 rounded-lg text-xs transition-colors text-center ${
                  active
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "text-white/60 hover:text-white font-semibold"
                }`}
              >
                {rate === 1 ? "1x" : `${rate}x`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Brightness (Basement2 EffectSlider card with Eye icon & < 100% > stepper) */}
      <div className="px-0.5">
        <BasementEffectSlider
          label="Brightness"
          icon={Eye}
          value={videoSettings.brightness ?? 100}
          min={0}
          max={200}
          step={5}
          onChange={(val) => setVideoSettings({ brightness: val })}
        />
      </div>

      {/* 3. Volume booster (Basement2 EffectSlider card with Volume2 icon & < 100% > stepper) */}
      <div className="px-0.5">
        <BasementEffectSlider
          label="Volume booster"
          icon={Volume2}
          value={videoSettings.volumeBoost ?? 100}
          min={100}
          max={300}
          step={10}
          onChange={(val) => setVideoSettings({ volumeBoost: val })}
        />
      </div>

      {/* 4. Autoplay Next (Spring animated Toggle) */}
      <div className="flex items-center justify-between rounded-xl px-1 py-1">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white/90">Autoplay Next</span>
          <span className="text-[11px] text-white/50 font-medium">
            Play subsequent episode automatically
          </span>
        </div>
        <Toggle
          id="toggle-autoplay"
          checked={Boolean(videoSettings.autoplay)}
          onChange={handleAutoplayToggle}
          label="Autoplay Next"
        />
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 5. Advanced Color Button */}
      <button
        type="button"
        onClick={onOpenAdvancedColor}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-left transition-all hover:border-white/25 hover:bg-white/10 active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-white/10 text-white">
            <Palette className="size-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Advanced Color</p>
            <p className="text-[11px] text-white/50 font-medium">
              Presets, Contrast, Saturation & Hue
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 stroke-[2.5] text-white/70" />
      </button>
    </div>
  );
}
