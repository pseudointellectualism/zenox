import Link from "next/link";

import DiscordLink from "@/components/DiscordLink";
import { ZenoxLockup } from "@/components/ZenoxMark";

const COLUMNS = [
  {
    heading: "Browse",
    links: [
      { href: "/movies", label: "Movies" },
      { href: "/tv", label: "Shows" },
      { href: "/trending", label: "Trending" },
      { href: "/?search=1", label: "Search" },
    ],
  },
  {
    heading: "Library",
    links: [
      { href: "/library", label: "Library" },
      { href: "/library#history", label: "Continue Watching" },
      { href: "/?settings=1", label: "Settings" },
    ],
  },
  {
    heading: "Genres",
    links: [
      { href: "/movies?genre=18", label: "Drama" },
      { href: "/movies?genre=878", label: "Sci-Fi" },
      { href: "/movies?genre=53", label: "Thriller" },
      { href: "/tv?genre=80", label: "Crime Series" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-outline">
      <div className="w-full px-8 py-14 sm:px-12 lg:px-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <ZenoxLockup />
            <p className="mt-4 max-w-sm text-body-md text-muted leading-relaxed">
              Ultra-fast streaming platform for movies and series with dynamic subtitles, high-speed playback servers, and clean modern aesthetics.
            </p>
            <DiscordLink variant="full" className="mt-5" />
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-label-sm uppercase tracking-[0.14em] text-secondary">
                {col.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-body-md text-muted transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-outline pt-6 text-label-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Zenox. All rights reserved.</p>
          <p className="max-w-xl sm:text-right">
            Zenox does not host or store any media files on its servers. All streams and catalog content are provided and delivered by non-affiliated third-party sources.
          </p>
        </div>
      </div>
    </footer>
  );
}
