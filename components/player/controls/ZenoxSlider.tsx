"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ZenoxSliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  decimals?: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export default function ZenoxSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  decimals = 0,
  onChange,
  formatValue,
}: ZenoxSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(String(value));

  useEffect(() => {
    if (!isEditing) {
      setEditInput(decimals > 0 ? value.toFixed(decimals) : String(value));
    }
  }, [value, decimals, isEditing]);

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rawRatio = (clientX - rect.left) / rect.width;
      const clampedRatio = Math.max(0, Math.min(1, rawRatio));
      const rawVal = min + clampedRatio * (max - min);
      const stepped = Math.round((rawVal - min) / step) * step + min;
      const precision = Math.pow(10, decimals);
      const finalVal = Math.round(stepped * precision) / precision;
      onChange(Math.max(min, Math.min(max, finalVal)));
    },
    [min, max, step, decimals, onChange],
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
    const parsed = parseFloat(editInput);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      const precision = Math.pow(10, decimals);
      onChange(Math.round(clamped * precision) / precision);
    } else {
      setEditInput(decimals > 0 ? value.toFixed(decimals) : String(value));
    }
  };

  const displayString = formatValue
    ? formatValue(value)
    : `${decimals > 0 ? value.toFixed(decimals) : value}${unit}`;

  return (
    <div className="flex flex-col gap-2 select-none">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white/90">{label}</span>
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
              className="w-16 rounded-lg border border-white/30 bg-black/80 px-2 py-0.5 text-center font-sans text-xs font-bold text-white tabular-nums outline-none focus:border-primary"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              title="Click to type exact value"
              className="rounded-lg px-2 py-0.5 font-sans text-sm font-bold text-white/80 tabular-nums transition-colors hover:bg-white/15 hover:text-white"
            >
              {displayString}
            </button>
          )}
        </div>
      )}

      {/* Basement Slider Track (Clean full-width with clearance) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="group/slider relative flex h-7 w-full cursor-pointer touch-none select-none items-center px-2 py-2"
      >
        {/* Track: h-1 expanding to h-1.5 on group-hover */}
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
            {/* Basement Thumb: Halo border ring with solid white center dot */}
            <div
              className={`size-4 min-w-4 rounded-full border-[3.5px] border-primary/50 bg-white shadow-[0_0_8px_var(--color-primary)] transition-[transform] duration-100 transform translate-x-1/2 ${
                isDragging ? "scale-115 shadow-md" : "group-hover/slider:scale-110"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

