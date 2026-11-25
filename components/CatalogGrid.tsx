import MediaCard from "@/components/MediaCard";
import type { MediaSummary } from "@/lib/types";

interface CatalogGridProps {
  items: MediaSummary[];
  emptyMessage?: string;
}

/** 4 columns on desktop, 2 on tablet, 2 on mobile — the catalog scaling rule. */
export default function CatalogGrid({ items, emptyMessage }: CatalogGridProps) {
  if (!items.length) {
    return (
      <div className="glass rounded-xl px-6 py-16 text-center">
        <p className="text-body-lg text-muted">
          {emptyMessage ?? "Nothing matched those filters."}
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((media, i) => (
        <li key={`${media.mediaType}-${media.id}`}>
          <MediaCard media={media} priority={i < 5} />
        </li>
      ))}
    </ul>
  );
}
