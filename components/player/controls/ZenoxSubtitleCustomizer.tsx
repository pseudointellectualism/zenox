"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Palette,
} from "lucide-react";
import {
  DEFAULT_SUBTITLE_STYLES,
  useSettingsStore,
  type SubtitleStyles,
} from "@/lib/store/useSettingsStore";
import ZenoxSlider from "./ZenoxSlider";
import { Toggle } from "@/components/ui/SettingControls";

interface ZenoxSubtitleCustomizerProps {
  onBack: () => void;
  backLabel?: string;
}

// Basement color presets
const BASEMENT_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Light Blue", value: "#80b1fa" },
  { label: "Yellow", value: "#e2e535" },
  { label: "Green", value: "#10b239" },
];

const FONT_STYLES: Array<{
  id: SubtitleStyles["fontStyle"];
  label: string;
}> = [
  { id: "dropShadow", label: "Drop Shadow" },
  { id: "Border", label: "Border" },
  { id: "raised", label: "Raised" },
  { id: "depressed", label: "Depressed" },
  { id: "default", label: "None" },
];

export default function ZenoxSubtitleCustomizer({
  onBack,
  backLabel = "Subtitles",
}: ZenoxSubtitleCustomizerProps) {
  const styles =
    useSettingsStore((s) => s.subtitleStyles) ?? DEFAULT_SUBTITLE_STYLES;
  const setStyles = useSettingsStore((s) => s.setSubtitleStyles);

  const [inputDelayText, setInputDelayText] = useState<string>(
    styles.delay.toFixed(1),
  );
  const [isEditingDelay, setIsEditingDelay] = useState(false);

  useEffect(() => {
    if (!isEditingDelay) {
      setInputDelayText(styles.delay.toFixed(1));
    }
  }, [styles.delay, isEditingDelay]);

  const resetToBasementDefaults = () => {
    setStyles(DEFAULT_SUBTITLE_STYLES);
    setInputDelayText("0.0");
  };

  const handleDelayChange = (newVal: number) => {
    const clamped = Math.max(-40, Math.min(40, Math.round(newVal * 10) / 10));
    setStyles({ delay: clamped });
  };

  const commitDelayInput = () => {
    setIsEditingDelay(false);
    const parsed = parseFloat(inputDelayText);
    if (!isNaN(parsed)) {
      handleDelayChange(parsed);
    } else {
      setInputDelayText(styles.delay.toFixed(1));
    }
  };

  // Delay slider progress percentage (-40 to 40)
  const delayTrackRef = useRef<HTMLDivElement>(null);
  const [isDelayDragging, setIsDelayDragging] = useState(false);
  const delayPercentage = Math.max(
    0,
    Math.min(100, ((styles.delay - -40) / (40 - -40)) * 100),
  );

  const updateDelayFromPointer = useCallback(
    (clientX: number) => {
      if (!delayTrackRef.current) return;
      const rect = delayTrackRef.current.getBoundingClientRect();
      const rawRatio = (clientX - rect.left) / rect.width;
      const clampedRatio = Math.max(0, Math.min(1, rawRatio));
      const val = -40 + clampedRatio * 80;
      handleDelayChange(val);
    },
    [],
  );

  const handleDelayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDelayDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    updateDelayFromPointer(e.clientX);
  };

  const handleDelayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDelayDragging) return;
    updateDelayFromPointer(e.clientX);
  };

  const handleDelayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDelayDragging) return;
    setIsDelayDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const numericSize =
    typeof styles.size === "number" ? styles.size : parseInt(styles.size) || 85;

  return (
    <div className="flex max-h-[60vh] flex-col gap-3.5 overflow-y-auto px-2.5 py-1 text-white select-none rail rail-hide no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Header Row: < Subtitles/Settings (left) and Reset button (right) */}
      <div className="flex items-center justify-between px-0.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.99]"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>{backLabel}</span>
        </button>

        <button
          type="button"
          onClick={resetToBasementDefaults}
          title="Reset all subtitle customizations to Basement defaults"
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-white/85 transition-colors hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-[0.99]"
        >
          <RotateCcw className="size-3 stroke-[2.5]" />
          <span>Reset</span>
        </button>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 1. SUBTITLE DELAY */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-0.5 text-xs sm:text-sm font-bold text-white/90">
          <span>Subtitle Delay</span>
          <span className="font-sans font-bold tabular-nums text-white/80">
            {styles.delay.toFixed(1)}s
          </span>
        </div>

        {/* Smooth Track (Basement Style with clearance to prevent thumb cropping) */}
        <div
          onPointerDown={handleDelayPointerDown}
          onPointerMove={handleDelayPointerMove}
          onPointerUp={handleDelayPointerUp}
          onPointerCancel={handleDelayPointerUp}
          className="group/delay relative flex h-7 w-full cursor-pointer touch-none select-none items-center px-2 py-2"
        >
          {/* Track: h-1 expanding to h-1.5 on group-hover */}
          <div
            ref={delayTrackRef}
            dir="ltr"
            className={`relative h-1 w-full rounded-full bg-white/20 transition-[height] duration-100 group-hover/delay:h-1.5 ${
              isDelayDragging ? "!h-1.5" : ""
            }`}
          >
            {/* Filled progress bar (themed with accent) */}
            <div
              className={`absolute left-0 top-0 flex h-full items-center justify-end rounded-full bg-primary ${
                isDelayDragging ? "transition-none" : "transition-[width] duration-75"
              }`}
              style={{ width: `${delayPercentage}%` }}
            >
              {/* Basement Thumb: Halo border ring with solid white center dot */}
              <div
                className={`size-4 min-w-4 rounded-full border-[3.5px] border-primary/50 bg-white shadow-[0_0_8px_var(--color-primary)] transition-[transform] duration-100 transform translate-x-1/2 ${
                  isDelayDragging ? "scale-115 shadow-md" : "group-hover/delay:scale-110"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Stepper Buttons and Direct Editable Input */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => handleDelayChange(styles.delay - 0.1)}
            aria-label="Decrease delay by 0.1s"
            className="flex h-9 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/90 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
          >
            <ChevronLeft className="size-4 stroke-[2.5]" />
          </button>

          <div className="relative w-24">
            <input
              type="text"
              value={inputDelayText}
              onFocus={() => setIsEditingDelay(true)}
              onChange={(e) => setInputDelayText(e.target.value)}
              onBlur={commitDelayInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitDelayInput();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="h-9 w-full rounded-xl border border-white/15 bg-white/5 py-1 text-center font-sans text-xs sm:text-sm font-bold tabular-nums text-white outline-none focus:border-primary"
            />
            <span className="pointer-events-none absolute right-2.5 top-2 text-[11px] font-bold text-white/40">
              s
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleDelayChange(styles.delay + 0.1)}
            aria-label="Increase delay by 0.1s"
            className="flex h-9 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/90 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
          >
            <ChevronRight className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 2. BACKGROUND OPACITY (Default: 30%) */}
      <ZenoxSlider
        label="Background Opacity"
        value={styles.backgroundOpacity ?? 30}
        min={0}
        max={100}
        step={5}
        unit="%"
        onChange={(val) => setStyles({ backgroundOpacity: val })}
      />

      {/* 3. CORNER ROUNDING (Default: 4px) */}
      <ZenoxSlider
        label="Corner Rounding"
        value={styles.backgroundRadius ?? 4}
        min={0}
        max={16}
        step={1}
        unit="px"
        onChange={(val) => setStyles({ backgroundRadius: val })}
      />

      {/* 4. TEXT SIZE (Default: 85%) */}
      <ZenoxSlider
        label="Text Size"
        value={numericSize}
        min={25}
        max={200}
        step={5}
        unit="%"
        onChange={(val) => setStyles({ size: val })}
      />

      <div className="h-px w-full bg-white/10" />

      {/* 5. FONT STYLE (Basement default: dropShadow) */}
      <div className="flex flex-col gap-2">
        <span className="text-xs sm:text-sm font-bold text-white/90">Font Style</span>
        <div className="grid grid-cols-3 gap-1.5">
          {FONT_STYLES.map((st) => {
            const active = (styles.fontStyle || "dropShadow") === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStyles({ fontStyle: st.id })}
                className={`rounded-xl py-2 text-center text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Border Thickness slider (if Border chosen) */}
        {styles.fontStyle === "Border" && (
          <div className="mt-1 pt-1">
            <ZenoxSlider
              label="Border Thickness"
              value={styles.borderThickness ?? 1}
              min={0.5}
              max={5}
              step={0.5}
              decimals={1}
              unit="px"
              onChange={(val) => setStyles({ borderThickness: val })}
            />
          </div>
        )}
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 6. BOLD TEXT (Animated spring toggle) */}
      <div className="flex items-center justify-between py-0.5">
        <span className="text-xs sm:text-sm font-bold text-white/90">Bold Text</span>
        <Toggle
          id="toggle-bold"
          checked={Boolean(styles.bold)}
          onChange={(b) => setStyles({ bold: b })}
          label="Bold Text"
        />
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 7. COLOR (Basement presets + Color picker) */}
      <div className="flex items-center justify-between py-0.5">
        <span className="text-xs sm:text-sm font-bold text-white/90">Color</span>
        <div className="flex items-center gap-2">
          {BASEMENT_COLORS.map((c) => {
            const active = styles.color.toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setStyles({ color: c.value })}
                title={c.label}
                style={{ backgroundColor: c.value }}
                className={`grid size-7 sm:size-7.5 place-items-center rounded-full transition-transform active:scale-95 ${
                  active
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-black scale-105"
                    : "hover:scale-105 opacity-80"
                }`}
              >
                {active && (
                  <Check
                    className={`size-3.5 stroke-[3] ${
                      c.value === "#ffffff" ? "text-black" : "text-white"
                    }`}
                  />
                )}
              </button>
            );
          })}

          {/* Color picker input */}
          <div className="relative inline-flex items-center">
            <input
              type="color"
              value={styles.color}
              onChange={(e) => setStyles({ color: e.target.value })}
              className="absolute inset-0 size-7 sm:size-7.5 cursor-pointer opacity-0"
              title="Pick custom color"
            />
            <div
              style={{ borderColor: styles.color }}
              className="grid size-7 sm:size-7.5 place-items-center rounded-full border-2 bg-white/10 text-white transition-transform hover:scale-105"
            >
              <Palette className="size-3.5 stroke-[2.5]" style={{ color: styles.color }} />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 8. POSITION (Basement: Default / Low vs High) */}
      <div className="flex items-center justify-between py-0.5">
        <span className="text-xs sm:text-sm font-bold text-white/90">Position</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStyles({ verticalPosition: 1 })}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              (styles.verticalPosition ?? 1) === 1
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            Default
          </button>
          <button
            type="button"
            onClick={() => setStyles({ verticalPosition: 0 })}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              styles.verticalPosition === 0
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            High
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 9. RESET BUTTON (Full width, clean like Basement) */}
      <button
        type="button"
        onClick={resetToBasementDefaults}
        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-xs font-semibold text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-[0.99]"
      >
        Reset to Defaults
      </button>
    </div>
  );
}
