'use client';

export function AuthDivider() {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-border/80" />
      </div>
      <div className="relative flex justify-center">
        <span className="rounded-full border border-border bg-background px-4 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-secondary">
          or
        </span>
      </div>
    </div>
  );
}
