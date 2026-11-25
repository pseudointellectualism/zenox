import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getDetails } from "@/lib/tmdb";
import { parseMediaSlug } from "@/lib/mediaRoute";
import { mintStreamToken, extractClientIp } from "@/lib/server/streamSecurity";
import { getSystemConfig } from "@/lib/server/systemConfigStore";
import MediaWatchClient from "./MediaWatchClient";

interface MediaPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: MediaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseMediaSlug(slug);
  if (!parsed) return { title: "Watch" };

  try {
    const details = await getDetails(parsed.mediaType, parsed.id.toString());
    const title = details?.title || "Watch";
    const epSuffix =
      parsed.mediaType === "tv" && parsed.season
        ? ` (S${parsed.season}:E${parsed.episode || 1})`
        : "";
    return {
      title: `${title}${epSuffix}`,
      description: details?.overview || `Watch ${title} on Zenox.`,
    };
  } catch {
    return { title: "Watch" };
  }
}

export default async function MediaWatchPage({ params }: MediaPageProps) {
  const { slug } = await params;
  const parsed = parseMediaSlug(slug);

  if (!parsed) {
    notFound();
  }

  const details = await getDetails(parsed.mediaType, parsed.id.toString());

  if (!details) {
    notFound();
  }

  const config = getSystemConfig();
  if (config.streamingDisabled) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4 text-center">
        <div className="max-w-md rounded-3xl border border-white/15 bg-black/80 p-8 shadow-2xl backdrop-blur-2xl">
          <span className="zenox-wordmark text-3xl font-black text-white">zenox.</span>
          <div className="mt-4 flex items-center justify-center">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              Streaming Temporarily Paused
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Video playback has been temporarily paused by site administrators for scheduled server maintenance. Please check back shortly.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex rounded-full bg-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all"
          >
            Return to Home
          </a>
        </div>
      </main>
    );
  }

  // Mint initial stream token server-side to eliminate client round-trip delay and prevent double loading
  const headerList = await headers();
  const clientIp = extractClientIp(headerList);

  const token = mintStreamToken(
    {
      mediaId: parsed.id,
      mediaType: parsed.mediaType,
      season: parsed.season || 1,
      episode: parsed.episode || 1,
      serverIndex: 0,
      title: details.title,
      year: details.releaseYear || (details.releaseDate ? details.releaseDate.slice(0, 4) : undefined),
      imdbId: details.imdbId || undefined,
    },
    clientIp,
    180,
  );

  const initialStreamUrl = `/api/v1/stream/${token}`;

  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-black">
      <MediaWatchClient
        key={`${parsed.mediaType}-${parsed.id}-${parsed.season || 1}-${parsed.episode || 1}`}
        details={details}
        mediaType={parsed.mediaType}
        initialSeason={parsed.season || 1}
        initialEpisode={parsed.episode || 1}
        initialStreamUrl={initialStreamUrl}
      />
    </main>
  );
}
