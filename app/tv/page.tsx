import type { Metadata } from "next";

import CatalogView, { type CatalogSearchParams } from "@/components/CatalogView";

export const metadata: Metadata = { title: "TV Shows" };

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  return (
    <CatalogView
      type="tv"
      title="TV Shows"
      subtitle="Every series in the catalog, from returning flagships to single-season runs."
      pathname="/tv"
      searchParams={params}
    />
  );
}
