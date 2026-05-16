'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import {
  ExamPageError,
  ExamWeakAreaPillsSkeleton,
} from '@/components/exam/ExamPageStates';
import { Skeleton } from '@/components/ui/Skeleton';

const TERMINAL_STATUSES = new Set(['submitted', 'evaluated']);

async function resolveTopicNames(topicIds) {
  const ids = [...new Set((topicIds ?? []).map((id) => String(id)).filter(Boolean))];
  if (ids.length === 0) return [];

  const idSet = new Set(ids);
  try {
    const { data } = await apiGet('/api/taxonomy/topics');
    if (!data?.success || !Array.isArray(data?.data?.topics)) {
      return ids.map((id) => ({ id, name: `Topic ${id.slice(-6)}` }));
    }
    const nameById = new Map();
    for (const topic of data.data.topics) {
      const id = String(topic._id);
      if (idSet.has(id)) nameById.set(id, topic.name);
    }
    return ids.map((id) => ({
      id,
      name: nameById.get(id) ?? `Topic ${id.slice(-6)}`,
    }));
  } catch {
    return ids.map((id) => ({ id, name: `Topic ${id.slice(-6)}` }));
  }
}

function findWeakAreasFromHistory(sessions) {
  if (!Array.isArray(sessions)) return [];
  for (const row of sessions) {
    if (!TERMINAL_STATUSES.has(row.status)) continue;
    const areas = row.weakAreas;
    if (Array.isArray(areas) && areas.length > 0) {
      return areas.map((id) => String(id));
    }
  }
  return [];
}

export default function WeakAreaDrillPage() {
  const router = useRouter();

  const [weakTopics, setWeakTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const hasWeakAreas = weakTopics.length > 0;

  const loadWeakAreas = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await apiGet('/api/exams/my/history', {
        params: { page: 1, limit: 20 },
      });
      if (!data?.success || !Array.isArray(data?.data?.sessions)) {
        setWeakTopics([]);
        setError(true);
        return;
      }
      const topicIds = findWeakAreasFromHistory(data.data.sessions);
      const topics = await resolveTopicNames(topicIds);
      setWeakTopics(topics);
    } catch {
      setWeakTopics([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeakAreas();
  }, [loadWeakAreas]);

  const handleStart = async () => {
    if (!hasWeakAreas) return;
    setStarting(true);
    setStartError('');
    try {
      const { data } = await apiPost('/api/exams/weak-area/generate');
      const sessionId = data?.data?.sessionId;
      if (!data?.success || !sessionId) {
        setStartError('Could not start drill. Please try again.');
        return;
      }
      router.push(`/exams/session/${sessionId}`);
    } catch (err) {
      setStartError(
        err?.response?.data?.message || err?.message || 'Could not start drill.'
      );
    } finally {
      setStarting(false);
    }
  };

  const pillList = useMemo(
    () =>
      weakTopics.map((topic) => (
        <li key={topic.id}>
          <span className="inline-block rounded-full border-2 border-[#111111] bg-white px-3 py-1.5 text-sm font-semibold text-[#111111]">
            {topic.name}
          </span>
        </li>
      )),
    [weakTopics]
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Skeleton height="28px" width="55%" borderRadius="6px" />
        <Skeleton className="mt-4" height="48px" width="100%" borderRadius="6px" />
        <ExamWeakAreaPillsSkeleton count={6} />
        <Skeleton className="mt-10" height="48px" width="100%" borderRadius="999px" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <ExamPageError onRetry={loadWeakAreas} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Link
        href="/exams"
        className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B6B6B] hover:text-[#111111]"
      >
        ← Back to exams
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-[#111111]">Weak Area Drill</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">
        We detected weak areas in your recent exams. This drill targets them automatically.
      </p>

      {hasWeakAreas ? (
        <>
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Weak topics">
            {pillList}
          </ul>

          {startError ? (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {startError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="mt-10 w-full rounded-full bg-[#111111] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? 'Starting…' : 'Start Drill'}
          </button>
        </>
      ) : (
        <div
          className="mt-10 rounded-[12px] border border-[#E5E5E5] bg-white px-6 py-12 text-center"
          role="status"
        >
          <p className="text-[15px] font-medium text-[#111111]">
            Complete at least one exam to unlock this feature.
          </p>
          <Link
            href="/exams"
            className="mt-4 inline-block text-sm font-semibold text-[#111111] underline underline-offset-4 hover:no-underline"
          >
            Take an Exam →
          </Link>
        </div>
      )}
    </main>
  );
}
