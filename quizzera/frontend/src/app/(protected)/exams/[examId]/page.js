'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { ExamPageError } from '@/components/exam/ExamPageStates';
import { Skeleton } from '@/components/ui/Skeleton';

function formatExamType(value) {
  if (!value) return 'Exam';
  return String(value)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildRules(exam) {
  const totalQuestions = Number(exam.totalQuestions) || 0;
  const durationMinutes = Number(exam.durationMinutes) || 0;
  const passingScore = Number(exam.passingScore) ?? 50;

  return [
    `This exam contains ${totalQuestions} question${totalQuestions === 1 ? '' : 's'}.`,
    `You have ${durationMinutes} minute${durationMinutes === 1 ? '' : 's'} to complete the exam.`,
    'You can move between questions and change answers before you submit.',
    'Your progress is saved automatically while the exam is in progress.',
    `A score of ${passingScore}% or higher is required to pass.`,
    'After submission, your answers cannot be changed.',
  ];
}

function InstructionsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Skeleton height="32px" width="70%" borderRadius="6px" />
      <div className="mt-4 space-y-2">
        <Skeleton height="14px" width="100%" borderRadius="4px" />
        <Skeleton height="14px" width="92%" borderRadius="4px" />
      </div>
      <Skeleton className="mt-8" height="120px" width="100%" borderRadius="12px" />
      <Skeleton className="mt-6" height="48px" width="100%" borderRadius="999px" />
    </div>
  );
}

export default function ExamInstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = String(params?.examId ?? '').trim();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const loadExam = useCallback(async () => {
    if (!examId) {
      setError('Invalid exam.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await apiGet(`/api/exams/by-id/${examId}`);
      if (!data?.success || !data?.data?.exam) {
        setExam(null);
        setError('Exam not found.');
        return;
      }
      setExam(data.data.exam);
    } catch (err) {
      setExam(null);
      setError(err?.response?.data?.message || err?.message || 'Could not load exam.');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  const rules = useMemo(() => (exam ? buildRules(exam) : []), [exam]);

  const handleStart = async () => {
    if (!examId) return;
    setStarting(true);
    setStartError('');
    try {
      const { data } = await apiPost(`/api/exams/${examId}/start`);
      if (!data?.success || !data?.data?.sessionId) {
        setStartError('Could not start exam. Please try again.');
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

  if (loading) {
    return <InstructionsSkeleton />;
  }

  if (error || !exam) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <ExamPageError onRetry={loadExam} />
        <div className="mt-6 text-center">
          <Link
            href="/exams"
            className="text-sm font-semibold text-[#111111] underline underline-offset-4"
          >
            Back to exams
          </Link>
        </div>
      </main>
    );
  }

  const passingScore = Number(exam.passingScore) ?? 50;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
        {formatExamType(exam.examType)}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[#111111]">{exam.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">
        {exam.description?.trim() || 'No description provided.'}
      </p>

      <dl className="mt-8 grid grid-cols-3 gap-4 rounded-[12px] border border-[#E5E5E5] bg-white p-4 text-center">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
            Questions
          </dt>
          <dd className="mt-1 text-lg font-bold text-[#111111]">{exam.totalQuestions}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
            Duration
          </dt>
          <dd className="mt-1 text-lg font-bold text-[#111111]">
            {exam.durationMinutes} min
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
            Passing score
          </dt>
          <dd className="mt-1 text-lg font-bold text-[#111111]">{passingScore}%</dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-[#111111]">Rules</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#6B6B6B]">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <div
        className="mt-8 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="note"
      >
        <p className="font-semibold">Important</p>
        <p className="mt-1">
          Once started, the timer cannot be paused. Make sure you have enough uninterrupted
          time before you begin.
        </p>
      </div>

      {startError ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {startError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className="w-full rounded-full bg-[#111111] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
        >
          {starting ? 'Starting…' : 'Start Exam'}
        </button>
        <Link
          href="/exams"
          className="w-full rounded-full border-2 border-[#111111] bg-white py-3 text-center text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F9F9F9] sm:flex-1"
        >
          Back
        </Link>
      </div>
    </main>
  );
}
