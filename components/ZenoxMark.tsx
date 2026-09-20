import { cn } from "@/lib/utils";

/**
 * Zenox's Cinema Flame: Two-tone minimalist fire mark.
 */
export default function ZenoxMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center select-none",
        className,
      )}
    >
      <svg
        viewBox="0 0 512 512"
        fill="currentColor"
        className="size-full object-contain"
        aria-hidden="true"
      >
        <path d="M 256 96 C 256 160 300 180 300 240 C 300 270 280 294 256 294 C 232 294 212 270 212 240 C 212 210 230 184 236 156 C 180 184 148 244 148 300 C 148 366 196 416 256 416 C 316 416 364 366 364 300 C 364 216 304 152 256 96 Z" />
      </svg>
    </span>
  );
}

/** Mark plus wordmark, for the footer and other full-width lockups. */
export function ZenoxLockup({ className }: { className?: string }) {
  return (
    <span className={cn("group flex items-center gap-2.5", className)}>
      <ZenoxMark className="size-8" />
      <span className="zenox-wordmark text-3xl font-black leading-none select-none">
        zenox.
      </span>
    </span>
  );
}
