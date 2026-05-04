export function LoadingDots() {
  return (
    <span className="inline-flex items-center justify-center gap-1.5" aria-hidden>
      <span className="loading-dot inline-block h-1.5 w-1.5 rounded-full bg-inverse" />
      <span className="loading-dot loading-dot-delay-1 inline-block h-1.5 w-1.5 rounded-full bg-inverse" />
      <span className="loading-dot loading-dot-delay-2 inline-block h-1.5 w-1.5 rounded-full bg-inverse" />
    </span>
  );
}
