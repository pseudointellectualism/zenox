"use client";

import Image from "next/image";
import Link from "next/link";

import { tmdbImage } from "@/lib/tmdb-image";
import type { WatchProvider } from "@/lib/types";
import { cn, posterGradient } from "@/lib/utils";

interface ProviderRailProps {
  providers: WatchProvider[];
  /** Catalog route the tiles filter into. */
  basePath?: string;
}

export default function ProviderRail({ providers, basePath = "/movies" }: ProviderRailProps) {
  if (!providers.length) return null;

  return (
    <section className="relative pt-2 pb-6 sm:pt-4 sm:pb-8">
      <div className="mb-4 w-full px-4 sm:px-12 lg:px-16">
        <h2 className="text-headline-md text-white">Browse by Provider</h2>
      </div>

      <div className="relative">
        <ul className="rail rail-hide flex w-full gap-4 overflow-x-auto px-4 pb-4 pt-3 sm:gap-7 sm:justify-center sm:px-12 lg:px-16">
          {providers.map((provider) => (
            <li
              key={provider.id}
              className="w-[88px] shrink-0 sm:w-[102px]"
            >
              <Link
                href={`${basePath}?provider=${provider.id}`}
                className="group flex flex-col items-center gap-2.5 text-center"
              >
                <span
                  className={cn(
                    "relative grid size-[80px] place-items-center overflow-hidden rounded-2xl sm:size-[92px] sm:rounded-3xl",
                    "border border-white/12 bg-surface-lowest shadow-[0_8px_20px_rgba(0,0,0,0.35)]",
                    "transition-[transform,border-color,box-shadow] duration-300",
                    "group-hover:-translate-y-1.5 group-hover:border-white/30",
                    "group-hover:shadow-[0_16px_36px_-8px_rgba(0,0,0,0.85)]",
                    "after:pointer-events-none after:absolute after:inset-0 after:content-['']",
                    "after:bg-[linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.14),transparent_72%)]",
                    "after:-translate-x-full after:transition-transform after:duration-700 after:ease-out",
                    "group-hover:after:translate-x-full",
                  )}
                >
                  <ProviderTile provider={provider} />
                </span>
                <span className="line-clamp-2 max-w-[96px] text-label-sm font-medium leading-tight text-white/60 transition-colors group-hover:text-white">
                  {provider.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile-only edge fade on right edge only */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-canvas to-transparent sm:hidden"
        />
      </div>
    </section>
  );
}

/**
 * Real provider marks come from TMDB. When there is no logo, a monogram plate
 * stands in. Brand logos are never redrawn by hand.
 */
function ProviderTile({ provider }: { provider: WatchProvider }) {
  const src = tmdbImage(provider.logoPath, "original");

  if (src) {
    return (
      <Image
        src={src}
        alt={provider.name}
        fill
        unoptimized
        sizes="(min-width: 640px) 184px, 160px"
        className="object-cover"
      />
    );
  }

  const { from, to } = posterGradient(provider.name);
  const monogram = provider.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className="absolute inset-0 grid place-items-center"
      style={{ background: `linear-gradient(150deg, ${from}, ${to})` }}
    >
      <span className="font-[family-name:var(--font-display)] text-lg font-bold text-white/85">
        {monogram}
      </span>
    </span>
  );
}
