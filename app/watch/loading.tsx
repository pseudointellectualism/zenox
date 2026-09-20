export default function WatchLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  );
}
