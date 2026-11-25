"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Captions, Link2, MonitorPlay, Palette, UserRound } from "lucide-react";

import Modal from "@/components/overlay/Modal";
import { ConnectionsPanel } from "@/components/settings/ConnectionsPanel";
import {
  AppearancePanel,
  PlaybackPanel,
  ProfilePanel,
  SubtitlesPanel,
} from "@/components/settings/panels";
import { cn } from "@/lib/utils";
import { useAppReducedMotion } from "@/lib/useMotionPreference";

const TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "playback", label: "Playback", icon: MonitorPlay },
  { id: "subtitles", label: "Subtitles", icon: Captions },
] as const;

type TabId = (typeof TABS)[number]["id"];

import { preloadConnections } from "@/lib/utils/connectionsPreload";
import { useEffect } from "react";

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<TabId>("profile");
  const [direction, setDirection] = useState<number>(1);
  const reduce = useAppReducedMotion();

  useEffect(() => {
    if (open) {
      preloadConnections();
    }
  }, [open]);

  const handleTabChange = (newTab: TabId) => {
    if (newTab === "connections") {
      preloadConnections();
    }
    const prevIdx = TABS.findIndex((t) => t.id === tab);
    const nextIdx = TABS.findIndex((t) => t.id === newTab);
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    setTab(newTab);
  };

  return (
    <Modal open={open} onClose={onClose} label="Settings" size="xl">
      <div className="px-5 pb-7 pt-6 sm:px-7">
        <h2 className="text-headline-md text-white">Settings</h2>

        <div
          role="tablist"
          aria-label="Settings sections"
          className="rail rail-hide mt-5 flex items-center justify-start sm:justify-center gap-1 sm:gap-2 md:gap-3 overflow-x-auto border-b border-white/10 pb-px scroll-smooth"
        >
          {TABS.map((item) => {
            const active = item.id === tab;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                role="tab"
                id={`settings-tab-${item.id}`}
                aria-selected={active}
                aria-controls={`settings-panel-${item.id}`}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "relative flex shrink-0 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-label-sm sm:text-label-md transition-colors duration-200 whitespace-nowrap",
                  active ? "text-white font-semibold" : "text-white/60 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="settings-modal-tab"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 min-h-[460px] overflow-x-clip overflow-y-visible">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={tab}
              id={`settings-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${tab}`}
              custom={direction}
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? 32 : -32,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (dir: number) => ({
                  x: dir > 0 ? -32 : 32,
                  opacity: 0,
                }),
              }}
              initial={reduce ? false : "enter"}
              animate="center"
              exit={reduce ? undefined : "exit"}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === "profile" && <ProfilePanel />}
              {tab === "connections" && <ConnectionsPanel />}
              {tab === "appearance" && <AppearancePanel />}
              {tab === "playback" && <PlaybackPanel />}
              {tab === "subtitles" && <SubtitlesPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}
