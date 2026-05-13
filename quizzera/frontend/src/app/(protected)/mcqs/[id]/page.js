'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { PageLoader } from '@/components/ui/PageLoader';

function BookmarkIcon({ filled, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden
    >
      <path d="M6 4h12v16l-6-4-6 4V4z" strokeLinejoin="round" />
    </svg>
  );
}

export default function McqPracticePage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [mcq, setMcq] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedLabel, setSelectedLabel] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [revealError, setRevealError] = useState('');

  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  const loadMcq = useCallback(async () => {
    if (!id) {
      setLoadError('Invalid question link.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await apiGet(`/api/mcqs/${encodeURIComponent(id)}`);
      if (!data?.success || !data?.data?.mcq) {
        throw new Error(data?.message || 'Could not load question.');
      }
      setMcq(data.data.mcq);
    } catch (e) {
      setLoadError(e?.response?.data?.message || e?.message || 'Could not load question.');
      setMcq(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMcq();
  }, [loadMcq]);

  useEffect(() => {
    setSelectedLabel(null);
    setRevealed(false);
    setAnswer(null);
    setRevealError('');
  }, [id]);

  const syncBookmark = useCallback(async (mcqId) => {
    if (!mcqId) return;
    try {
      const { data } = await apiGet('/api/mcqs/bookmarks', {
        params: { page: 1, limit: 500 },
      });
      if (!data?.success || !Array.isArray(data?.data?.mcqs)) return;
      const found = data.data.mcqs.some((m) => String(m._id) === String(mcqId));
      setBookmarked(found);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (mcq?._id) syncBookmark(mcq._id);
  }, [mcq?._id, syncBookmark]);

  const handleReveal = async () => {
    if (!id || !selectedLabel || revealed) return;
    setRevealBusy(true);
    setRevealError('');
    try {
      const { data } = await apiGet(`/api/mcqs/${encodeURIComponent(id)}/answer`);
      if (!data?.success || !data?.data) {
        throw new Error(data?.message || 'Could not load answer.');
      }
      setAnswer({
        correctAnswer: String(data.data.correctAnswer ?? '').trim(),
        explanation: typeof data.data.explanation === 'string' ? data.data.explanation : '',
      });
      setRevealed(true);
    } catch (e) {
      setRevealError(e?.response?.data?.message || e?.message || 'Could not reveal answer.');
    } finally {
      setRevealBusy(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!id) return;
    setBookmarkBusy(true);
    try {
      const { data } = await apiPost(`/api/mcqs/${encodeURIComponent(id)}/bookmark`, {});
      if (!data?.success || typeof data?.data?.bookmarked !== 'boolean') {
        throw new Error(data?.message || 'Bookmark failed.');
      }
      setBookmarked(data.data.bookmarked);
    } catch {
      /* silent or could set toast */
    } finally {
      setBookmarkBusy(false);
    }
  };

  const optionClassName = (opt) => {
    const label = String(opt.label ?? '').trim();
    const isSelected = String(selectedLabel ?? '').trim() === label;
    const correct = answer?.correctAnswer != null ? String(answer.correctAnswer).trim() : '';

    if (!revealed || !correct) {
      const base =
        'flex w-full cursor-pointer items-start gap-3 rounded-[12px] border p-4 text-left text-[#111111] transition-colors';
      if (isSelected) {
        return `${base} border-[#111111] bg-[#F9F9F9]`;
      }
      return `${base} border-[#E5E5E5] bg-white hover:bg-[#F9F9F9]`;
    }

    if (label === correct) {
      return 'flex w-full cursor-default items-start gap-3 rounded-[12px] border border-[#111111] bg-[#111111] p-4 text-left text-white';
    }
    return 'flex w-full cursor-default items-start gap-3 rounded-[12px] border border-[#E5E5E5] bg-[#F9F9F9] p-4 text-left text-[#111111] line-through';
  };

  if (loading) {
    return <PageLoader />;
  }

  if (loadError || !mcq) {
    return (
      <div className="min-h-screen bg-white px-6 py-10 text-[#111111]">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/mcqs"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#111111] underline-offset-4 hover:underline"
          >
            ← Back to MCQs
          </Link>
          <p className="mt-10 text-sm text-[#6B6B6B]" role="alert">
            {loadError || 'Question not found.'}
          </p>
        </div>
      </div>
    );
  }

  const tags = Array.isArray(mcq.tags) ? mcq.tags : [];

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/mcqs"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-[#111111] underline-offset-4 hover:underline"
          >
            ← Back
          </Link>
          <button
            type="button"
            title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            disabled={bookmarkBusy}
            onClick={handleToggleBookmark}
            className="shrink-0 rounded p-2 text-[#111111] transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <BookmarkIcon filled={bookmarked} className="h-6 w-6" />
          </button>
        </div>

        <h1 className="mt-8 text-[18px] font-bold leading-snug text-[#111111]">{mcq.questionStem}</h1>

        <div className="mt-8 flex flex-col gap-3" role="radiogroup" aria-label="Answer choices">
          {(mcq.options ?? []).map((opt) => {
            const label = String(opt.label ?? '').trim();
            const isSelected = String(selectedLabel ?? '').trim() === label;
            return (
            <button
              key={opt.label}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={revealed}
              onClick={() => !revealed && setSelectedLabel(label)}
              className={optionClassName(opt)}
            >
              <span className="min-w-[1.25rem] font-semibold">{opt.label}.</span>
              <span className="flex-1">{opt.text}</span>
            </button>
            );
          })}
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleReveal}
            disabled={!selectedLabel || revealed || revealBusy}
            className="rounded-full border-2 border-[#111111] bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#111111] transition-colors hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {revealed ? 'Answer revealed' : revealBusy ? 'Loading…' : 'Reveal answer'}
          </button>
          {revealError ? (
            <p className="mt-3 text-sm text-[#6B6B6B]" role="alert">
              {revealError}
            </p>
          ) : null}
        </div>

        {revealed && answer ? (
          <div className="mt-8 rounded-[12px] bg-[#F9F9F9] p-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
              EXPLANATION
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#111111]">
              {answer.explanation?.trim() ? answer.explanation : '—'}
            </p>
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-[#E5E5E5] pt-8">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#E5E5E5] px-2.5 py-1 text-[11px] uppercase tracking-wide text-[#6B6B6B]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
