'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { PageLoader } from '@/components/ui/PageLoader';

const PAGE_SIZE = 20;

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'All difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

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

function McqDetailModal({
  mcq,
  open,
  onClose,
  bookmarked,
  bookmarkBusy,
  onToggleBookmark,
  reveal,
  revealBusy,
  actionError,
  onReveal,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mcq) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="mcq-modal-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto border border-border bg-background shadow-card"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background px-5 py-4">
          <h2 id="mcq-modal-title" className="pr-10 text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
            Question
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
              disabled={bookmarkBusy}
              onClick={onToggleBookmark}
              className="rounded p-1.5 text-primary transition-colors hover:bg-surface disabled:opacity-40"
            >
              <BookmarkIcon filled={bookmarked} className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-secondary transition-colors hover:bg-surface hover:text-primary"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-5 text-primary">
          <p className="text-[15px] leading-relaxed">{mcq.questionStem}</p>
          <fieldset className="mt-6 space-y-3 border-0 p-0">
            <legend className="sr-only">Answer choices</legend>
            {(mcq.options ?? []).map((opt) => (
              <label
                key={opt.label}
                className="flex cursor-default items-start gap-3 border border-border bg-surface px-3 py-2.5 text-sm"
              >
                <input
                  type="radio"
                  name={`mcq-preview-${mcq._id}`}
                  value={opt.label}
                  disabled
                  className="mt-0.5 accent-primary"
                />
                <span>
                  <span className="font-semibold">{opt.label}.</span> {opt.text}
                </span>
              </label>
            ))}
          </fieldset>

          <div className="mt-6">
            <button
              type="button"
              onClick={onReveal}
              disabled={revealBusy || !!reveal}
              className="rounded-full border-2 border-primary bg-background px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary transition-colors hover:bg-surface disabled:opacity-40"
            >
              {reveal ? 'Answer revealed' : revealBusy ? 'Loading…' : 'Reveal answer'}
            </button>
            {actionError ? <p className="mt-2 text-sm text-secondary">{actionError}</p> : null}
            {reveal ? (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                <p>
                  <span className="font-semibold text-primary">Correct:</span>{' '}
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-inverse">
                    {reveal.correctAnswer}
                  </span>
                </p>
                {reveal.explanation ? (
                  <p className="mt-3 leading-relaxed text-secondary">{reveal.explanation}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function McqsPage() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const [mcqs, setMcqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [taxonomyLoading, setTaxonomyLoading] = useState(true);

  const [modalMcq, setModalMcq] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const [bookmarkIds, setBookmarkIds] = useState(() => new Set());
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  const subjectMap = useMemo(() => {
    const m = new Map();
    for (const s of subjects) {
      m.set(String(s._id), s.name);
    }
    return m;
  }, [subjects]);

  const loadSubjects = useCallback(async () => {
    setTaxonomyLoading(true);
    try {
      const { data } = await apiGet('/api/taxonomy/subjects');
      if (!data?.success || !Array.isArray(data?.data?.subjects)) {
        throw new Error(data?.message || 'Could not load subjects.');
      }
      setSubjects(data.data.subjects);
    } catch (e) {
      setListError(e?.response?.data?.message || e?.message || 'Failed to load subjects.');
      setSubjects([]);
    } finally {
      setTaxonomyLoading(false);
    }
  }, []);

  const loadTopics = useCallback(async (sid) => {
    if (!sid) {
      setTopics([]);
      return;
    }
    try {
      const { data } = await apiGet('/api/taxonomy/topics', {
        params: { subjectId: sid },
      });
      if (!data?.success || !Array.isArray(data?.data?.topics)) {
        throw new Error(data?.message || 'Could not load topics.');
      }
      setTopics(data.data.topics);
    } catch {
      setTopics([]);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    try {
      const { data } = await apiGet('/api/mcqs/bookmarks', {
        params: { page: 1, limit: 500 },
      });
      if (!data?.success || !Array.isArray(data?.data?.mcqs)) return;
      const ids = new Set(data.data.mcqs.map((m) => String(m._id)));
      setBookmarkIds(ids);
    } catch {
      /* bookmarks optional */
    }
  }, []);

  const loadMcqs = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (subjectId) params.subjectId = subjectId;
      if (topicId) params.topicId = topicId;
      if (difficulty) params.difficulty = difficulty;
      const { data } = await apiGet('/api/mcqs', { params });
      if (!data?.success || !Array.isArray(data?.data?.mcqs)) {
        throw new Error(data?.message || 'Could not load MCQs.');
      }
      setMcqs(data.data.mcqs);
      setTotal(Number(data.data.total) || 0);
    } catch (e) {
      setListError(e?.response?.data?.message || e?.message || 'Failed to load MCQs.');
      setMcqs([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [page, subjectId, topicId, difficulty]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    loadTopics(subjectId);
    setTopicId('');
  }, [subjectId, loadTopics]);

  useEffect(() => {
    setPage(1);
  }, [subjectId, topicId, difficulty]);

  useEffect(() => {
    loadMcqs();
  }, [loadMcqs]);

  const openModal = (mcq) => {
    setModalMcq(mcq);
    setReveal(null);
    setActionError('');
  };

  const closeModal = () => {
    setModalMcq(null);
    setReveal(null);
    setActionError('');
    setRevealBusy(false);
  };

  const handleReveal = async () => {
    if (!modalMcq?._id) return;
    setRevealBusy(true);
    setActionError('');
    try {
      const { data } = await apiGet(`/api/mcqs/${modalMcq._id}/answer`);
      if (!data?.success || !data?.data) {
        throw new Error(data?.message || 'Could not load answer.');
      }
      setReveal({
        correctAnswer: data.data.correctAnswer,
        explanation: data.data.explanation ?? '',
      });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not reveal answer.';
      setActionError(msg);
    } finally {
      setRevealBusy(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!modalMcq?._id) return;
    setBookmarkBusy(true);
    setActionError('');
    try {
      const { data } = await apiPost(`/api/mcqs/${modalMcq._id}/bookmark`, {});
      if (!data?.success || typeof data?.data?.bookmarked !== 'boolean') {
        throw new Error(data?.message || 'Bookmark failed.');
      }
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        const id = String(modalMcq._id);
        if (data.data.bookmarked) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || 'Bookmark failed.');
    } finally {
      setBookmarkBusy(false);
    }
  };

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  if (taxonomyLoading && subjects.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <header className="border-b border-border pb-8">
          <h1 className="text-xl font-semibold tracking-tight">Practice MCQs</h1>
          <p className="mt-2 text-sm text-secondary">Browse public questions. Reveal answers when you are ready.</p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
              Subject
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="rounded border border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-primary outline-none focus:border-primary"
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
              Topic
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={!subjectId}
                className="rounded border border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-primary outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All topics</option>
                {topics.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
              Difficulty
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="rounded border border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-primary outline-none focus:border-primary"
              >
                {DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {listError ? (
          <p className="mt-8 text-sm text-secondary" role="alert">
            {listError}
          </p>
        ) : null}

        {listLoading ? (
          <div className="mt-12 flex justify-center">
            <PageLoader />
          </div>
        ) : (
          <>
            <p className="mt-6 text-xs uppercase tracking-[0.16em] text-secondary">
              {total} question{total === 1 ? '' : 's'}
              {total > PAGE_SIZE ? ` · page ${page} of ${maxPage}` : ''}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {mcqs.map((mcq) => {
                const sid = String(mcq.subjectId);
                const subjectName = subjectMap.get(sid) ?? 'Subject';
                return (
                  <li key={mcq._id}>
                    <button
                      type="button"
                      onClick={() => openModal(mcq)}
                      className="w-full rounded border border-border bg-background p-4 text-left transition-colors hover:bg-surface"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-inverse">
                          {mcq.difficulty ?? '—'}
                        </span>
                        <span className="text-xs text-secondary">{subjectName}</span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-snug text-primary">{mcq.questionStem}</p>
                      {Array.isArray(mcq.tags) && mcq.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {mcq.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {mcqs.length === 0 && !listError ? (
              <p className="mt-10 text-center text-sm text-secondary">No MCQs match these filters.</p>
            ) : null}

            {total > PAGE_SIZE ? (
              <div className="mt-8 flex items-center justify-between border-t border-border pt-6 text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-full border border-border px-4 py-2 font-medium text-primary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= maxPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border border-border px-4 py-2 font-medium text-primary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>

      <McqDetailModal
        mcq={modalMcq}
        open={!!modalMcq}
        onClose={closeModal}
        bookmarked={modalMcq ? bookmarkIds.has(String(modalMcq._id)) : false}
        bookmarkBusy={bookmarkBusy}
        onToggleBookmark={handleToggleBookmark}
        reveal={reveal}
        revealBusy={revealBusy}
        actionError={actionError}
        onReveal={handleReveal}
      />
    </div>
  );
}
