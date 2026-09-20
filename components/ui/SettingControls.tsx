"use client";

import { useId } from "react";
import { motion } from "motion/react";

import Dropdown from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------- containers */

export function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative rounded-2xl border border-white/12 bg-black/62 backdrop-blur-[24px]">
      <header className="px-5 pb-4 pt-5 sm:px-6">
        <h2 className="text-title-lg text-white">{title}</h2>
        {description && <p className="mt-1 text-body-md text-white/70">{description}</p>}
      </header>
      <div className="px-5 pb-2 sm:px-6">{children}</div>
    </section>
  );
}

/** Label and description on the left, control on the right, hairline between. */
export function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/8 py-4 first:border-t-0">
      <div className="min-w-0 flex-1">
        <label
          htmlFor={htmlFor}
          className={cn("block text-label-md text-white", htmlFor && "cursor-pointer")}
        >
          {label}
        </label>
        {description && (
          <p className="mt-0.5 max-w-md text-label-sm leading-relaxed text-white/65">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- controls */

export function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 cursor-pointer select-none",
        checked ? "border-primary/50 bg-primary" : "border-white/15 bg-white/10",
      )}
    >
      <span
        className={cn(
          "block size-5 rounded-full shadow-sm transition-transform duration-200 ease-out pointer-events-none",
          checked ? "translate-x-5 bg-on-primary" : "translate-x-0 bg-white/70",
        )}
      />
    </button>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
  label: string;
}) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-full border border-white/12 bg-white/[0.06] p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-label-sm transition-colors duration-200",
              active ? "text-black" : "text-white/55 hover:text-white",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${groupId}`}
                className="absolute inset-0 -z-10 rounded-full bg-white"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SelectField<T extends string>({
  id,
  value,
  options,
  onChange,
  label,
  placement = "auto",
}: {
  id?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
  placement?: "bottom" | "top" | "auto";
}) {
  return (
    <Dropdown
      id={id}
      value={value}
      options={options}
      onChange={onChange}
      label={label}
      size="md"
      align="right"
      placement={placement}
    />
  );
}

export function SliderField({
  id,
  value,
  onChange,
  label,
  format,
  min = 0,
  max = 1,
  step = 0.05,
}: {
  id?: string;
  value: number;
  onChange: (next: number) => void;
  label: string;
  format: (value: number) => string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-36 cursor-pointer appearance-none rounded-full bg-white/15 accent-[var(--color-primary)]"
      />
      <span className="w-10 text-right text-label-sm tabular-nums text-white/60">
        {format(value)}
      </span>
    </div>
  );
}
