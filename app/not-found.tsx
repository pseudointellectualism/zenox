import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-page place-items-center px-4 sm:px-6">
      <div className="glass max-w-md rounded-2xl px-8 py-12 text-center">
        <p className="text-label-sm uppercase tracking-[0.22em] text-primary">404</p>
        <h1 className="mt-3 text-headline-lg text-white">Title not found</h1>
        <p className="mt-3 text-body-md text-muted">
          That page is not in the catalog. It may have been removed, or the link may be malformed.
        </p>
        <Link
          href="/"
          className="mt-7 inline-block rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
