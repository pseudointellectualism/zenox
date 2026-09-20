"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import CatalogGrid from "@/components/CatalogGrid";
import type { MediaSummary, MediaType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | MediaType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV Shows" },
];

export default function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";

  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  // Debounced fetch; the request is aborted whenever the query moves on.
  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results: MediaSummary[] };
        setResults(data.results ?? []);
        setStatus("done");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("done");
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Keep the URL shareable without pushing a history entry per keystroke.
  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(() => {
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false });
    }, 500);
    return () => clearTimeout(timer);
  }, [query, router]);

  const filtered = useMemo(
    () => (filter === "all" ? results : results.filter((r) => r.mediaType === filter)),
    [results, filter],
  );

  const counts = useMemo(
    () => ({
      all: results.length,
      movie: results.filter((r) => r.mediaType === "movie").length,
      tv: results.filter((r) => r.mediaType === "tv").length,
    }),
    [results],
  );

  return (
    <div className="mx-auto max-w-page px-4 pb-16 pt-28 sm:px-6 lg:pt-32">
      <h1 className="text-headline-lg text-white">Search</h1>

      <div className="glass mt-6 flex items-center gap-3 rounded-full border border-white/15 px-5 py-3 transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_18px_rgba(255,255,255,0.12)]">
        <Search className="size-5 shrink-0 text-muted" />
        <input
          autoFocus
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search films and series…"
          aria-label="Search the catalog"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="w-full bg-transparent text-body-lg text-white placeholder:text-muted outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 !outline-none"
          style={{ outline: "none", boxShadow: "none" }}
        />
        {status === "loading" && <Loader2 className="size-5 shrink-0 animate-spin text-white" />}
        {query && status !== "loading" && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "rounded-full border px-4 py-1.5 text-label-sm font-medium transition-colors duration-200",
                filter === f.value
                  ? "border-transparent bg-white text-black font-semibold"
                  : "border-white/12 bg-white/5 text-white/60 hover:text-white",
              )}
            >
              {f.label}
              <span className="ml-2 opacity-60">{counts[f.value]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {query.trim().length < 2 ? (
          <div className="glass rounded-xl px-6 py-16 text-center">
            <p className="text-body-lg text-muted">
              Type at least two characters to search the catalog.
            </p>
          </div>
        ) : status === "loading" && !results.length ? (
          <SearchSkeleton />
        ) : (
          <CatalogGrid
            items={filtered}
            emptyMessage={`No results for “${query.trim()}”. Try a different title or genre.`}
          />
        )}
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <li
          key={i}
          className="aspect-2/3 animate-pulse rounded-xl border border-outline bg-[rgba(29,23,40,0.5)]"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </ul>
  );
}
