"use client";

import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowUp } from "lucide-react";

import { useAppReducedMotion } from "@/lib/useMotionPreference";

/**
 * Appears once the viewer is deep enough that the nav is a long way back.
 * Driven by Motion's scroll observer rather than a scroll listener, so it
 * costs nothing per frame.
 */
export default function ScrollToTop() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  const reduce = useAppReducedMotion();

  useMotionValueEvent(scrollY, "change", (value) => {
    setVisible(value > 900);
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
          }
          aria-label="Back to top"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="fixed bottom-6 right-6 z-40 grid size-12 place-items-center rounded-full border border-primary/40 bg-primary/12 text-primary backdrop-blur-[20px] transition-colors duration-200 hover:bg-primary hover:text-on-primary"
        >
          <ArrowUp className="size-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
