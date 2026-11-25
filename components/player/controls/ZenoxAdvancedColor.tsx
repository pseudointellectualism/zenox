"use client";

import { ChevronLeft, RotateCcw, Sparkles } from "lucide-react";
import {
  DEFAULT_VIDEO_SETTINGS,
  useSettingsStore,
} from "@/lib/store/useSettingsStore";
import ZenoxSlider from "./ZenoxSlider";

interface ZenoxAdvancedColorProps {
  onBack: () => void;
}

interface ColorPreset {
  id: string;
  label: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

const COLOR_PRESETS: ColorPreset[] = [
  { id: "default", label: "Default", brightness: 100, contrast: 100, saturation: 100, hue: 0 },
  { id: "hdr", label: "HDR", brightness: 110, contrast: 125, saturation: 130, hue: 0 },
  { id: "vibrant", label: "Vibrant", brightness: 105, contrast: 115, saturation: 145, hue: 0 },
  { id: "cinematic", label: "Cinematic", brightness: 95, contrast: 115, saturation: 90, hue: 5 },
  { id: "warm", label: "Warm", brightness: 100, contrast: 105, saturation: 110, hue: 15 },
  { id: "cool", label: "Cool", brightness: 105, contrast: 105, saturation: 95, hue: 345 },
];

export default function ZenoxAdvancedColor({
  onBack,
}: ZenoxAdvancedColorProps) {
  const videoSettings =
    useSettingsStore((s) => s.videoSettings) ?? DEFAULT_VIDEO_SETTINGS;
  const setVideoSettings = useSettingsStore((s) => s.setVideoSettings);

  const handleReset = () => {
    setVideoSettings({
      brightness: DEFAULT_VIDEO_SETTINGS.brightness,
      contrast: DEFAULT_VIDEO_SETTINGS.contrast,
      saturation: DEFAULT_VIDEO_SETTINGS.saturation,
      hue: DEFAULT_VIDEO_SETTINGS.hue,
    });
  };

  const applyPreset = (preset: ColorPreset) => {
    setVideoSettings({
      brightness: preset.brightness,
      contrast: preset.contrast,
      saturation: preset.saturation,
      hue: preset.hue,
    });
  };

  // Detect which preset matches current values
  const activePreset = COLOR_PRESETS.find(
    (p) =>
      p.brightness === videoSettings.brightness &&
      p.contrast === videoSettings.contrast &&
      p.saturation === videoSettings.saturation &&
      p.hue === videoSettings.hue,
  );

  return (
    <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-2 py-0.5 text-white select-none rail">
      {/* Header: < Video (left) and Reset (right) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-label-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.99]"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>Video</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          title="Reset color adjustments to default"
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/85 transition-colors hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-[0.99]"
        >
          <RotateCcw className="size-3 stroke-[2.5]" />
          <span>Reset</span>
        </button>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* Color Presets */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
          <Sparkles className="size-3.5 stroke-[2.5] text-white/85" />
          <span>Color Presets</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {COLOR_PRESETS.map((p) => {
            const isSelected = activePreset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`rounded-lg py-1.5 text-center text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* 1. Brightness Slider (Synced with Video Settings) */}
      <ZenoxSlider
        label="Brightness"
        value={videoSettings.brightness}
        min={50}
        max={150}
        step={1}
        unit="%"
        onChange={(val) => setVideoSettings({ brightness: val })}
      />

      {/* 2. Contrast Slider */}
      <ZenoxSlider
        label="Contrast"
        value={videoSettings.contrast}
        min={50}
        max={200}
        step={1}
        unit="%"
        onChange={(val) => setVideoSettings({ contrast: val })}
      />

      {/* 3. Saturation Slider */}
      <ZenoxSlider
        label="Saturation"
        value={videoSettings.saturation}
        min={0}
        max={200}
        step={1}
        unit="%"
        onChange={(val) => setVideoSettings({ saturation: val })}
      />

      {/* 4. Hue Slider */}
      <ZenoxSlider
        label="Hue"
        value={videoSettings.hue}
        min={0}
        max={360}
        step={1}
        unit="°"
        onChange={(val) => setVideoSettings({ hue: val })}
      />
    </div>
  );
}
