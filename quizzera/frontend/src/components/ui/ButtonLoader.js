'use client';

/**
 * Inline three-dot pulse for buttons. Default: white dots on dark (primary) buttons.
 * Use variant="dark" on light / outline buttons.
 */
export function ButtonLoader({ variant = 'light' }) {
  const dot =
    variant === 'dark'
      ? 'button-loader-dot-dark h-[6px] w-[6px] rounded-full bg-[#111111]'
      : 'button-loader-dot-light h-[6px] w-[6px] rounded-full bg-white';

  return (
    <span className="inline-flex items-center justify-center gap-2" aria-hidden>
      <span className={dot} />
      <span className={`${dot} button-loader-dot-delay-1`} />
      <span className={`${dot} button-loader-dot-delay-2`} />
    </span>
  );
}
