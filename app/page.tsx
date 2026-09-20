import { redirect } from "next/navigation";
import ContinueWatchingRail from "@/components/ContinueWatchingRail";
import ForYouRail from "@/components/ForYouRail";
import HeroBillboard from "@/components/HeroBillboard";
import MediaRow from "@/components/MediaRow";
import ProviderRail from "@/components/ProviderRail";
import TopTenRail from "@/components/TopTenRail";
import { discover, getPopular, getTopRated, getTrending, getWatchProviders } from "@/lib/tmdb";

export const revalidate = 1800;

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Genre rails, sourced from TMDB's own genre ids. */
const GENRE_RAILS = [
  { id: 28, title: "Action Movies", type: "movie" as const },
  { id: 35, title: "Comedy Movies", type: "movie" as const },
  { id: 878, title: "Science Fiction", type: "movie" as const },
  { id: 27, title: "Horror", type: "movie" as const },
  { id: 10765, title: "Sci-Fi & Fantasy Series", type: "tv" as const },
  { id: 80, title: "Crime Series", type: "tv" as const },
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const query = searchParams ? await searchParams : {};
  const watchParam = typeof query.watch === "string" ? query.watch : null;
  if (watchParam) {
    redirect(`/media/${watchParam}`);
  }
  const [
    trendingMoviesRaw,
    trendingTvRaw,
    popularTvRaw,
    popularTvPage2,
    topRatedMoviesRaw,
    topRatedMoviesPage2,
    providers,
    ...genreRailsRaw
  ] = await Promise.all([
    getTrending("movie", "week"),
    getTrending("tv", "week"),
    getPopular("tv"),
    discover({ type: "tv", sort: "popularity", page: 2 }),
    getTopRated("movie"),
    discover({ type: "movie", sort: "rating", page: 2 }),
    getWatchProviders("movie"),
    ...GENRE_RAILS.flatMap((rail) => [
      discover({ type: rail.type, genreId: rail.id, sort: "popularity", page: 1 }),
      discover({ type: rail.type, genreId: rail.id, sort: "popularity", page: 2 }),
    ]),
  ]);

  // Global seen set for the homepage so a title only appears once
  const seen = new Set<string>();

  const dedupe = (items: typeof trendingMoviesRaw, minCount = 12) => {
    const unique = [];
    for (const item of items) {
      const key = `${item.mediaType}-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    return unique;
  };

  // 1. Hero items (first 5 trending movies)
  const heroItems = trendingMoviesRaw.slice(0, 5);
  heroItems.forEach((m) => seen.add(`${m.mediaType}-${m.id}`));

  // 2. Top 10 items (reserve top 10 movies and top 10 shows)
  const top10Movies = trendingMoviesRaw.slice(0, 10);
  top10Movies.forEach((m) => seen.add(`${m.mediaType}-${m.id}`));

  const top10Shows = trendingTvRaw.slice(0, 10);
  top10Shows.forEach((m) => seen.add(`${m.mediaType}-${m.id}`));

  // 3. Trending Movies & Trending Series (deduped from hero and top 10)
  const trendingMovies = dedupe(trendingMoviesRaw);
  const trendingTv = dedupe(trendingTvRaw);

  // 4. Genre rails (combine page 1 & page 2 to ensure rich, full rows without duplicates)
  const genreRails = GENRE_RAILS.map((_, i) => {
    const p1 = genreRailsRaw[i * 2]?.results || [];
    const p2 = genreRailsRaw[i * 2 + 1]?.results || [];
    return dedupe([...p1, ...p2]);
  });

  // 5. Popular Series & Top Rated (combined with page 2 to ensure deduplication doesn't shrink the rail)
  const popularTv = dedupe([...popularTvRaw, ...(popularTvPage2.results || [])]);
  const topRatedMovies = dedupe([...topRatedMoviesRaw, ...(topRatedMoviesPage2.results || [])]);

  return (
    <>
      <HeroBillboard items={heroItems} />

      {/* Pulled into the hero's fade so the two read as one surface. */}
      <div className="relative -mt-14 pb-10 lg:-mt-16">
        <ContinueWatchingRail />
        <ProviderRail providers={providers} />

        <TopTenRail movies={top10Movies} shows={top10Shows} />

        <ForYouRail />

        {trendingMovies.length > 0 && (
          <MediaRow title="Trending Movies" items={trendingMovies} href="/trending" priority />
        )}
        {trendingTv.length > 0 && (
          <MediaRow title="Trending Series" items={trendingTv} href="/trending" />
        )}

        {GENRE_RAILS.map((rail, i) =>
          genreRails[i]?.length > 0 ? (
            <MediaRow
              key={rail.id}
              title={rail.title}
              items={genreRails[i]}
              href={`/${rail.type === "movie" ? "movies" : "tv"}?genre=${rail.id}`}
              lazy
            />
          ) : null,
        )}

        {popularTv.length > 0 && (
          <MediaRow title="Popular Series" items={popularTv} href="/tv" lazy />
        )}
        {topRatedMovies.length > 0 && (
          <MediaRow title="Top Rated" items={topRatedMovies} href="/movies?sort=rating" lazy />
        )}
      </div>
    </>
  );
}
