'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { McqResultsEmpty, McqResultsError } from '@/components/mcq/McqPageStates';
import { Skeleton } from '@/components/ui/Skeleton';

const PAGE_SIZE = 20;
const SIDEBAR_W = 'w-[240px]';

const DIFF_KEYS = ['easy', 'medium', 'hard'];

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

function FilterSelectSkeleton() {
  return <Skeleton className="mt-1" height="40px" width="100%" borderRadius="6px" />;
}

function FilterFields({
  examBodies,
  examBodyId,
  setExamBodyId,
  subjects,
  subjectId,
  setSubjectId,
  topics,
  topicId,
  setTopicId,
  subtopics,
  subtopicId,
  setSubtopicId,
  difficulties,
  toggleDifficulty,
  tagsInput,
  setTagsInput,
  onClearAll,
  examBodiesLoading,
  subjectsLoading,
  topicsLoading,
  subtopicsLoading,
}) {
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111111]">
        Exam body
        {examBodiesLoading ? (
          <FilterSelectSkeleton />
        ) : (
          <select
            value={examBodyId}
            onChange={(e) => setExamBodyId(e.target.value)}
            className="rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#111111] outline-none focus:border-[#111111]"
          >
            <option value="">All</option>
            {examBodies.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111111]">
        Subject
        {examBodiesLoading ? (
          <FilterSelectSkeleton />
        ) : subjectsLoading && examBodyId ? (
          <FilterSelectSkeleton />
        ) : (
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={!examBodyId || subjectsLoading}
            className="rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#111111] outline-none focus:border-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{examBodyId ? 'All subjects' : 'Select exam body'}</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111111]">
        Topic
        {examBodiesLoading ? (
          <FilterSelectSkeleton />
        ) : topicsLoading && subjectId ? (
          <FilterSelectSkeleton />
        ) : (
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            disabled={!subjectId}
            className="rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#111111] outline-none focus:border-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{subjectId ? 'All topics' : 'Select subject'}</option>
            {topics.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111111]">
        Subtopic
        {examBodiesLoading ? (
          <FilterSelectSkeleton />
        ) : subtopicsLoading && topicId ? (
          <FilterSelectSkeleton />
        ) : (
          <select
            value={subtopicId}
            onChange={(e) => setSubtopicId(e.target.value)}
            disabled={!topicId}
            className="rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#111111] outline-none focus:border-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{topicId ? 'All subtopics' : 'Select topic'}</option>
            {subtopics.map((st) => (
              <option key={st._id} value={st._id}>
                {st.name}
              </option>
            ))}
          </select>
        )}
      </label>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111111]">Difficulty</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIFF_KEYS.map((key) => {
            const active = difficulties.has(key);
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleDifficulty(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  active ? 'bg-[#111111] text-white' : 'border border-[#E5E5E5] bg-white text-[#111111] hover:bg-[#F9F9F9]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111111]">
        Tags
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. seed, algebra"
          className="rounded border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#111111] outline-none placeholder:text-[#AAAAAA] focus:border-[#111111]"
        />
      </label>

      <button
        type="button"
        onClick={onClearAll}
        className="self-start text-left text-[12px] text-[#6B6B6B] underline-offset-2 hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}

function McqBrowseCardSkeleton() {
  return (
    <li className="rounded-[12px] border border-[#E5E5E5] bg-white p-4 pr-12">
      <div className="flex flex-col gap-2">
        <Skeleton height="14px" width="100%" borderRadius="4px" />
        <Skeleton height="14px" width="88%" borderRadius="4px" />
        <Skeleton height="14px" width="52%" borderRadius="4px" />
      </div>
    </li>
  );
}

export default function McqsPage() {
  const [examBodies, setExamBodies] = useState([]);
  const [examBodyId, setExamBodyId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicId, setTopicId] = useState('');
  const [subtopics, setSubtopics] = useState([]);
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);
  const [subtopicId, setSubtopicId] = useState('');
  const [difficulties, setDifficulties] = useState(() => new Set());
  const [tagsInput, setTagsInput] = useState('');
  const [tagsDebounced, setTagsDebounced] = useState('');

  const [subjectNameById, setSubjectNameById] = useState(() => new Map());
  const [topicNameById, setTopicNameById] = useState(() => new Map());

  const [mcqs, setMcqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [examBodiesLoading, setExamBodiesLoading] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [bookmarkIds, setBookmarkIds] = useState(() => new Set());
  const [bookmarkBusyId, setBookmarkBusyId] = useState(null);

  const toggleDifficulty = useCallback((key) => {
    setDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const loadExamBodies = useCallback(async () => {
    setExamBodiesLoading(true);
    try {
      const { data } = await apiGet('/api/taxonomy/exam-bodies');
      if (!data?.success || !Array.isArray(data?.data?.examBodies)) return;
      setExamBodies(data.data.examBodies);
    } catch {
      setExamBodies([]);
    } finally {
      setExamBodiesLoading(false);
    }
  }, []);

  const loadSubjectsForBody = useCallback(async (bodyId) => {
    if (!bodyId) {
      setSubjects([]);
      return;
    }
    setSubjectsLoading(true);
    try {
      const { data } = await apiGet('/api/taxonomy/subjects', {
        params: { examBodyId: bodyId },
      });
      if (!data?.success || !Array.isArray(data?.data?.subjects)) {
        setSubjects([]);
        return;
      }
      setSubjects(data.data.subjects);
    } catch {
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const loadTopics = useCallback(async (sid) => {
    if (!sid) {
      setTopics([]);
      setTopicsLoading(false);
      return;
    }
    setTopicsLoading(true);
    try {
      const { data } = await apiGet('/api/taxonomy/topics', {
        params: { subjectId: sid },
      });
      if (!data?.success || !Array.isArray(data?.data?.topics)) {
        setTopics([]);
        return;
      }
      setTopics(data.data.topics);
    } catch {
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  const loadSubtopics = useCallback(async (tid) => {
    if (!tid) {
      setSubtopics([]);
      setSubtopicsLoading(false);
      return;
    }
    setSubtopicsLoading(true);
    try {
      const { data } = await apiGet('/api/taxonomy/subtopics', {
        params: { topicId: tid },
      });
      if (!data?.success || !Array.isArray(data?.data?.subtopics)) {
        setSubtopics([]);
        return;
      }
      setSubtopics(data.data.subtopics);
    } catch {
      setSubtopics([]);
    } finally {
      setSubtopicsLoading(false);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    try {
      const { data } = await apiGet('/api/mcqs/bookmarks', {
        params: { page: 1, limit: 500 },
      });
      if (!data?.success || !Array.isArray(data?.data?.mcqs)) return;
      setBookmarkIds(new Set(data.data.mcqs.map((m) => String(m._id))));
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    loadExamBodies();
  }, [loadExamBodies]);

  useEffect(() => {
    loadSubjectsForBody(examBodyId);
    setSubjectId('');
    setTopicId('');
    setTopics([]);
    setSubtopicId('');
    setSubtopics([]);
  }, [examBodyId, loadSubjectsForBody]);

  useEffect(() => {
    loadTopics(subjectId);
    setTopicId('');
    setSubtopicId('');
    setSubtopics([]);
  }, [subjectId, loadTopics]);

  useEffect(() => {
    loadSubtopics(topicId);
    setSubtopicId('');
  }, [topicId, loadSubtopics]);

  useEffect(() => {
    setSubjectNameById((prev) => {
      const n = new Map(prev);
      for (const s of subjects) {
        n.set(String(s._id), s.name);
      }
      return n;
    });
  }, [subjects]);

  useEffect(() => {
    setTopicNameById((prev) => {
      const n = new Map(prev);
      for (const t of topics) {
        n.set(String(t._id), t.name);
      }
      return n;
    });
  }, [topics]);

  const tagParams = useMemo(
    () =>
      tagsDebounced
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsDebounced]
  );

  useEffect(() => {
    const t = setTimeout(() => setTagsDebounced(tagsInput), 400);
    return () => clearTimeout(t);
  }, [tagsInput]);

  const loadMcqs = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      const taxonomyNarrowed = !!(subjectId || topicId || subtopicId);
      if (examBodyId && !taxonomyNarrowed) {
        params.examBodyId = examBodyId;
      }
      if (subjectId) params.subjectId = subjectId;
      if (topicId) params.topicId = topicId;
      if (subtopicId) params.subtopicId = subtopicId;
      if (difficulties.size > 0) {
        params.difficulty = [...difficulties].join(',');
      }
      if (tagParams.length) {
        params.tags = tagParams;
      }
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
  }, [page, examBodyId, subjectId, topicId, subtopicId, difficulties, tagParams]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    setPage(1);
  }, [examBodyId, subjectId, topicId, subtopicId, difficulties, tagsDebounced]);

  useEffect(() => {
    loadMcqs();
  }, [loadMcqs]);

  useEffect(() => {
    if (!mcqs.length) return undefined;
    let cancelled = false;
    const sids = [...new Set(mcqs.map((m) => String(m.subjectId)))];
    (async () => {
      for (const sid of sids) {
        if (cancelled) break;
        try {
          const { data } = await apiGet('/api/taxonomy/topics', {
            params: { subjectId: sid },
          });
          if (!data?.success || !Array.isArray(data?.data?.topics)) continue;
          setTopicNameById((prev) => {
            const n = new Map(prev);
            for (const t of data.data.topics) {
              n.set(String(t._id), t.name);
            }
            return n;
          });
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mcqs]);

  const clearAllFilters = useCallback(() => {
    setExamBodyId('');
    setSubjectId('');
    setTopicId('');
    setSubtopicId('');
    setDifficulties(new Set());
    setTagsInput('');
  }, []);

  const handleCardBookmark = useCallback(async (e, mcqId) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarkBusyId(mcqId);
    try {
      const { data } = await apiPost(`/api/mcqs/${encodeURIComponent(mcqId)}/bookmark`, {});
      if (!data?.success || typeof data?.data?.bookmarked !== 'boolean') return;
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (data.data.bookmarked) next.add(String(mcqId));
        else next.delete(String(mcqId));
        return next;
      });
    } catch {
      /* ignore */
    } finally {
      setBookmarkBusyId(null);
    }
  }, []);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  const filterProps = {
    examBodies,
    examBodyId,
    setExamBodyId,
    subjects,
    subjectId,
    setSubjectId,
    topics,
    topicId,
    setTopicId,
    subtopics,
    subtopicId,
    setSubtopicId,
    difficulties,
    toggleDifficulty,
    tagsInput,
    setTagsInput,
    onClearAll: clearAllFilters,
    examBodiesLoading,
    subjectsLoading,
    topicsLoading,
    subtopicsLoading,
  };

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:flex lg:gap-8 lg:px-6">
        {/* Mobile filter trigger */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <h1 className="text-lg font-semibold">Practice MCQs</h1>
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="rounded-full border-2 border-[#111111] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#111111]"
          >
            Filters
          </button>
        </div>

        {/* Desktop sticky sidebar */}
        <aside
          className={`${SIDEBAR_W} hidden shrink-0 lg:block`}
        >
          <div className="sticky top-[76px] border border-[#E5E5E5] bg-white p-4">
            <h2 className="border-b border-[#E5E5E5] pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B]">
              Filters
            </h2>
            <div className="pt-4">
              <FilterFields {...filterProps} />
            </div>
          </div>
        </aside>

        {/* Mobile bottom sheet */}
        {filterSheetOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Filters">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close filters"
              onClick={() => setFilterSheetOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-[#E5E5E5] border-b-0 bg-white px-4 pb-8 pt-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
              <div className="mb-4 flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <span className="text-sm font-semibold text-[#111111]">Filters</span>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  className="rounded p-2 text-[#6B6B6B] hover:bg-[#F9F9F9] hover:text-[#111111]"
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
              <FilterFields {...filterProps} />
              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="mt-6 w-full rounded-full border-2 border-[#111111] bg-[#111111] py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white"
              >
                Show results
              </button>
            </div>
          </div>
        ) : null}

        {/* Results */}
        <div className="min-w-0 flex-1 lg:pt-0">
          <header className="mb-6 hidden border-b border-[#E5E5E5] pb-6 lg:block">
            <h1 className="text-xl font-semibold tracking-tight">Practice MCQs</h1>
            <p className="mt-2 text-sm text-[#6B6B6B]">Browse and open any question to practice.</p>
          </header>

          {listError && !listLoading ? (
            <McqResultsError onRetry={() => loadMcqs()} />
          ) : (
            <>
              <p className="text-[13px] text-[#6B6B6B]">
                {listLoading ? 'Loading…' : `${total} question${total === 1 ? '' : 's'} found`}
              </p>

              {listLoading ? (
                <ul
                  className="mt-4 flex flex-col gap-3"
                  aria-busy={listLoading}
                  aria-label={listLoading ? 'Loading questions' : undefined}
                >
                  {Array.from({ length: 6 }, (_, i) => (
                    <McqBrowseCardSkeleton key={i} />
                  ))}
                </ul>
              ) : mcqs.length === 0 ? (
                <McqResultsEmpty onClearFilters={clearAllFilters} />
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {mcqs.map((mcq) => {
                    const sid = String(mcq.subjectId);
                    const tid = String(mcq.topicId);
                    const subjectName = subjectNameById.get(sid) ?? 'Subject';
                    const topicName = topicNameById.get(tid) ?? 'Topic';
                    const href = `/mcqs/${mcq._id}`;
                    const bm = bookmarkIds.has(String(mcq._id));
                    return (
                      <li key={mcq._id} className="relative">
                        <Link
                          href={href}
                          className="block rounded-[12px] border border-[#E5E5E5] bg-white p-4 pr-12 shadow-none transition-shadow hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                              {mcq.difficulty ?? '—'}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-[#111111]">
                            {mcq.questionStem}
                          </p>
                          <p className="mt-2 text-[11px] text-[#6B6B6B]">
                            {subjectName} <span className="text-[#AAAAAA]">›</span> {topicName}
                          </p>
                          {Array.isArray(mcq.tags) && mcq.tags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {mcq.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-[#E5E5E5] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#6B6B6B]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </Link>
                        <button
                          type="button"
                          title={bm ? 'Remove bookmark' : 'Add bookmark'}
                          disabled={bookmarkBusyId === String(mcq._id)}
                          onClick={(e) => handleCardBookmark(e, String(mcq._id))}
                          className="absolute right-3 top-3 z-10 rounded p-1.5 text-[#111111] hover:bg-[#F9F9F9] disabled:opacity-40"
                        >
                          <BookmarkIcon filled={bm} className="h-5 w-5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!listLoading && !listError && total > PAGE_SIZE ? (
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E5E5] pt-6">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-[13px] text-[#6B6B6B]">
                    Page {page} of {maxPage}
                  </span>
                  <button
                    type="button"
                    disabled={page >= maxPage}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
