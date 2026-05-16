'use client';

import { McqResultsError } from '@/components/mcq/McqPageStates';
import { Skeleton } from '@/components/ui/Skeleton';

/** Shared error UI for all exam flows: "Something went wrong." + Retry */
export function ExamPageError(props) {
  return <McqResultsError {...props} />;
}

export function ExamBrowseCardSkeleton() {
  return (
    <article className="flex flex-col rounded-[12px] border border-[#E5E5E5] bg-white p-5">
      <Skeleton height="20px" width="75%" borderRadius="4px" />
      <div className="mt-3 space-y-2">
        <Skeleton height="14px" width="100%" borderRadius="4px" />
        <Skeleton height="14px" width="90%" borderRadius="4px" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton height="24px" width="64px" borderRadius="999px" />
        <Skeleton height="14px" width="80px" borderRadius="4px" />
      </div>
      <Skeleton className="mt-6" height="40px" width="100%" borderRadius="999px" />
    </article>
  );
}

export function ExamBrowseCardsSkeleton({ count = 6 }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ExamBrowseCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function ExamDynamicTaxonomySkeleton() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <Skeleton height="32px" width="32px" borderRadius="999px" />
            <Skeleton height="10px" width="40px" borderRadius="4px" className="hidden sm:block" />
          </div>
        ))}
      </div>
      <div className="rounded-[12px] border border-[#E5E5E5] bg-white p-5 sm:p-6">
        <Skeleton height="14px" width="40%" borderRadius="4px" />
        <Skeleton className="mt-2" height="12px" width="24%" borderRadius="4px" />
        <Skeleton className="mt-4" height="42px" width="100%" borderRadius="6px" />
        <Skeleton className="mt-4" height="42px" width="100%" borderRadius="6px" />
        <Skeleton className="mt-4" height="42px" width="72%" borderRadius="6px" />
        <Skeleton className="mt-8" height="40px" width="100%" borderRadius="999px" />
      </div>
    </>
  );
}

export function ExamHistoryTableSkeleton({ rows = 5 }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#E5E5E5] bg-white">
      <div className="hidden border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 sm:grid sm:grid-cols-[1fr_100px_72px_100px_100px_80px] sm:gap-3">
        {['Exam', 'Date', 'Score', 'Status', 'Duration', ''].map((h) => (
          <Skeleton key={h} height="12px" width="60%" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="border-b border-[#E5E5E5] px-4 py-4 last:border-b-0 sm:grid sm:grid-cols-[1fr_100px_72px_100px_100px_80px] sm:items-center sm:gap-3"
        >
          <Skeleton height="14px" width="85%" />
          <Skeleton height="14px" width="70%" />
          <Skeleton height="14px" width="40%" />
          <Skeleton height="24px" width="64px" borderRadius="999px" />
          <Skeleton height="14px" width="50%" />
          <Skeleton height="32px" width="56px" borderRadius="999px" />
        </div>
      ))}
    </div>
  );
}

export function ExamWeakAreaPillsSkeleton({ count = 6 }) {
  return (
    <div className="mt-8 flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height="36px" width={`${88 + (i % 3) * 24}px`} borderRadius="999px" />
      ))}
    </div>
  );
}

export function ExamLeaderboardRowsSkeleton({ rows = 10 }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#E5E5E5] bg-white">
      <div className="grid grid-cols-[48px_1fr_80px] gap-3 border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
        <Skeleton height="12px" width="24px" />
        <Skeleton height="12px" width="40%" />
        <Skeleton height="12px" width="48px" className="justify-self-end" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[48px_1fr_80px] items-center gap-3 border-b border-[#E5E5E5] px-4 py-3.5 last:border-b-0"
        >
          <Skeleton height="14px" width="20px" />
          <Skeleton height="14px" width={`${55 + (i % 4) * 8}%`} />
          <Skeleton height="14px" width="40px" className="justify-self-end" />
        </div>
      ))}
    </div>
  );
}
