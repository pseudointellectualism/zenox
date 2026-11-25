import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Current query string without `page`, e.g. `genre=18&sort=rating`. */
  baseQuery: string;
  pathname: string;
}

export default function Pagination({ page, totalPages, baseQuery, pathname }: PaginationProps) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams(baseQuery);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const window = 2;
  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= window) pages.push(p);
    else if (pages.at(-1) !== "gap") pages.push("gap");
  }

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <PageLink href={href(page - 1)} disabled={page <= 1} label="Previous page">
        <ChevronLeft className="size-4" />
      </PageLink>

      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1.5 text-label-sm text-muted">
            …
          </span>
        ) : (
          <PageLink key={p} href={href(p)} active={p === page} label={`Page ${p}`}>
            {p}
          </PageLink>
        ),
      )}

      <PageLink href={href(page + 1)} disabled={page >= totalPages} label="Next page">
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  label,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const className = cn(
    "grid h-9 min-w-9 place-items-center rounded-full border px-3 text-label-sm transition-colors duration-200",
    active
      ? "border-transparent bg-primary text-on-primary"
      : "border-outline bg-white/5 text-muted hover:border-outline-strong hover:text-white",
  );

  if (disabled) {
    return (
      <span aria-disabled className={cn(className, "pointer-events-none opacity-30")}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}
