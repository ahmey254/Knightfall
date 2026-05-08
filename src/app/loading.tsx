export default function Loading() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span className="h-2 w-2 rounded-full bg-accent-cyan animate-pulse [animation-delay:120ms]" />
        <span className="h-2 w-2 rounded-full bg-accent-hot animate-pulse [animation-delay:240ms]" />
      </div>
    </div>
  );
}
