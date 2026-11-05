export default function PageLoader() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-surface-700 border-t-brand-500 animate-spin" />
        <p className="text-zinc-500 text-sm font-medium">Loading StreamVibe...</p>
      </div>
    </div>
  );
}
