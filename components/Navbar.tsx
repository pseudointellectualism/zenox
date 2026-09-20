"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, Menu, Search, Settings, X } from "lucide-react";

import AccountMenu from "@/components/account/AccountMenu";
import DiscordLink from "@/components/DiscordLink";
import ZenoxMark from "@/components/ZenoxMark";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useOverlay } from "@/components/overlay/OverlayProvider";
import { preloadConnections } from "@/lib/utils/connectionsPreload";
import { cn } from "@/lib/utils";
import { useAppReducedMotion } from "@/lib/useMotionPreference";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "Shows" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { openSettings, openSearch } = useOverlay();
  const reduce = useAppReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="mx-auto grid max-w-[1536px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 lg:py-5">
        <Link
          href="/"
          aria-label="Zenox home"
          className="group pointer-events-auto justify-self-start transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {/* <ZenoxMark className="size-9" /> */}
          <span className="zenox-wordmark text-[1.75rem] sm:text-[2.25rem] lg:text-[2.6rem] font-black leading-none select-none">
            zenox.
          </span>
        </Link>

        {/* Outer columns carry equal weight (1fr each), so the middle column
            lands on the page centre no matter how wide the logo or the action
            cluster grow. */}
        <nav className="pointer-events-auto hidden justify-self-center lg:block">
          <ul className="flex items-center gap-1 rounded-full border border-white/12 bg-black/45 p-1.5 backdrop-blur-[20px]">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block rounded-full px-5 py-2 text-label-md transition-colors duration-200",
                      active ? "text-on-primary font-medium" : "text-white/60 hover:text-white",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 -z-10 rounded-full bg-primary"
                        transformTemplate={(_, generated) =>
                          generated
                            .replace(/translate3d\(([^,]+),\s*[^,]+/, "translate3d($1, 0px")
                            .replace(/translate\(([^,]+),\s*[^)]+\)/, "translate($1, 0px)")
                            .replace(/translateY\([^)]+\)/, "translateY(0px)")
                        }
                        transition={
                          reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }
                        }
                      />
                    )}
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="pointer-events-auto col-start-3 flex items-center gap-1 justify-self-end rounded-full border border-white/12 bg-black/45 p-1 sm:p-1.5 backdrop-blur-[20px]">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            className="grid size-9 place-items-center rounded-full text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          >
            <Search className="size-4.5" />
          </button>

          <IconLink
            href="/library"
            label="Library"
            active={pathname.startsWith("/library") || pathname.startsWith("/my-list") || pathname.startsWith("/new")}
          >
            <Bookmark className="size-4.5" />
          </IconLink>

          <NotificationBell />
          <DiscordLink variant="icon" />

          <button
            type="button"
            onClick={() => {
              preloadConnections();
              openSettings();
            }}
            onMouseEnter={() => preloadConnections()}
            aria-label="Settings"
            className="grid size-9 place-items-center rounded-full text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          >
            <Settings className="size-4.5" />
          </button>

          <span aria-hidden className="mx-1 h-5 w-px bg-white/12" />
          <AccountMenu />

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="grid size-9 place-items-center rounded-full text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={reduce ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto mx-4 rounded-2xl border border-white/15 bg-black/85 p-2 backdrop-blur-[40px] sm:mx-6 lg:hidden"
          >
            <ul>
              {LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-xl px-4 py-3 text-label-md transition-colors",
                        active ? "bg-white text-black" : "text-white/70 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function IconLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "grid size-9 place-items-center rounded-full transition-colors duration-200",
        active ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}
