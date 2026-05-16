'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import {
  ExamHistoryTableSkeleton,
  ExamPageError,
} from '@/components/exam/ExamPageStates';

const PAGE_SIZE = 20;
const TERMINAL_STATUSES = new Set(['submitted', 'evaluated']);
const DEFAULT_PASSING_SCORE = 50;

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDuration(startedAt, submittedAt) {
  if (!startedAt || !submittedAt) return '—';
  const ms = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function statusPill(session) {
  if (TERMINAL_STATUSES.has(session.status)) {
    const score = Number(session.score);
    const passed = !Number.isNaN(score) && score >= DEFAULT_PASSING_SCORE;
    return {
      label: passed ? 'Passed' : 'Failed',
      className: passed
        ? 'bg-[#111111] text-white'
        : 'border-2 border-[#111111] bg-white text-[#111111]',
    };
  }
  return {
    label: 'In progress',
    className: 'border border-[#E5E5E5] bg-[#F9F9F9] text-[#6B6B6B]',
  };
}

export default function ResultsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiGet('/api/exams/my/history', {
        params: { page: 1, limit: PAGE_SIZE },
      });
      if (!data?.success || !Array.isArray(data?.data?.sessions)) {
        setSessions([]);
        setError('Invalid response from server.');
        return;
      }
      setSessions(data.data.sessions);
    } catch (err) {
      setSessions([]);
      setError(err?.response?.data?.message || err?.message || 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#111111]">My Results</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">Your exam attempts and scores.</p>
      </header>

      {loading ? (
        <ExamHistoryTableSkeleton rows={5} />
      ) : error ? (
        <ExamPageError onRetry={loadHistory} />
      ) : sessions.length === 0 ? (
        <div
          className="flex min-h-[280px] flex-col items-center justify-center rounded-[12px] border border-[#E5E5E5] bg-white px-6 py-16 text-center"
          role="status"
        >
          <p className="text-[15px] font-medium text-[#111111]">No exams taken yet.</p>
          <Link
            href="/exams"
            className="mt-4 text-sm font-semibold text-[#111111] underline underline-offset-4 hover:no-underline"
          >
            Start your first exam →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-[#E5E5E5] bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
                <th className="px-4 py-3 font-semibold">Exam title</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((row) => {
                const pill = statusPill(row);
                const canView = TERMINAL_STATUSES.has(row.status);
                const dateSource = row.submittedAt ?? row.startedAt ?? row.createdAt;
                const scoreDisplay =
                  row.score !== undefined && row.score !== null ? `${row.score}%` : '—';

                return (
                  <tr key={row.sessionId} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-4 py-3.5 font-medium text-[#111111]">
                      {row.examTitle?.trim() || 'Untitled exam'}
                    </td>
                    <td className="px-4 py-3.5 text-[#6B6B6B]">{formatDate(dateSource)}</td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums text-[#111111]">
                      {scoreDisplay}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${pill.className}`}
                      >
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#6B6B6B]">
                      {formatDuration(row.startedAt, row.submittedAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      {canView ? (
                        <Link
                          href={`/exams/results/${row.sessionId}`}
                          className="inline-flex rounded-full border-2 border-[#111111] px-3 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                        >
                          View
                        </Link>
                      ) : (
                        <Link
                          href={`/exams/session/${row.sessionId}`}
                          className="inline-flex rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-[#6B6B6B] hover:bg-[#F9F9F9]"
                        >
                          Resume
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
