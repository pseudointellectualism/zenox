"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Loader2, Search as SearchIcon, Tv, X } from "lucide-react";

import Modal from "@/components/overlay/Modal";
import MediaCard from "@/components/MediaCard";
import type { MediaSummary, MediaType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | MediaType;

const FILTERS: { value: Filter; label: string; icon: typeof Film }[] = [
  { value: "all", label: "Everything", icon: Film },
  { value: "movie", label: "Movies", icon: Film },
  { value: "tv", label: "TV Shows", icon: Tv },
];

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setResults([]);
      setStatus("idle");
      setFilter("all");
    }
  }, [open]);

  // Debounced search fetch
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
    }, 280);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

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
    <Modal open={open} onClose={onClose} label="Search" size="xl">
      <div className="flex flex-col px-5 pb-7 pt-6 sm:px-7">
        <h2 className="text-headline-md text-white">Search</h2>

        {/* Search bar input */}
        <div className="glass mt-4 flex items-center gap-3 rounded-full border border-white/15 px-5 py-3 transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_18px_rgba(255,255,255,0.12)]">
          <SearchIcon className="size-5 shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search films, series, and cast…"
            aria-label="Search the catalog"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent text-body-lg text-white placeholder:text-muted outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 !outline-none"
            style={{ outline: "none", boxShadow: "none" }}
          />
          {status === "loading" && <Loader2 className="size-5 shrink-0 animate-spin text-primary" />}
          {query && status !== "loading" && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {results.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-label-sm font-medium transition-colors duration-200",
                  filter === f.value
                    ? "border-transparent bg-primary text-on-primary font-semibold"
                    : "border-white/12 bg-white/5 text-white/60 hover:text-white",
                )}
              >
                {f.label}
                <span className="ml-1.5 opacity-60">({counts[f.value]})</span>
              </button>
            ))}
          </div>
        )}

        {/* Results grid container */}
        <div className="mt-6 max-h-[60vh] overflow-y-auto overscroll-contain pr-1 rail">
          {query.trim().length < 2 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-white/5 text-white/40">
                <SearchIcon className="size-6" />
              </div>
              <p className="text-body-md text-white/70">
                Type at least two characters to search films and series.
              </p>
            </div>
          ) : status === "loading" && results.length === 0 ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto size-7 animate-spin text-primary" />
              <p className="mt-3 text-body-md text-muted">Searching catalog…</p>
            </div>
          ) : filtered.length === 0 && status === "done" ? (
            <div className="py-14 text-center">
              <p className="text-headline-sm text-white">No results found for “{query}”</p>
              <p className="mt-2 text-body-md text-muted">
                Try checking for typos or searching by another title or creator.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((media) => (
                <li key={`${media.mediaType}-${media.id}`}>
                  <MediaCard media={media} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
