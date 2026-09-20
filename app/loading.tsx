export default function Loading() {
  return (
    <div className="mx-auto max-w-page px-4 pb-16 pt-28 sm:px-6 lg:pt-32">
      <div className="h-9 w-56 animate-pulse rounded-full bg-white/[0.06]" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-2/3 animate-pulse rounded-xl border border-outline bg-[rgba(29,23,40,0.5)]"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
