import Link from "next/link";
import { X } from "lucide-react";

import CatalogGrid from "@/components/CatalogGrid";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import { discover, getGenres, getProviderById, getWatchProviders } from "@/lib/tmdb";
import type { CatalogQuery, MediaType } from "@/lib/types";

export interface CatalogSearchParams {
  genre?: string;
  sort?: string;
  from?: string;
  page?: string;
  provider?: string;
}

interface CatalogViewProps {
  type: MediaType;
  title: string;
  subtitle: string;
  pathname: string;
  searchParams: CatalogSearchParams;
}

const SORTS = new Set<NonNullable<CatalogQuery["sort"]>>(["popularity", "rating", "newest"]);

export default async function CatalogView({
  type,
  title,
  subtitle,
  pathname,
  searchParams,
}: CatalogViewProps) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const genreId = Number(searchParams.genre) || undefined;
  const providerId = Number(searchParams.provider) || undefined;
  const yearFrom = Number(searchParams.from) || undefined;
  const sortParam = searchParams.sort as CatalogQuery["sort"];
  const sort = sortParam && SORTS.has(sortParam) ? sortParam : "popularity";

  const [genres, catalog, providers] = await Promise.all([
    getGenres(type),
    discover({ type, genreId, providerId, yearFrom, sort, page }),
    providerId ? getWatchProviders(type) : Promise.resolve([]),
  ]);

  const activeProvider =
    providers.find((p) => p.id === providerId) ?? (providerId ? getProviderById(providerId) : undefined);

  const baseQuery = new URLSearchParams(
    Object.entries(searchParams).filter(
      (entry): entry is [string, string] => entry[0] !== "page" && Boolean(entry[1]),
    ),
  ).toString();

  const withoutProvider = new URLSearchParams(baseQuery);
  withoutProvider.delete("provider");

  return (
    <div className="mx-auto max-w-page px-4 pb-16 pt-28 sm:px-6 lg:pt-32">
      <header className="mb-8">
        <h1 className="text-headline-lg text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-body-md text-muted">{subtitle}</p>
      </header>

      {activeProvider && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-label-sm uppercase tracking-[0.14em] text-secondary">
            Provider
          </span>
          <Link
            href={
              withoutProvider.toString() ? `${pathname}?${withoutProvider}` : pathname
            }
            className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-label-sm text-on-primary transition-colors hover:bg-primary-hover"
          >
            {activeProvider.name}
            <X className="size-3.5" />
          </Link>
        </div>
      )}

      <FilterBar genres={genres} />

      <p className="mb-5 mt-6 text-label-sm uppercase tracking-[0.14em] text-secondary">
        {catalog.totalResults.toLocaleString()} titles · page {catalog.page} of {catalog.totalPages}
      </p>

      <CatalogGrid items={catalog.results} />

      <Pagination
        page={catalog.page}
        totalPages={catalog.totalPages}
        baseQuery={baseQuery}
        pathname={pathname}
      />
    </div>
  );
}
