"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  size?: "md" | "lg" | "xl";
  /** Render the close button over the content rather than in a header row. */
  floatingClose?: boolean;
  className?: string;
  children: React.ReactNode;
}

const SIZES = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

/**
 * Built on the native <dialog> element rather than a hand-rolled overlay.
 * That buys real focus trapping, Escape handling, inert background content and
 * top-layer painting from the platform, none of which need to be reimplemented
 * or kept in sync with a z-index scale.
 */
export default function Modal({
  open,
  onClose,
  label,
  size = "lg",
  floatingClose = false,
  className,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // The page behind must not scroll while a dialog owns the screen.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={cn("modal", SIZES[size], className)}
      // Escape fires `cancel`; keep React state as the source of truth.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      // A click landing on the dialog itself is a click on the backdrop.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-panel">
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${label}`}
          className={cn(
            "absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full",
            "text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white",
            floatingClose && "bg-black/50 backdrop-blur-sm",
          )}
        >
          <X className="size-5" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
