'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/api';
import { ExamPageError } from '@/components/exam/ExamPageStates';
import { displaySerif } from '@/lib/fonts';
import { Skeleton } from '@/components/ui/Skeleton';

const TERMINAL_STATUSES = new Set(['submitted', 'evaluated']);

const QUICK_START = [
  {
    href: '/exams',
    title: 'Take a Mock Exam',
    description: 'Full mock tests and timed practice exams prepared for you.',
  },
  {
    href: '/exams/weak-area',
    title: 'Weak Area Drill',
    description: 'A drill auto-built from your recent weak topics.',
  },
  {
    href: '/results',
    title: 'My Results',
    description: 'Review scores and past attempts.',
  },
];

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function RecentResultsSkeleton() {
  return (
    <ul className="mt-4 divide-y divide-[#E5E5E5] rounded-[12px] border border-[#E5E5E5] bg-white">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton height="14px" width="70%" borderRadius="4px" />
            <Skeleton height="12px" width="45%" borderRadius="4px" />
          </div>
          <Skeleton height="28px" width="48px" borderRadius="999px" />
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { user, mongoUser, role } = useAuth();

  const [recentSessions, setRecentSessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const salute = greetingLabel();
  const displayEmail = mongoUser?.email ?? user?.email ?? '';
  const displayRole = mongoUser?.role ?? role;
  const accountStatus = mongoUser?.accountStatus ?? 'active';

  const showSuspendedBadge = accountStatus === 'suspended';
  const showInactiveBadge = accountStatus === 'inactive';

  const loadRecentResults = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const { data } = await apiGet('/api/exams/my/history', {
        params: { page: 1, limit: 3 },
      });
      if (!data?.success || !Array.isArray(data?.data?.sessions)) {
        setRecentSessions([]);
        setHistoryError(true);
        return;
      }
      setRecentSessions(data.data.sessions);
    } catch {
      setRecentSessions([]);
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentResults();
  }, [loadRecentResults]);

  return (
    <div className="min-h-screen bg-background text-primary">
      <main className="mx-auto flex max-w-2xl flex-col px-6 py-12">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <h1
            className={`${displaySerif.className} break-words text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl sm:font-bold`}
          >
            {salute}, {displayEmail}
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <span className="inline-flex rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-inverse">
              {displayRole ? String(displayRole).toUpperCase() : '—'}
            </span>
            {showSuspendedBadge ? (
              <span className="inline-flex rounded-full border-2 border-primary bg-background px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                SUSPENDED
              </span>
            ) : null}
            {showInactiveBadge ? (
              <span className="inline-flex rounded-full border-2 border-primary bg-background px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                INACTIVE
              </span>
            ) : null}
          </div>
        </div>

        <section className="mt-14">
          <h2 className="text-[14px] font-bold uppercase tracking-[0.2em] text-primary">
            Quick Start
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {QUICK_START.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-[12px] border-2 border-primary bg-background p-4 transition-colors hover:bg-surface sm:p-5"
                >
                  <span className="text-sm font-bold text-primary">{item.title}</span>
                  <p className="mt-1 text-sm leading-relaxed text-secondary">{item.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[14px] font-bold uppercase tracking-[0.2em] text-primary">
              Recent Results
            </h2>
            <Link
              href="/results"
              className="text-xs font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              View all
            </Link>
          </div>

          {historyLoading ? (
            <RecentResultsSkeleton />
          ) : historyError ? (
            <div className="mt-4">
              <ExamPageError onRetry={loadRecentResults} />
            </div>
          ) : recentSessions.length === 0 ? (
            <p
              className="mt-4 rounded-[12px] border border-[#E5E5E5] bg-white px-4 py-8 text-center text-sm text-[#6B6B6B]"
              role="status"
            >
              No exams taken yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#E5E5E5] overflow-hidden rounded-[12px] border border-[#E5E5E5] bg-white">
              {recentSessions.map((row) => {
                const canView = TERMINAL_STATUSES.has(row.status);
                const dateSource = row.submittedAt ?? row.startedAt ?? row.createdAt;
                const scoreDisplay =
                  row.score !== undefined && row.score !== null ? `${row.score}%` : '—';
                const viewHref = canView
                  ? `/exams/results/${row.sessionId}`
                  : `/exams/session/${row.sessionId}`;
                const viewLabel = canView ? 'View' : 'Resume';

                return (
                  <li
                    key={row.sessionId}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#111111]">
                        {row.examTitle?.trim() || 'Untitled exam'}
                      </p>
                      <p className="mt-0.5 text-xs text-[#6B6B6B]">
                        <span className="font-semibold tabular-nums text-[#111111]">
                          {scoreDisplay}
                        </span>
                        <span aria-hidden className="mx-1.5">
                          ·
                        </span>
                        {formatDate(dateSource)}
                      </p>
                    </div>
                    <Link
                      href={viewHref}
                      className="shrink-0 text-xs font-semibold text-[#111111] underline underline-offset-4 hover:no-underline"
                    >
                      {viewLabel}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-14">
          <h2 className="text-[14px] font-bold uppercase tracking-[0.2em] text-primary">
            Quick links
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/mcqs"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
            >
              Practice MCQs
            </Link>
            <Link
              href="/resources"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
            >
              View Resources
            </Link>
            <Link
              href="/bookmarks"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
            >
              Bookmarks
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
