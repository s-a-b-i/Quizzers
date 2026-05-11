'use client';

/**
 * Full-screen overlay: initial auth, route transitions, logout.
 * z-index above app chrome (e.g. header z-50).
 */
export function PageLoader() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <p
        className="text-center text-[14px] font-bold uppercase tracking-[3px] text-[#111111]"
        style={{ letterSpacing: '3px' }}
      >
        QUIZZERA
      </p>
      <span className="mt-4 inline-flex items-center justify-center gap-2" aria-hidden>
        <span className="page-loader-dot h-[6px] w-[6px] rounded-full bg-[#111111]" />
        <span className="page-loader-dot page-loader-dot-delay-1 h-[6px] w-[6px] rounded-full bg-[#111111]" />
        <span className="page-loader-dot page-loader-dot-delay-2 h-[6px] w-[6px] rounded-full bg-[#111111]" />
      </span>
    </div>
  );
}
