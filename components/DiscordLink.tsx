import { cn } from "@/lib/utils";

/**
 * Community link pointing to the official Zenox Discord server.
 */
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || "";

function DiscordGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.432 3a13.9 13.9 0 0 0-.617 1.269 18.27 18.27 0 0 0-5.63 0A13.4 13.4 0 0 0 8.56 3a19.74 19.74 0 0 0-4.886 1.372C.605 8.98-.232 13.475.182 17.906a19.9 19.9 0 0 0 6.03 3.05 14.6 14.6 0 0 0 1.29-2.103 13 13 0 0 1-2.032-.978c.171-.125.338-.255.5-.388a14.2 14.2 0 0 0 12.06 0c.164.14.33.27.5.388a13 13 0 0 1-2.036.98 14.4 14.4 0 0 0 1.29 2.102 19.85 19.85 0 0 0 6.032-3.05c.485-5.14-.829-9.595-3.5-13.538M8.02 15.2c-1.17 0-2.134-1.076-2.134-2.398s.944-2.4 2.134-2.4 2.155 1.086 2.135 2.4c0 1.322-.945 2.398-2.135 2.398m7.96 0c-1.17 0-2.133-1.076-2.133-2.398s.943-2.4 2.133-2.4 2.155 1.086 2.135 2.4c0 1.322-.945 2.398-2.135 2.398" />
    </svg>
  );
}

export default function DiscordLink({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "full";
  className?: string;
}) {
  const shared =
    "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  if (!DISCORD_URL) {
    // The nav bar is dense, so an unconfigured icon is simply omitted there
    // rather than shipped as a dead control. The footer still explains itself.
    if (variant === "icon") return null;
    return (
      <span
        className={cn("inline-flex items-center gap-2 text-label-md text-white/30", className)}
        title="Set NEXT_PUBLIC_DISCORD_URL to enable"
      >
        <DiscordGlyph className="size-5" />
        Discord (link coming soon)
      </span>
    );
  }

  if (variant === "icon") {
    return (
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join our Discord community"
        className={cn(
          "grid size-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white",
          shared,
          className,
        )}
      >
        <DiscordGlyph className="size-4.5" />
      </a>
    );
  }

  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/8 px-5 py-2.5 text-label-md text-white hover:bg-white/15",
        shared,
        className,
      )}
    >
      <DiscordGlyph className="size-5" />
      Join our Discord
    </a>
  );
}
