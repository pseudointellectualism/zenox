"use client";

import { useEffect, useRef } from "react";

/**
 * Marks a container the first time it enters the viewport, so CSS can play a
 * staggered entrance on its children.
 *
 * Deliberately not a JS-driven animation. Children rest at their visible state
 * and the keyframe only runs *backwards* into view, so if this observer never
 * fires the content is simply shown without motion. A reveal that can leave the
 * catalog invisible is worse than no reveal at all.
 */
export function useRevealOnView<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    // No observer support means no animation, which is the safe direction.
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "shown");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
