"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Captions,
  Link2,
  MonitorPlay,
  Palette,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";

import LiquidBackdrop from "@/components/settings/LiquidBackdrop";
import { ConnectionsPanel } from "@/components/settings/ConnectionsPanel";
import {
  AppearancePanel,
  PlaybackPanel,
  ProfilePanel,
  SubtitlesPanel,
} from "@/components/settings/panels";
import type { StreamProviderConfig } from "@/lib/providers";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "playback", label: "Playback", icon: MonitorPlay },
  { id: "subtitles", label: "Subtitles", icon: Captions },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsClient({ providers }: { providers: StreamProviderConfig[] }) {
  const [tab, setTab] = useState<TabId>("profile");
  const [direction, setDirection] = useState<number>(1);
  const reduce = useReducedMotion();

  const handleTabChange = (newTab: TabId) => {
    const prevIdx = TABS.findIndex((t) => t.id === tab);
    const nextIdx = TABS.findIndex((t) => t.id === newTab);
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    setTab(newTab);
  };

  return (
    <div className="relative isolate min-h-dvh">
      <LiquidBackdrop />

      <div className="relative mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6 lg:pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-label-md text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <h1 className="mt-6 flex items-center justify-center gap-3 text-headline-lg text-white">
          <SettingsIcon className="size-7 text-primary" />
          Settings
        </h1>

        <div
          role="tablist"
          aria-label="Settings sections"
          className="rail rail-hide mt-8 flex justify-start gap-1 overflow-x-auto pb-1 sm:justify-center"
        >
          {TABS.map((item) => {
            const active = item.id === tab;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={active}
                aria-controls={`panel-${item.id}`}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 px-4 py-2.5 text-label-md transition-colors duration-200 whitespace-nowrap",
                  active ? "text-white" : "text-white/65 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
                {active && (
                  <motion.span
                    layoutId="settings-tab"
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
        <div aria-hidden className="h-px w-full bg-white/10" />

        <div className="mt-7 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={tab}
              id={`panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
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
    </div>
  );
}
