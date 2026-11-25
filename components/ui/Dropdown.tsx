"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
}

export interface DropdownProps<T extends string | number> {
  id?: string;
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (next: T) => void;
  label?: string;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  placement?: "bottom" | "top" | "auto";
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export default function Dropdown<T extends string | number>({
  id,
  value,
  options,
  onChange,
  label,
  placeholder = "Select an option",
  size = "md",
  align = "right",
  placement: placementProp = "auto",
  className,
  triggerClassName,
  menuClassName,
  disabled = false,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">(
    placementProp === "top" ? "top" : "bottom",
  );
  const [maxMenuHeight, setMaxMenuHeight] = useState<number>(260);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Position detection: Only flip upward if explicitly requested or if cramped below with ample room above
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollParent = containerRef.current.closest(".modal-panel, [data-scroll-container]") || null;

    let spaceBelow = window.innerHeight - rect.bottom - 16;
    let spaceAbove = rect.top - 16;

    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      spaceBelow = parentRect.bottom - rect.bottom - 16;
      spaceAbove = rect.top - parentRect.top - 16;
    }

    if (placementProp === "bottom") {
      setPlacement("bottom");
      setMaxMenuHeight(Math.max(120, Math.min(320, Math.floor(spaceBelow > 0 ? spaceBelow : 260))));
      return;
    }
    if (placementProp === "top") {
      setPlacement("top");
      setMaxMenuHeight(Math.max(160, Math.min(320, Math.floor(spaceAbove > 0 ? spaceAbove : 280))));
      return;
    }

    // Auto placement: If space below is cramped (< 260px) and space above has more room, flip upward!
    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      setPlacement("top");
      setMaxMenuHeight(Math.max(140, Math.min(320, Math.floor(spaceAbove))));
    } else {
      setPlacement("bottom");
      setMaxMenuHeight(Math.max(140, Math.min(280, Math.floor(spaceBelow))));
    }
  }, [open, placementProp]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const sizeStyles = {
    sm: "py-1.5 pl-3.5 pr-8 text-label-sm gap-2",
    md: "py-2 pl-4 pr-9 text-label-md gap-2.5",
    lg: "py-2.5 pl-5 pr-10 text-label-md gap-3",
  }[size];

  const chevronSizes = {
    sm: "size-3.5 right-2.5",
    md: "size-4 right-3",
    lg: "size-4.5 right-3.5",
  }[size];

  const transformOrigin =
    placement === "top"
      ? align === "right"
        ? "bottom right"
        : "bottom left"
      : align === "right"
        ? "top right"
        : "top left";

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block text-left", open && "z-50", className)}
    >
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative inline-flex items-center justify-between rounded-full border border-white/15 bg-white/6 font-medium text-white shadow-xs backdrop-blur-md transition-all duration-200",
          "hover:border-white/30 hover:bg-white/10 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          "disabled:pointer-events-none disabled:opacity-40",
          open && "border-white/35 bg-white/12 shadow-[0_0_16px_rgba(255,255,255,0.08)]",
          sizeStyles,
          triggerClassName,
        )}
      >
        <span className="truncate pr-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-white/60 transition-transform duration-200",
            open && "rotate-180 text-white",
            chevronSizes,
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, scale: 0.95, y: placement === "top" ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: placement === "top" ? 4 : -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin }}
            className={cn(
              "absolute z-50 min-w-[190px] max-w-[calc(100vw-2rem)] sm:max-w-xs overflow-hidden rounded-2xl border border-white/15 bg-black/95 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl ring-1 ring-white/10",
              placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
              align === "right" ? "right-0" : "left-0",
              menuClassName,
            )}
          >
            <div
              style={{ maxHeight: `${maxMenuHeight}px` }}
              className="rail rail-hide no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overflow-y-auto space-y-0.5 overscroll-contain"
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "group flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-left text-label-sm transition-colors duration-150 cursor-pointer",
                      isSelected
                        ? "bg-white/15 font-semibold text-white shadow-xs"
                        : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate leading-tight">{option.label}</p>
                      {option.description && (
                        <p className="mt-0.5 truncate text-[0.6875rem] text-white/45">
                          {option.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="size-4 shrink-0 text-white stroke-[2.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
