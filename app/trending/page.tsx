import type { Metadata } from "next";

import MediaRow from "@/components/MediaRow";
import CatalogGrid from "@/components/CatalogGrid";
import { getTrending } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Trending" };
export const revalidate = 1800;

export default async function TrendingPage() {
  const [moviesToday, seriesToday, moviesWeek] = await Promise.all([
    getTrending("movie", "day"),
    getTrending("tv", "day"),
    getTrending("movie", "week"),
  ]);

  return (
    <div className="pb-16 pt-28 lg:pt-32">
      <header className="mx-auto mb-4 max-w-page px-4 sm:px-6">
        <h1 className="text-headline-lg text-white">Trending</h1>
        <p className="mt-2 max-w-2xl text-body-md text-muted">
          What the catalog is moving toward right now, refreshed on a rolling window.
        </p>
      </header>

      <MediaRow title="Trending today" items={moviesToday} priority />
      <MediaRow title="Series trending today" items={seriesToday} />

      <section className="mx-auto mt-8 max-w-page px-4 sm:px-6">
        <h2 className="mb-5 text-headline-md text-white">This week in film</h2>
        <CatalogGrid items={moviesWeek} />
      </section>
    </div>
  );
}
