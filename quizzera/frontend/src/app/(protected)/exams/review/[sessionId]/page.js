'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { ExamPageError } from '@/components/exam/ExamPageStates';
import { Skeleton } from '@/components/ui/Skeleton';

function questionStatus(item) {
  const selected = String(item?.selectedLabel ?? '').trim();
  if (!selected) return 'unattempted';
  if (item.isCorrect) return 'correct';
  return 'wrong';
}

function navButtonClass(status, isCurrent) {
  let cls =
    'flex h-9 w-full items-center justify-center rounded-md text-sm font-semibold transition-colors';
  if (isCurrent) {
    cls += ' ring-2 ring-[#111111] ring-offset-1';
  }
  if (status === 'correct') {
    cls += ' bg-[#111111] text-white';
  } else if (status === 'wrong') {
    cls += ' bg-[#6B6B6B] text-white';
  } else {
    cls += ' bg-[#E5E5E5] text-[#6B6B6B]';
  }
  return cls;
}

function readOnlyOptionClassName({ isSelected, isCorrect }) {
  const base =
    'flex w-full items-start gap-3 rounded-[12px] border p-4 text-left text-sm';
  if (isCorrect) {
    return `${base} border-2 border-[#111111] bg-white font-semibold text-[#111111]`;
  }
  if (isSelected) {
    return `${base} border-2 border-[#6B6B6B] bg-[#F9F9F9] text-[#6B6B6B]`;
  }
  return `${base} border border-[#E5E5E5] bg-white text-[#111111]`;
}

export default function ExamSessionReviewPage() {
  const params = useParams();
  const sessionId = String(params?.sessionId ?? '').trim();

  const [examTitle, setExamTitle] = useState('Exam review');
  const [review, setReview] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReview = useCallback(async () => {
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
        setError('Review is not available yet. Complete and submit the exam first.');
        return;
      }
      const payload = data.data;
      const items = Array.isArray(payload.review) ? payload.review : [];
      if (items.length === 0) {
        setError('No questions to review.');
        return;
      }
      setReview(items);
      setCurrentIndex(0);

      const examId = String(payload.examId ?? '').trim();
      if (examId) {
        try {
          const { data: examRes } = await apiGet(`/api/exams/by-id/${examId}`);
          const title = examRes?.data?.exam?.title;
          if (title) setExamTitle(String(title));
        } catch {
          /* keep default title */
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load review.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  const currentItem = review[currentIndex] ?? null;
  const total = review.length;
  const reviewedLabel = total > 0 ? `${currentIndex + 1} of ${total} questions reviewed` : '';

  const statusByIndex = useMemo(
    () => review.map((item) => questionStatus(item)),
    [review]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
          <Skeleton height="20px" width="180px" />
          <Skeleton height="36px" width="140px" />
        </header>
        <div className="flex flex-1">
          <aside className="w-56 border-r border-[#E5E5E5] p-4">
            <Skeleton height="14px" width="80%" className="mb-3" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} height="36px" width="100%" borderRadius="6px" />
              ))}
            </div>
          </aside>
          <div className="flex-1 p-6">
            <Skeleton height="24px" width="90%" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height="72px" width="100%" borderRadius="12px" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentItem) {
    return (
      <main className="min-h-screen bg-white px-4 py-10">
        <ExamPageError onRetry={loadReview} />
        <p className="mt-4 text-center text-sm text-[#6B6B6B]">
          <Link
            href={sessionId ? `/exams/results/${sessionId}` : '/exams'}
            className="font-semibold text-[#111111] underline"
          >
            Back to results
          </Link>
        </p>
      </main>
    );
  }

  const selectedLabel = String(currentItem.selectedLabel ?? '').trim();
  const correctLabel = String(currentItem.correctAnswer ?? '').trim();

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#111111]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold sm:text-lg">{examTitle}</h1>
          <p className="mt-0.5 text-xs text-[#6B6B6B]">{reviewedLabel}</p>
        </div>
        <Link
          href={`/exams/results/${sessionId}`}
          className="shrink-0 rounded-full border-2 border-[#111111] bg-white px-4 py-2 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F9F9F9]"
        >
          Back to Results
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="border-b border-[#E5E5E5] bg-[#FAFAFA] p-4 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
            Questions
          </p>
          <nav
            className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-4"
            aria-label="Question navigator"
          >
            {review.map((item, index) => {
              const status = statusByIndex[index];
              const isCurrent = index === currentIndex;
              return (
                <button
                  key={item.mcqId ?? index}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={navButtonClass(status, isCurrent)}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Question ${index + 1}, ${status}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </nav>
          <ul className="mt-4 space-y-1 text-[10px] text-[#6B6B6B]">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#111111]" aria-hidden />
              Correct
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#6B6B6B]" aria-hidden />
              Wrong
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#E5E5E5]" aria-hidden />
              Unattempted
            </li>
          </ul>
        </aside>

        <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
            Question {currentIndex + 1} of {total}
          </p>
          <h2 className="mt-3 text-[18px] font-bold leading-snug">{currentItem.questionStem}</h2>

          <div className="mt-8 flex flex-col gap-3" aria-label="Answer review">
            {(currentItem.options ?? []).map((opt) => {
              const label = String(opt.label ?? '').trim();
              const isSelected = selectedLabel === label;
              const isCorrect = correctLabel === label;
              return (
                <div
                  key={label}
                  className={readOnlyOptionClassName({ isSelected, isCorrect })}
                >
                  <span className="min-w-[1.25rem] font-semibold">{opt.label}.</span>
                  <span className="flex-1">
                    {opt.text}
                    {isSelected ? (
                      <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                        Your answer
                      </span>
                    ) : null}
                    {isCorrect ? (
                      <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#111111]">
                        Correct answer
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>

          {!selectedLabel ? (
            <p className="mt-4 text-sm font-medium text-[#6B6B6B]">You did not answer this question.</p>
          ) : null}

          <div className="mt-8 rounded-[12px] border border-[#E5E5E5] bg-[#FAFAFA] p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
              Explanation
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#111111]">
              {currentItem.explanation?.trim() || 'No explanation provided.'}
            </p>
          </div>

          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="rounded-full border-2 border-[#111111] px-4 py-2 text-sm font-semibold text-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentIndex >= total - 1}
              onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
              className="rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
