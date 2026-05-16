'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPost } from '@/lib/api';

function formatDifficulty(value) {
  if (!value) return 'Mixed';
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

export function ExamStartCard({ exam, showRecommendedBadge = false }) {
  const router = useRouter();
  const examId = String(exam._id ?? exam.id ?? '');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const handleStart = async () => {
    if (!examId) return;
    setStarting(true);
    setStartError('');
    try {
      const { data } = await apiPost(`/api/exams/${examId}/start`);
      if (!data?.success || !data?.data?.sessionId) {
        setStartError('Could not start exam.');
        return;
      }
      router.push(`/exams/session/${data.data.sessionId}`);
    } catch (err) {
      setStartError(
        err?.response?.data?.message || err?.message || 'Could not start exam.'
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <article className="flex h-full flex-col rounded-[12px] border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      {showRecommendedBadge ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B]">
          Recommended
        </p>
      ) : null}
      <h2 className={`text-base font-bold leading-snug text-[#111111] ${showRecommendedBadge ? 'mt-1' : ''}`}>
        {exam.title}
      </h2>
      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-[#6B6B6B]">
        {exam.description?.trim() || 'No description.'}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B]">
        <span className="rounded-full border border-[#E5E5E5] bg-[#F9F9F9] px-2.5 py-1 font-semibold capitalize text-[#111111]">
          {formatDifficulty(exam.difficulty)}
        </span>
        <span>{Number(exam.durationMinutes) || 0} min</span>
        <span aria-hidden>·</span>
        <span>{Number(exam.totalQuestions) || 0} questions</span>
      </div>
      {startError ? (
        <p className="mt-3 text-xs text-red-700">{startError}</p>
      ) : null}
      <button
        type="button"
        onClick={handleStart}
        disabled={starting || !examId}
        className="mt-6 w-full rounded-full bg-[#111111] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {starting ? 'Starting…' : 'Start Exam'}
      </button>
    </article>
  );
}
