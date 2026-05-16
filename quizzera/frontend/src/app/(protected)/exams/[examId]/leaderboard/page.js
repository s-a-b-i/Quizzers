'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import {
  ExamLeaderboardRowsSkeleton,
  ExamPageError,
} from '@/components/exam/ExamPageStates';
import { Skeleton } from '@/components/ui/Skeleton';

function formatScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n}%`;
}

export default function ExamLeaderboardPage() {
  const params = useParams();
  const examId = String(params?.examId ?? '').trim();

  const [examTitle, setExamTitle] = useState('Exam');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    if (!examId) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const { data: examRes } = await apiGet(`/api/exams/by-id/${examId}`);
      const title = examRes?.data?.exam?.title;
      if (title) setExamTitle(String(title));

      try {
        const { data } = await apiGet(`/api/exams/${examId}/leaderboard`);
        if (data?.success && Array.isArray(data?.data?.entries)) {
          setEntries(data.data.entries);
        } else if (data?.success && Array.isArray(data?.data?.leaderboard)) {
          setEntries(data.data.leaderboard);
        } else {
          setEntries([]);
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404 || status === 501) {
          setEntries([]);
        } else {
          throw err;
        }
      }
    } catch {
      setEntries([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Skeleton height="12px" width="100px" borderRadius="4px" />
        <Skeleton className="mt-3" height="28px" width="70%" borderRadius="6px" />
        <Skeleton className="mt-2" height="14px" width="50%" borderRadius="4px" />
        <div className="mt-8">
          <ExamLeaderboardRowsSkeleton rows={10} />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <ExamPageError onRetry={loadLeaderboard} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={examId ? `/exams/${examId}` : '/exams'}
        className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B6B6B] hover:text-[#111111]"
      >
        ← Back to exam
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[#111111]">Leaderboard</h1>
      <p className="mt-1 text-sm text-[#6B6B6B]">{examTitle}</p>

      {entries.length === 0 ? (
        <div
          className="mt-8 flex min-h-[200px] flex-col items-center justify-center rounded-[12px] border border-[#E5E5E5] bg-white px-6 py-12 text-center"
          role="status"
        >
          <p className="text-[15px] font-medium text-[#111111]">No rankings yet.</p>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Be the first to complete this exam and appear on the board.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-[12px] border border-[#E5E5E5] bg-white">
          <div className="grid grid-cols-[48px_1fr_80px] gap-3 border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
            <span>Rank</span>
            <span>Name</span>
            <span className="text-right">Score</span>
          </div>
          <ol>
            {entries.map((row, index) => (
              <li
                key={String(row.userId ?? row._id ?? index)}
                className="grid grid-cols-[48px_1fr_80px] items-center gap-3 border-b border-[#E5E5E5] px-4 py-3.5 text-sm last:border-b-0"
              >
                <span className="font-semibold tabular-nums text-[#111111]">
                  {row.rank ?? index + 1}
                </span>
                <span className="min-w-0 truncate font-medium text-[#111111]">
                  {row.displayName ?? row.name ?? row.email ?? 'Student'}
                </span>
                <span className="text-right font-semibold tabular-nums text-[#111111]">
                  {formatScore(row.score)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
