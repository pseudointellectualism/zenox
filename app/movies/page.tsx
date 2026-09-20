import type { Metadata } from "next";

import CatalogView, { type CatalogSearchParams } from "@/components/CatalogView";

export const metadata: Metadata = { title: "Movies" };

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  return (
    <CatalogView
      type="movie"
      title="Movies"
      subtitle="The full feature catalog, filterable by genre, era and rating."
      pathname="/movies"
      searchParams={params}
    />
  );
}
