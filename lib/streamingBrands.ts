export interface StreamingBrand {
  id: string;
  name: string;
  bannerUrl: string;
  invertOnDark?: boolean;
}

export const STREAMING_BRANDS: Record<string, StreamingBrand> = {
  netflix: {
    id: "netflix",
    name: "Netflix",
    bannerUrl: "/brands/netflix.png",
  },
  prime: {
    id: "prime",
    name: "Prime Video",
    bannerUrl: "/brands/prime-video.png",
  },
  disney: {
    id: "disney",
    name: "Disney+",
    bannerUrl: "/brands/disney.png",
  },
  hulu: {
    id: "hulu",
    name: "Hulu",
    bannerUrl: "/brands/hulu.png",
  },
  hbo: {
    id: "hbo",
    name: "HBO Max",
    bannerUrl: "/brands/hbo.png",
  },
  apple: {
    id: "apple",
    name: "Apple TV+",
    bannerUrl: "/brands/apple-tv.png",
    invertOnDark: true,
  },
  paramount: {
    id: "paramount",
    name: "Paramount+",
    bannerUrl: "/brands/paramount.png",
    invertOnDark: true,
  },
};

/**
 * Matches a provider or network name against our supported top streaming brands.
 */
export function matchStreamingBrand(name: string): StreamingBrand | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.includes("netflix")) return STREAMING_BRANDS.netflix;
  if (lower.includes("prime") || lower.includes("amazon")) return STREAMING_BRANDS.prime;
  if (lower.includes("disney")) return STREAMING_BRANDS.disney;
  if (lower.includes("hulu")) return STREAMING_BRANDS.hulu;
  if (lower.includes("hbo") || lower.includes("max")) return STREAMING_BRANDS.hbo;
  if (lower.includes("apple")) return STREAMING_BRANDS.apple;
  if (lower.includes("paramount")) return STREAMING_BRANDS.paramount;
  return null;
}

/**
 * Resolves the primary streaming brand from TMDB networks, flatrate providers, and production companies.
 */
export function resolvePrimaryStreamingBrand(sources: {
  networks?: { name: string }[];
  flatrateProviders?: { provider_name: string }[];
  productionCompanies?: { name: string }[];
}): StreamingBrand | null {
  // 1. Check TV networks (most accurate for series)
  if (sources.networks) {
    for (const net of sources.networks) {
      const match = matchStreamingBrand(net.name);
      if (match) return match;
    }
  }

  // 2. Check flatrate streaming providers (most accurate for movies & catalog)
  if (sources.flatrateProviders) {
    for (const p of sources.flatrateProviders) {
      const match = matchStreamingBrand(p.provider_name);
      if (match) return match;
    }
  }

  // 3. Fallback to production companies (e.g. Netflix Studios, Amazon Studios, Marvel/Disney, Paramount)
  if (sources.productionCompanies) {
    for (const comp of sources.productionCompanies) {
      const match = matchStreamingBrand(comp.name);
      if (match) return match;
    }
  }

  return null;
}
