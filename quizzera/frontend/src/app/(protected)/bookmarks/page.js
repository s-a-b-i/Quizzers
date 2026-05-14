'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { McqResultsEmpty, McqResultsError } from '@/components/mcq/McqPageStates';
import { Skeleton } from '@/components/ui/Skeleton';

const PAGE_SIZE = 20;

function BookmarkCardSkeleton() {
  return (
    <li className="rounded-[12px] border border-[#E5E5E5] bg-white p-4 pr-12">
      <div className="flex flex-col gap-2">
        <Skeleton height="14px" width="100%" borderRadius="4px" />
        <Skeleton height="14px" width="90%" borderRadius="4px" />
        <Skeleton height="14px" width="48%" borderRadius="4px" />
      </div>
    </li>
  );
}

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

export default function BookmarksPage() {
  const router = useRouter();
  const [mcqs, setMcqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [subjectNameById, setSubjectNameById] = useState(() => new Map());
  const [topicNameById, setTopicNameById] = useState(() => new Map());
  const [bookmarkBusyId, setBookmarkBusyId] = useState(null);

  const loadSubjectsMap = useCallback(async () => {
    try {
      const { data } = await apiGet('/api/taxonomy/subjects');
      if (!data?.success || !Array.isArray(data?.data?.subjects)) return;
      const m = new Map();
      for (const s of data.data.subjects) {
        m.set(String(s._id), s.name);
      }
      setSubjectNameById(m);
    } catch {
      /* optional */
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiGet('/api/mcqs/bookmarks', {
        params: { page, limit: PAGE_SIZE },
      });
      if (!data?.success || !Array.isArray(data?.data?.mcqs)) {
        throw new Error(data?.message || 'Could not load bookmarks.');
      }
      setMcqs(data.data.mcqs);
      setTotal(Number(data.data.total) || 0);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load bookmarks.');
      setMcqs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadSubjectsMap();
  }, [loadSubjectsMap]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  /** If the current page becomes empty but bookmarks remain (e.g. removed last on page 2), load the previous page. */
  useEffect(() => {
    if (loading) return;
    if (mcqs.length === 0 && total > 0 && page > 1) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [loading, mcqs.length, total, page]);

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

  const handleCardBookmark = useCallback(
    async (e, mcqId) => {
      e.preventDefault();
      e.stopPropagation();
      setBookmarkBusyId(mcqId);
      try {
        const { data } = await apiPost(`/api/mcqs/${encodeURIComponent(mcqId)}/bookmark`, {});
        if (!data?.success || typeof data?.data?.bookmarked !== 'boolean') return;
        if (!data.data.bookmarked) {
          setMcqs((prev) => prev.filter((m) => String(m._id) !== String(mcqId)));
          setTotal((t) => Math.max(0, t - 1));
        }
      } catch {
        /* ignore */
      } finally {
        setBookmarkBusyId(null);
      }
    },
    []
  );

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
        <h1 className="text-[24px] font-bold leading-tight text-[#111111]">Bookmarks</h1>

        {error && !loading ? (
          <McqResultsError onRetry={() => loadBookmarks()} />
        ) : loading ? (
          <ul className="mt-8 flex flex-col gap-3" aria-busy="true" aria-label="Loading bookmarks">
            {Array.from({ length: 4 }, (_, i) => (
              <BookmarkCardSkeleton key={i} />
            ))}
          </ul>
        ) : mcqs.length === 0 ? (
          <div className="mt-6">
            <McqResultsEmpty onClearFilters={() => router.push('/mcqs')} />
          </div>
        ) : (
          <>
            <p className="mt-6 text-[13px] text-[#6B6B6B]">
              {total} bookmark{total === 1 ? '' : 's'}
              {total > PAGE_SIZE ? ` · page ${page} of ${maxPage}` : ''}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {mcqs.map((mcq) => {
                const sid = String(mcq.subjectId);
                const tid = String(mcq.topicId);
                const subjectName = subjectNameById.get(sid) ?? 'Subject';
                const topicName = topicNameById.get(tid) ?? 'Topic';
                const href = `/mcqs/${mcq._id}`;
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
                      title="Remove bookmark"
                      disabled={bookmarkBusyId === String(mcq._id)}
                      onClick={(e) => handleCardBookmark(e, String(mcq._id))}
                      className="absolute right-3 top-3 z-10 rounded p-1.5 text-[#111111] hover:bg-[#F9F9F9] disabled:opacity-40"
                    >
                      <BookmarkIcon filled className="h-5 w-5" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {total > PAGE_SIZE ? (
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
  );
}
