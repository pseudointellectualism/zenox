/**
 * The settings surface gets its own canvas: slow folding colour fields that
 * read as liquid rather than the catalog's static ambience. Tinted from the
 * live accent token, so picking a theme repaints the page behind the picker.
 *
 * Decorative and inert. All motion collapses under reduced-motion.
 */
export default function LiquidBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-black" />

      <span
        className="liquid-field"
        style={{
          insetBlockStart: "-25%",
          insetInlineStart: "-15%",
          blockSize: "85vmax",
          inlineSize: "85vmax",
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 72%)",
          animation: "liquid 34s ease-in-out infinite",
        }}
      />
      <span
        className="liquid-field"
        style={{
          insetBlockStart: "-10%",
          insetInlineEnd: "-25%",
          blockSize: "70vmax",
          inlineSize: "70vmax",
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-primary) 16%, transparent), transparent 70%)",
          animation: "liquid 46s ease-in-out -12s infinite reverse",
        }}
      />
      <span
        className="liquid-field"
        style={{
          insetBlockEnd: "-35%",
          insetInlineStart: "10%",
          blockSize: "78vmax",
          inlineSize: "78vmax",
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-primary) 12%, transparent), transparent 68%)",
          animation: "liquid 58s ease-in-out -26s infinite",
        }}
      />

      {/* Darken the working area so cards and body copy hold contrast. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(92% 72% at 50% 45%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.92) 100%)",
        }}
      />
      <div className="liquid-grain" />
    </div>
  );
}
