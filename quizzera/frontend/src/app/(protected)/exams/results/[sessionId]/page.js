'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { ExamPageError } from '@/components/exam/ExamPageStates';
import { Skeleton } from '@/components/ui/Skeleton';

function topicPercent(correct, total) {
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return Math.round((Number(correct) / t) * 100);
}

function optionTextForLabel(options, label) {
  const l = String(label ?? '').trim();
  if (!l || !Array.isArray(options)) return '';
  const opt = options.find((o) => String(o?.label ?? '').trim() === l);
  return opt?.text ? String(opt.text).trim() : '';
}

function ReviewAccordionItem({ item, index, expanded, onToggle }) {
  const yourLabel = item.selectedLabel?.trim() || '';
  const yourDisplay = yourLabel || 'No answer';
  const optionText = optionTextForLabel(item.options, yourLabel);
  const correctLabel = String(item.correctAnswer ?? '').trim();

  return (
    <div className="border border-[#111111] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-[#111111]">Question {index + 1}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-[#111111]">
          {item.isCorrect ? 'Correct' : 'Incorrect'}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-[#111111] px-4 py-4">
          <p className="text-sm font-semibold leading-relaxed text-[#111111]">{item.questionStem}</p>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
                Your answer
              </dt>
              <dd
                className={`mt-1 ${
                  item.isCorrect
                    ? 'font-semibold text-[#111111]'
                    : 'text-[#6B6B6B] line-through decoration-[#111111]'
                }`}
              >
                {yourDisplay}
                {optionText ? ` — ${optionText}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
                Correct answer
              </dt>
              <dd className="mt-1 font-semibold text-[#111111]">
                {correctLabel || '—'}
                {optionTextForLabel(item.options, correctLabel)
                  ? ` — ${optionTextForLabel(item.options, correctLabel)}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
                Explanation
              </dt>
              <dd className="mt-1 leading-relaxed text-[#111111]">
                {item.explanation?.trim() || '—'}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center">
        <Skeleton height="160px" width="160px" borderRadius="999px" />
        <Skeleton className="mt-3" height="16px" width="80px" />
      </div>
      <div className="mt-10 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height="72px" width="100%" borderRadius="8px" />
        ))}
      </div>
      <Skeleton className="mt-10" height="120px" width="100%" borderRadius="8px" />
    </main>
  );
}

