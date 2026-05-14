'use client';

/**
 * Shared empty / error results for MCQ browse, bookmarks, detail, and admin list.
 */

export function McqResultsEmpty({ onClearFilters }) {
  return (
    <div
      className="flex min-h-[260px] flex-col items-center justify-center px-4 py-16 text-center"
      role="status"
    >
      <p className="text-[14px] leading-snug text-[#6B6B6B]">No questions found.</p>
      <p className="mt-1 text-[12px] leading-snug text-[#AAAAAA]">Try adjusting your filters.</p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-4 text-[12px] font-semibold text-[#111111] underline underline-offset-4 hover:no-underline"
      >
        Clear filters
      </button>
    </div>
  );
}

export function McqResultsError({ onRetry }) {
  return (
    <div
      className="flex min-h-[260px] flex-col items-center justify-center px-4 py-16 text-center"
      role="alert"
    >
      <p className="text-[14px] leading-snug text-[#111111]">Something went wrong.</p>
      <p className="mt-1 text-[12px] leading-snug text-[#6B6B6B]">Please try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-full border-2 border-[#111111] bg-white px-5 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#111111] transition-colors hover:bg-[#F9F9F9]"
      >
        Retry
      </button>
    </div>
  );
}
