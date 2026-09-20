"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import type { Genre } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  genres: Genre[];
}

const SORTS = [
  { value: "popularity", label: "Popular" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const DECADES = [CURRENT_YEAR, 2020, 2010, 2000, 1990, 1980];

export default function FilterBar({ genres }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const activeGenre = params.get("genre");
  const activeSort = params.get("sort") ?? "popularity";
  const activeFrom = params.get("from");
  const activeProvider = params.get("provider");
  const isNetflix = activeProvider === "8" || activeProvider === "175";
  const isNetflixKids = activeProvider === "175";

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null) next.delete(key);
      else next.set(key, value);
      next.delete("page");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const hasFilters = Boolean(activeGenre || activeFrom || params.get("sort") || activeProvider);

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-2 text-label-sm uppercase tracking-[0.14em] text-secondary">
          <SlidersHorizontal className="size-3.5" />
          Genre
        </span>

        <Pill active={!activeGenre} onClick={() => setParam("genre", null)}>
          All
        </Pill>
        {genres.map((genre) => (
          <Pill
            key={genre.id}
            active={activeGenre === String(genre.id)}
            onClick={() =>
              setParam("genre", activeGenre === String(genre.id) ? null : String(genre.id))
            }
          >
            {genre.name}
          </Pill>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-outline pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-label-sm uppercase tracking-[0.14em] text-secondary">Sort</span>
          {SORTS.map((sort) => (
            <Pill
              key={sort.value}
              active={activeSort === sort.value}
              onClick={() => setParam("sort", sort.value)}
            >
              {sort.label}
            </Pill>
          ))}

          {/* Dedicated Netflix Kids toggle when browsing Netflix */}
          {isNetflix && (
            <button
              type="button"
              onClick={() => setParam("provider", isNetflixKids ? "8" : "175")}
              aria-pressed={isNetflixKids}
              className={cn(
                "ml-2 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-label-sm font-bold tracking-wide transition-all duration-300",
                isNetflixKids
                  ? "bg-[#E50914] text-white shadow-[0_0_18px_rgba(229,9,20,0.65)] ring-2 ring-white/30"
                  : "border border-[#E50914]/80 bg-[#E50914]/15 text-[#ff4d58] hover:bg-[#E50914] hover:text-white hover:shadow-[0_0_15px_rgba(229,9,20,0.45)]",
              )}
            >
              <span className="flex size-4.5 items-center justify-center rounded bg-black font-black text-[10px] text-[#E50914] shadow-sm">
                N
              </span>
              <span>Netflix Kids</span>
              {isNetflixKids && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider text-white">
                  ON
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-label-sm uppercase tracking-[0.14em] text-secondary">From</span>
          {DECADES.map((year) => (
            <Pill
              key={year}
              active={activeFrom === String(year)}
              onClick={() => setParam("from", activeFrom === String(year) ? null : String(year))}
            >
              {year === CURRENT_YEAR ? "This year" : `${year}s`}
            </Pill>
          ))}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-sm text-muted transition-colors hover:text-white"
          >
            <X className="size-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-label-sm transition-colors duration-200",
        active
          ? "border-transparent bg-white text-black font-semibold"
          : "border-white/12 bg-white/5 text-white/70 hover:border-white/25 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