export default function ExamResultsPage() {
  const params = useParams();
  const sessionId = String(params?.sessionId ?? '').trim();

  const [result, setResult] = useState(null);
  const [examTitle, setExamTitle] = useState('Exam');
  const [topicNameById, setTopicNameById] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedReview, setExpandedReview] = useState(() => new Set());
  const [shareCopied, setShareCopied] = useState(false);

  const loadTopicNames = useCallback(async (topicIds) => {
    const ids = new Set((topicIds ?? []).map((id) => String(id)));
    if (ids.size === 0) return new Map();
    try {
      const { data } = await apiGet('/api/taxonomy/topics');
      if (!data?.success || !Array.isArray(data?.data?.topics)) return new Map();
      const map = new Map();
      for (const topic of data.data.topics) {
        const id = String(topic._id);
        if (ids.has(id)) map.set(id, topic.name);
      }
      for (const id of ids) {
        if (!map.has(id)) map.set(id, `Topic ${id.slice(-6)}`);
      }
      return map;
    } catch {
      const map = new Map();
      for (const id of ids) map.set(id, `Topic ${id.slice(-6)}`);
      return map;
    }
  }, []);

  const loadResult = useCallback(async () => {
    if (!sessionId) {
      setError('Invalid session.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await apiGet(`/api/exams/sessions/${sessionId}/result`);
      if (!data?.success || !data?.data) {
        setError('Results not available yet.');
        return;
      }
      const payload = data.data;
      setResult(payload);

      const examId = String(payload.examId ?? '').trim();
      if (examId) {
        try {
          const { data: examRes } = await apiGet(`/api/exams/by-id/${examId}`);
          const title = examRes?.data?.exam?.title;
          if (title) setExamTitle(String(title));
          else setExamTitle('Exam');
        } catch {
          setExamTitle('Exam');
        }
      } else {
        setExamTitle('Exam');
      }

      const topicIds = new Set();
      for (const row of payload.topicWisePerformance ?? []) {
        if (row?.topicId) topicIds.add(String(row.topicId));
      }
      for (const id of payload.weakAreas ?? []) {
        if (id) topicIds.add(String(id));
      }
      const names = await loadTopicNames([...topicIds]);
      setTopicNameById(names);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load results.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, loadTopicNames]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  const topicRows = useMemo(() => {
    if (!result?.topicWisePerformance) return [];
    return result.topicWisePerformance.map((row) => {
      const id = String(row.topicId);
      const pct = topicPercent(row.correct, row.total);
      return {
        id,
        name: topicNameById.get(id) ?? `Topic ${id.slice(-6)}`,
        correct: row.correct,
        total: row.total,
        percent: pct,
      };
    });
  }, [result, topicNameById]);

  const weakTopicNames = useMemo(() => {
    if (!result?.weakAreas?.length) return [];
    return result.weakAreas.map(
      (id) => topicNameById.get(String(id)) ?? `Topic ${String(id).slice(-6)}`
    );
  }, [result, topicNameById]);

  const toggleReview = (mcqId) => {
    setExpandedReview((prev) => {
      const next = new Set(prev);
      if (next.has(mcqId)) next.delete(mcqId);
      else next.add(mcqId);
      return next;
    });
  };

  const shareSummary = useMemo(() => {
    const score = result?.score ?? 0;
    return `I scored ${score}% on ${examTitle} on QUIZZERA.`;
  }, [result?.score, examTitle]);

  const handleShareResult = async () => {
    const text = shareSummary;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  };

  if (loading) {
    return <ResultsSkeleton />;
  }

  if (error || !result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ExamPageError onRetry={loadResult} />
        <p className="mt-4 text-center text-sm text-[#6B6B6B]">
          <Link href="/exams" className="font-semibold text-[#111111] underline">
            Back to exams
          </Link>
        </p>
      </main>
    );
  }

  const examId = String(result.examId ?? '');

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pb-16 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <div
          className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-2 border-[#111111] bg-white"
          aria-label={`Score ${result.score} percent`}
        >
          <span className="text-[36px] font-bold leading-none text-[#111111]">{result.score}%</span>
        </div>
        <p className="mt-3 text-[14px] font-semibold uppercase tracking-wide text-[#111111]">
          {result.passed ? 'Passed' : 'Failed'}
        </p>
        <button
          type="button"
          onClick={handleShareResult}
          className="mt-4 rounded-full border-2 border-[#111111] bg-white px-5 py-2 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F9F9F9]"
        >
          {shareCopied ? 'Copied!' : 'Share Result'}
        </button>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-3">
        {[
          { label: 'Correct', value: result.totalCorrect },
          { label: 'Wrong', value: result.totalWrong },
          { label: 'Unattempted', value: result.totalUnattempted },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border-2 border-[#111111] bg-white px-3 py-4 text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[#111111]">{stat.value ?? 0}</p>
          </div>
        ))}
      </div>

      {topicRows.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-sm font-bold text-[#111111]">Topic-wise performance</h2>
          <ul className="mt-4 space-y-4">
            {topicRows.map((row) => (
              <li key={row.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium text-[#111111]">
                    {row.name}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-[#111111]">
                    {row.percent}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-sm border border-[#111111] bg-white">
                  <div
                    className="h-full bg-[#111111] transition-[width] duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {weakTopicNames.length > 0 ? (
        <section className="mt-12 rounded-lg border-2 border-[#111111] bg-white p-5">
          <h2 className="text-sm font-bold text-[#111111]">Weak areas</h2>
          <p className="mt-1 text-sm text-[#6B6B6B]">Focus on these areas</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-medium text-[#111111]">
            {weakTopicNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {Array.isArray(result.review) && result.review.length > 0 ? (
        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-[#111111]">Answer review</h2>
            <Link
              href={`/exams/review/${sessionId}`}
              className="inline-flex justify-center rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#333333]"
            >
              Review All Questions
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {result.review.map((item, index) => (
              <ReviewAccordionItem
                key={item.mcqId}
                item={item}
                index={index}
                expanded={expandedReview.has(item.mcqId)}
                onToggle={() => toggleReview(item.mcqId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link
          href={examId ? `/exams/${examId}` : '/exams'}
          className="flex-1 rounded-full border-2 border-[#111111] bg-white py-3 text-center text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F9F9F9]"
        >
          Try Again
        </Link>
        <Link
          href="/exams"
          className="flex-1 rounded-full bg-[#111111] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#333333]"
        >
          Back to Exams
        </Link>
      </div>
    </main>
  );
}
