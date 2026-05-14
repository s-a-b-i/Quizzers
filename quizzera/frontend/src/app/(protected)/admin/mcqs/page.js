'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { McqResultsEmpty, McqResultsError } from '@/components/mcq/McqPageStates';
import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/Skeleton';

const PAGE_SIZE = 20;
const ADMIN_MCQ_ROLES = new Set(['admin', 'superAdmin', 'contentManager']);
const CAN_SOFT_DELETE_ROLES = new Set(['admin', 'superAdmin']);

const REVIEW_OPTIONS = [
  { value: '', label: 'All review statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
];

const VIS_OPTIONS = [
  { value: '', label: 'All visibility' },
  { value: 'public', label: 'Public' },
  { value: 'premium', label: 'Premium' },
  { value: 'hidden', label: 'Hidden' },
];

const DIFF_OPTIONS = [
  { value: '', label: 'All difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

function truncate(s, max) {
  const t = typeof s === 'string' ? s : '';
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function optionLetters(count) {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

function buildOptionsPayload(optionTexts, correctIndex) {
  const labels = optionLetters(optionTexts.length);
  return {
    options: optionTexts.map((text, i) => ({
      label: labels[i],
      text: String(text ?? '').trim(),
    })),
    correctAnswer: labels[Math.min(correctIndex, labels.length - 1)],
  };
}

function PencilIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PowerOffIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path d="M12 2v10M18.36 6.64a9 9 0 11-12.73 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminMcqTableSkeletonRow() {
  return (
    <tr className="border-b border-[#E5E5E5] last:border-b-0">
      <td colSpan={2} className="max-w-[280px] px-3 py-2.5">
        <Skeleton height="14px" width="92%" borderRadius="4px" />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <Skeleton height="14px" width="64px" borderRadius="4px" />
      </td>
      <td className="max-w-[200px] px-3 py-2.5">
        <Skeleton height="14px" width="88px" borderRadius="4px" />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <Skeleton height="14px" width="48px" borderRadius="4px" />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <Skeleton height="14px" width="56px" borderRadius="4px" />
      </td>
      <td colSpan={2} className="whitespace-nowrap px-3 py-2.5">
        <Skeleton height="14px" width="120px" borderRadius="4px" />
      </td>
    </tr>
  );
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function emptyMcqFormState() {
  return {
    questionStem: '',
    explanation: '',
    subjectId: '',
    topicId: '',
    subtopicId: '',
    difficulty: 'medium',
    source: '',
    tagsInput: '',
    reviewStatus: 'draft',
    visibilityStatus: 'hidden',
    isActive: true,
    examMappings: [],
    optionTexts: ['', '', '', ''],
    correctIndex: 0,
  };
}

function mcqFormStateFromDoc(mcq) {
  const opts = Array.isArray(mcq.options) ? mcq.options : [];
  const texts = opts.map((o) => String(o?.text ?? ''));
  const labels = opts.map((o) => String(o?.label ?? '').trim());
  const ca = String(mcq.correctAnswer ?? '').trim();
  let correctIndex = labels.indexOf(ca);
  if (correctIndex < 0) correctIndex = 0;
  const optionTexts =
    texts.length >= 2 ? texts : ['', '', '', ''].slice(0, Math.max(4, texts.length));
  while (optionTexts.length < 2) optionTexts.push('');
  const tags = Array.isArray(mcq.tags) ? mcq.tags.join(', ') : '';
  const em = Array.isArray(mcq.examMappings)
    ? mcq.examMappings.map((m) => ({
        examBodyId: String(m.examBodyId ?? ''),
        examTypeId: String(m.examTypeId ?? ''),
      }))
    : [];
  return {
    questionStem: String(mcq.questionStem ?? ''),
    explanation: String(mcq.explanation ?? ''),
    subjectId: String(mcq.subjectId ?? ''),
    topicId: String(mcq.topicId ?? ''),
    subtopicId: String(mcq.subtopicId ?? ''),
    difficulty: mcq.difficulty ?? 'medium',
    source: String(mcq.source ?? ''),
    tagsInput: tags,
    reviewStatus: mcq.reviewStatus ?? 'draft',
    visibilityStatus: mcq.visibilityStatus ?? 'hidden',
    isActive: mcq.isActive !== false,
    examMappings: em,
    optionTexts,
    correctIndex,
  };
}

function McqFormBody({
  form,
  setForm,
  subjects,
  topics,
  subtopics,
  subjectsLoading = false,
  topicsLoading,
  subtopicsLoading,
  examBodies,
  examBodiesLoading = false,
  examTypesByBody,
  loadExamTypesForBody,
  submitError,
  submitBusy,
  submitLabel,
  onSubmit,
  onCancel,
  radioGroupName = 'mcq-correct',
}) {
  const optionCount = form.optionTexts.length;

  function setOptionText(i, val) {
    setForm((f) => {
      const next = [...f.optionTexts];
      next[i] = val;
      return { ...f, optionTexts: next };
    });
  }

  function addOption() {
    if (form.optionTexts.length >= 6) return;
    setForm((f) => ({ ...f, optionTexts: [...f.optionTexts, ''] }));
  }

  function removeOption(i) {
    if (form.optionTexts.length <= 2) return;
    setForm((f) => {
      const next = f.optionTexts.filter((_, j) => j !== i);
      let correctIndex = f.correctIndex;
      if (correctIndex === i) correctIndex = 0;
      else if (correctIndex > i) correctIndex -= 1;
      return { ...f, optionTexts: next, correctIndex };
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {submitError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{submitError}</p>
      ) : null}

      <label className="block text-sm font-medium text-[#111111]">
        Question stem
        <textarea
          required
          rows={3}
          value={form.questionStem}
          onChange={(e) => setForm((f) => ({ ...f, questionStem: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium text-[#111111]">
          Subject
          {subjectsLoading ? (
            <Skeleton className="mt-1" height="40px" width="100%" borderRadius="8px" />
          ) : (
            <select
              required
              value={form.subjectId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  subjectId: e.target.value,
                  topicId: '',
                  subtopicId: '',
                }))
              }
              className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
            >
              <option value="">Select…</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="block text-sm font-medium text-[#111111]">
          Topic
          {topicsLoading && form.subjectId ? (
            <Skeleton className="mt-1" height="40px" width="100%" borderRadius="8px" />
          ) : (
            <select
              required
              disabled={!form.subjectId || topicsLoading}
              value={form.topicId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  topicId: e.target.value,
                  subtopicId: '',
                }))
              }
              className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111] disabled:opacity-50"
            >
              <option value="">Select…</option>
              {topics.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="block text-sm font-medium text-[#111111]">
          Subtopic
          {subtopicsLoading && form.topicId ? (
            <Skeleton className="mt-1" height="40px" width="100%" borderRadius="8px" />
          ) : (
            <select
              required
              disabled={!form.topicId || subtopicsLoading}
              value={form.subtopicId}
              onChange={(e) => setForm((f) => ({ ...f, subtopicId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111] disabled:opacity-50"
            >
              <option value="">Select…</option>
              {subtopics.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#111111]">
          Difficulty
          <select
            value={form.difficulty}
            onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-[#111111]">
          Source
          <input
            type="text"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#111111]">
          Review status
          <select
            value={form.reviewStatus}
            onChange={(e) => setForm((f) => ({ ...f, reviewStatus: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
          >
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-[#111111]">
          Visibility
          <select
            value={form.visibilityStatus}
            onChange={(e) => setForm((f) => ({ ...f, visibilityStatus: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
          >
            <option value="public">Public</option>
            <option value="premium">Premium</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-medium text-[#111111]">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="h-4 w-4 rounded border-[#E5E5E5] text-[#111111]"
        />
        Active
      </label>

      <label className="block text-sm font-medium text-[#111111]">
        Tags (comma-separated)
        <input
          type="text"
          value={form.tagsInput}
          onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
        />
      </label>

      <label className="block text-sm font-medium text-[#111111]">
        Explanation
        <textarea
          rows={3}
          value={form.explanation}
          onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
        />
      </label>

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-[#111111]">Options</span>
          <button
            type="button"
            disabled={optionCount >= 6}
            onClick={addOption}
            className="text-sm font-semibold text-[#111111] underline-offset-2 hover:underline disabled:opacity-40"
          >
            + Add option
          </button>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {form.optionTexts.map((text, i) => {
            const letters = optionLetters(optionCount);
            return (
              <li key={i} className="flex flex-wrap items-start gap-2 rounded-lg border border-[#E5E5E5] p-3">
                <label className="flex shrink-0 items-center gap-2 pt-1.5 text-sm text-[#6B6B6B]">
                  <input
                    type="radio"
                    name={radioGroupName}
                    checked={form.correctIndex === i}
                    onChange={() => setForm((f) => ({ ...f, correctIndex: i }))}
                    className="h-4 w-4 border-[#E5E5E5] text-[#111111]"
                  />
                  <span className="font-mono text-xs font-semibold text-[#111111]">{letters[i]}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Option ${letters[i]} text`}
                  value={text}
                  onChange={(e) => setOptionText(i, e.target.value)}
                  className="min-w-0 flex-1 rounded border border-transparent px-2 py-1.5 text-sm outline-none focus:border-[#E5E5E5]"
                />
                <button
                  type="button"
                  disabled={form.optionTexts.length <= 2}
                  onClick={() => removeOption(i)}
                  className="shrink-0 rounded px-2 py-1 text-sm text-[#6B6B6B] hover:bg-[#F9F9F9] hover:text-[#111111] disabled:opacity-30"
                  aria-label="Remove option"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-[#111111]">Exam mappings (optional)</span>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                examMappings: [...f.examMappings, { examBodyId: '', examTypeId: '' }],
              }))
            }
            className="text-sm font-semibold text-[#111111] underline-offset-2 hover:underline"
          >
            + Add mapping
          </button>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {form.examMappings.map((row, idx) => (
            <li key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border border-[#E5E5E5] p-3">
              <label className="min-w-[140px] flex-1 text-xs font-medium text-[#6B6B6B]">
                Exam body
                {examBodiesLoading ? (
                  <Skeleton className="mt-1" height="36px" width="100%" borderRadius="6px" />
                ) : (
                  <select
                    value={row.examBodyId}
                    onChange={(e) => {
                      const examBodyId = e.target.value;
                      setForm((f) => {
                        const next = [...f.examMappings];
                        next[idx] = { examBodyId, examTypeId: '' };
                        return { ...f, examMappings: next };
                      });
                      if (examBodyId) loadExamTypesForBody(examBodyId);
                    }}
                    className="mt-1 w-full rounded border border-[#E5E5E5] px-2 py-1.5 text-sm text-[#111111]"
                  >
                    <option value="">Select…</option>
                    {examBodies.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="min-w-[140px] flex-1 text-xs font-medium text-[#6B6B6B]">
                Exam type
                <select
                  value={row.examTypeId}
                  disabled={!row.examBodyId}
                  onChange={(e) => {
                    const examTypeId = e.target.value;
                    setForm((f) => {
                      const next = [...f.examMappings];
                      next[idx] = { ...next[idx], examTypeId };
                      return { ...f, examMappings: next };
                    });
                  }}
                  className="mt-1 w-full rounded border border-[#E5E5E5] px-2 py-1.5 text-sm text-[#111111] disabled:opacity-50"
                >
                  <option value="">Select…</option>
                  {(examTypesByBody.get(row.examBodyId) ?? []).map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    examMappings: f.examMappings.filter((_, j) => j !== idx),
                  }))
                }
                className="mb-0.5 rounded px-2 py-1 text-sm text-[#6B6B6B] hover:bg-[#F9F9F9]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-[#E5E5E5] pt-4">
        <button
          type="submit"
          disabled={submitBusy}
          className="rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitBusy ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitBusy}
          className="rounded-full border border-[#E5E5E5] px-5 py-2.5 text-sm font-medium text-[#111111] hover:bg-[#F9F9F9] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminMcqsPage() {
  const router = useRouter();
  const { mongoUser, role, loading: authLoading } = useAuth();
  const effectiveRole = mongoUser?.role ?? role ?? '';
  const allowed = ADMIN_MCQ_ROLES.has(effectiveRole);
  const canDelete = CAN_SOFT_DELETE_ROLES.has(effectiveRole);

  const [mcqs, setMcqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [qInput, setQInput] = useState('');
  const qDebounced = useDebounced(qInput, 350);
  const [reviewFilter, setReviewFilter] = useState('');
  const [visFilter, setVisFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  const [subjectNameById, setSubjectNameById] = useState(() => new Map());
  const [topicNameById, setTopicNameById] = useState(() => new Map());
  const [subtopicNameById, setSubtopicNameById] = useState(() => new Map());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyMcqFormState);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyMcqFormState);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [editLoadError, setEditLoadError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkParseError, setBulkParseError] = useState('');
  const [bulkItems, setBulkItems] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const bulkFileRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);

  const [examBodies, setExamBodies] = useState([]);
  const [taxonomySubjectsLoading, setTaxonomySubjectsLoading] = useState(true);
  const [taxonomyExamBodiesLoading, setTaxonomyExamBodiesLoading] = useState(true);
  const [examTypesByBody, setExamTypesByBody] = useState(() => new Map());

  const examTypesFetchedRef = useRef(new Set());

  const loadExamTypesForBody = useCallback(async (examBodyId) => {
    if (!examBodyId || examTypesFetchedRef.current.has(examBodyId)) return;
    examTypesFetchedRef.current.add(examBodyId);
    try {
      const { data } = await apiGet('/api/taxonomy/exam-types', {
        params: { examBodyId },
      });
      if (!data?.success || !Array.isArray(data?.data?.examTypes)) return;
      setExamTypesByBody((prev) => {
        const n = new Map(prev);
        n.set(examBodyId, data.data.examTypes);
        return n;
      });
    } catch {
      examTypesFetchedRef.current.delete(examBodyId);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !allowed) return;
    let cancelled = false;
    setTaxonomySubjectsLoading(true);
    (async () => {
      try {
        const { data } = await apiGet('/api/taxonomy/subjects');
        if (!data?.success || !Array.isArray(data?.data?.subjects)) return;
        if (cancelled) return;
        setSubjects(data.data.subjects);
        const m = new Map();
        for (const s of data.data.subjects) {
          m.set(String(s._id), s.name);
        }
        setSubjectNameById(m);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setTaxonomySubjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, allowed]);

  useEffect(() => {
    if (authLoading || !allowed) return;
    let cancelled = false;
    setTaxonomyExamBodiesLoading(true);
    (async () => {
      try {
        const { data } = await apiGet('/api/taxonomy/exam-bodies');
        if (!data?.success || !Array.isArray(data?.data?.examBodies)) return;
        if (cancelled) return;
        setExamBodies(data.data.examBodies);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setTaxonomyExamBodiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, allowed]);

  /** Edit drawer takes precedence so topic/subtopic loads match the visible form. */
  const formSubjectId = editOpen
    ? editForm.subjectId
    : drawerOpen
      ? createForm.subjectId
      : '';
  const formTopicId = editOpen ? editForm.topicId : drawerOpen ? createForm.topicId : '';

  useEffect(() => {
    if (!formSubjectId) {
      setTopics([]);
      return undefined;
    }
    let cancelled = false;
    setTopicsLoading(true);
    (async () => {
      try {
        const { data } = await apiGet('/api/taxonomy/topics', {
          params: { subjectId: formSubjectId },
        });
        if (cancelled) return;
        if (!data?.success || !Array.isArray(data?.data?.topics)) {
          setTopics([]);
          return;
        }
        setTopics(data.data.topics);
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formSubjectId]);

  useEffect(() => {
    if (!formTopicId) {
      setSubtopics([]);
      return undefined;
    }
    let cancelled = false;
    setSubtopicsLoading(true);
    (async () => {
      try {
        const { data } = await apiGet('/api/taxonomy/subtopics', {
          params: { topicId: formTopicId },
        });
        if (cancelled) return;
        if (!data?.success || !Array.isArray(data?.data?.subtopics)) {
          setSubtopics([]);
          return;
        }
        setSubtopics(data.data.subtopics);
      } catch {
        if (!cancelled) setSubtopics([]);
      } finally {
        if (!cancelled) setSubtopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formTopicId]);

  useEffect(() => {
    if (authLoading || !allowed) return;
    setPage(1);
  }, [qDebounced, reviewFilter, visFilter, difficultyFilter, authLoading, allowed]);

  const loadMcqs = useCallback(async () => {
    if (!allowed) return;
    setListLoading(true);
    setListError('');
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      };
      if (qDebounced.trim()) params.q = qDebounced.trim();
      if (reviewFilter) params.reviewStatus = reviewFilter;
      if (visFilter) params.visibilityStatus = visFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;

      const { data } = await apiGet('/api/mcqs', { params });
      if (!data?.success || !Array.isArray(data?.data?.mcqs)) {
        throw new Error(data?.message || 'Failed to load MCQs.');
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
  }, [allowed, page, qDebounced, reviewFilter, visFilter, difficultyFilter]);

  useEffect(() => {
    loadMcqs();
  }, [loadMcqs]);

  const clearAdminFilters = useCallback(() => {
    setQInput('');
    setReviewFilter('');
    setVisFilter('');
    setDifficultyFilter('');
  }, []);

  useEffect(() => {
    if (!mcqs.length) return undefined;
    let cancelled = false;
    const sids = [...new Set(mcqs.map((m) => String(m.subjectId)))];
    const tids = [...new Set(mcqs.map((m) => String(m.topicId)))];
    (async () => {
      for (const sid of sids) {
        if (cancelled) break;
        try {
          const { data } = await apiGet('/api/taxonomy/topics', { params: { subjectId: sid } });
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
      for (const tid of tids) {
        if (cancelled) break;
        try {
          const { data } = await apiGet('/api/taxonomy/subtopics', { params: { topicId: tid } });
          if (!data?.success || !Array.isArray(data?.data?.subtopics)) continue;
          setSubtopicNameById((prev) => {
            const n = new Map(prev);
            for (const st of data.data.subtopics) {
              n.set(String(st._id), st.name);
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

  useEffect(() => {
    if (authLoading) return;
    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [authLoading, allowed, router]);

  function buildPayloadFromForm(form) {
    const tags = form.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const { options, correctAnswer } = buildOptionsPayload(form.optionTexts, form.correctIndex);
    const examMappings = (form.examMappings ?? [])
      .filter((m) => m.examBodyId && m.examTypeId)
      .map((m) => ({
        examBodyId: String(m.examBodyId).trim(),
        examTypeId: String(m.examTypeId).trim(),
      }));
    return {
      questionStem: form.questionStem.trim(),
      explanation: form.explanation.trim(),
      subjectId: form.subjectId.trim(),
      topicId: form.topicId.trim(),
      subtopicId: form.subtopicId.trim(),
      difficulty: form.difficulty,
      source: form.source.trim(),
      tags,
      reviewStatus: form.reviewStatus,
      visibilityStatus: form.visibilityStatus,
      isActive: form.isActive,
      examMappings,
      options,
      correctAnswer,
    };
  }

  async function submitCreate() {
    setCreateError('');
    setCreateBusy(true);
    try {
      const body = buildPayloadFromForm(createForm);
      const { data } = await apiPost('/api/mcqs', body);
      if (!data?.success) {
        setCreateError(data?.message || 'Create failed.');
        return;
      }
      setDrawerOpen(false);
      setCreateForm(emptyMcqFormState());
      await loadMcqs();
    } catch (e) {
      setCreateError(e?.response?.data?.message || e?.message || 'Create failed.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function openEdit(id) {
    setDrawerOpen(false);
    setEditId(id);
    setEditOpen(true);
    setEditError('');
    setEditLoadError('');
    setEditLoading(true);
    try {
      const { data } = await apiGet(`/api/mcqs/${encodeURIComponent(id)}`);
      if (!data?.success || !data?.data?.mcq) {
        setEditLoadError(data?.message || 'Could not load MCQ.');
        return;
      }
      setEditForm(mcqFormStateFromDoc(data.data.mcq));
      for (const m of data.data.mcq.examMappings ?? []) {
        const bid = String(m.examBodyId ?? '');
        if (bid) await loadExamTypesForBody(bid);
      }
    } catch (e) {
      setEditLoadError(e?.response?.data?.message || e?.message || 'Could not load MCQ.');
    } finally {
      setEditLoading(false);
    }
  }

  async function submitEdit() {
    if (!editId) return;
    setEditError('');
    setEditBusy(true);
    try {
      const body = buildPayloadFromForm(editForm);
      const { data } = await apiPatch(`/api/mcqs/${encodeURIComponent(editId)}`, body);
      if (!data?.success) {
        setEditError(data?.message || 'Update failed.');
        return;
      }
      const u = data.data?.mcq;
      if (u && typeof u === 'object') {
        const idStr = String(editId);
        setMcqs((prev) =>
          prev.map((m) => {
            if (String(m._id) !== idStr) return m;
            return {
              ...m,
              questionStem: u.questionStem ?? m.questionStem,
              subjectId: u.subjectId ?? m.subjectId,
              topicId: u.topicId ?? m.topicId,
              subtopicId: u.subtopicId ?? m.subtopicId,
              difficulty: u.difficulty ?? m.difficulty,
              reviewStatus: u.reviewStatus ?? m.reviewStatus,
              visibilityStatus: u.visibilityStatus ?? m.visibilityStatus,
              isActive: u.isActive !== undefined ? u.isActive : m.isActive,
              tags: Array.isArray(u.tags) ? u.tags : m.tags,
              updatedAt: u.updatedAt ?? m.updatedAt,
            };
          })
        );
        const sid = String(u.subjectId ?? '');
        const tid = String(u.topicId ?? '');
        const stid = String(u.subtopicId ?? '');
        if (sid) {
          const sname = subjects.find((s) => String(s._id) === sid)?.name;
          if (sname) setSubjectNameById((prev) => new Map(prev).set(sid, sname));
        }
        if (tid) {
          const tname = topics.find((t) => String(t._id) === tid)?.name;
          if (tname) setTopicNameById((prev) => new Map(prev).set(tid, tname));
        }
        if (stid) {
          const stname = subtopics.find((st) => String(st._id) === stid)?.name;
          if (stname) setSubtopicNameById((prev) => new Map(prev).set(stid, stname));
        }
      }
      setEditOpen(false);
      setEditId(null);
    } catch (e) {
      setEditError(e?.response?.data?.message || e?.message || 'Update failed.');
    } finally {
      setEditBusy(false);
    }
  }

  function closeEditDrawer() {
    if (editBusy) return;
    setEditOpen(false);
    setEditId(null);
    setEditLoadError('');
    setEditError('');
  }

  async function onDeactivate(id) {
    if (
      !window.confirm(
        'Deactivate this MCQ? It will be hidden from public lists and practice flows.'
      )
    ) {
      return;
    }
    try {
      const { data } = await apiDelete(`/api/mcqs/${encodeURIComponent(id)}`);
      if (!data?.success) {
        window.alert(data?.message || 'Delete failed.');
        return;
      }
      await loadMcqs();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Delete failed.');
    }
  }

  useEffect(() => {
    if (!bulkOpen) return;
    const raw = bulkText.trim();
    if (!raw) {
      setBulkParseError('');
      setBulkItems(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setBulkParseError('JSON must be an array of MCQ objects.');
        setBulkItems(null);
        return;
      }
      setBulkParseError('');
      setBulkItems(parsed);
    } catch {
      setBulkParseError('Invalid JSON.');
      setBulkItems(null);
    }
  }, [bulkText, bulkOpen]);

  async function submitBulk() {
    if (!bulkItems || !Array.isArray(bulkItems)) {
      return;
    }
    setBulkBusy(true);
    setBulkResult(null);
    try {
      const { data } = await apiPost('/api/mcqs/bulk', bulkItems);
      if (!data?.success) {
        setBulkResult({
          inserted: 0,
          errors: [{ index: -1, message: data?.message || 'Bulk import failed.' }],
        });
        return;
      }
      setBulkResult({
        inserted: data.data?.inserted ?? 0,
        errors: Array.isArray(data.data?.errors) ? data.data.errors : [],
      });
      await loadMcqs();
    } catch (e) {
      setBulkResult({
        inserted: 0,
        errors: [{ index: -1, message: e?.response?.data?.message || e?.message || 'Request failed.' }],
      });
    } finally {
      setBulkBusy(false);
    }
  }

  function onBulkFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setBulkText(text);
    };
    reader.readAsText(file);
  }

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-[#111111]">MCQ Bank</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                closeEditDrawer();
                setCreateForm(emptyMcqFormState());
                setCreateError('');
                setDrawerOpen(true);
              }}
              className="rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              + Add MCQ
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkOpen(true);
                setBulkText('');
                setBulkParseError('');
                setBulkItems(null);
                setBulkResult(null);
              }}
              className="rounded-full border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#111111] hover:bg-[#F9F9F9]"
            >
              Bulk Import
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4">
          <label className="min-w-[200px] flex-1 text-xs font-medium text-[#6B6B6B]">
            Search question
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Contains text…"
              className="mt-1 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none focus:border-[#111111]"
            />
          </label>
          <label className="w-full min-w-[140px] sm:w-44 text-xs font-medium text-[#6B6B6B]">
            Review status
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm"
            >
              {REVIEW_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="w-full min-w-[140px] sm:w-44 text-xs font-medium text-[#6B6B6B]">
            Visibility
            <select
              value={visFilter}
              onChange={(e) => setVisFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm"
            >
              {VIS_OPTIONS.map((o) => (
                <option key={o.value || 'all-v'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="w-full min-w-[120px] sm:w-40 text-xs font-medium text-[#6B6B6B]">
            Difficulty
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm"
            >
              {DIFF_OPTIONS.map((o) => (
                <option key={o.value || 'all-d'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {listError && !listLoading ? (
          <div className="mt-4 rounded-lg border border-[#E5E5E5] bg-white">
            <McqResultsError onRetry={() => loadMcqs()} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[#E5E5E5]">
          <table className="min-w-[900px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[12px] font-semibold uppercase tracking-wide text-[#6B6B6B]">
                <th className="px-3 py-3">Question</th>
                <th className="px-3 py-3">Subject</th>
                <th className="px-3 py-3">Topic</th>
                <th className="px-3 py-3">Difficulty</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Visibility</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody aria-busy={listLoading}>
              {listLoading ? (
                Array.from({ length: 8 }, (_, i) => <AdminMcqTableSkeletonRow key={i} />)
              ) : mcqs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <McqResultsEmpty onClearFilters={clearAdminFilters} />
                  </td>
                </tr>
              ) : (
                mcqs.map((mcq) => {
                  const sid = String(mcq.subjectId);
                  const tid = String(mcq.topicId);
                  const stid = String(mcq.subtopicId);
                  const subjectName = subjectNameById.get(sid) ?? '—';
                  const topicName = topicNameById.get(tid) ?? '—';
                  const subtopicName = subtopicNameById.get(stid);
                  const topicCell = subtopicName ? `${topicName} › ${subtopicName}` : topicName;
                  const created = mcq.createdAt
                    ? new Date(mcq.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—';
                  return (
                    <tr key={mcq._id} className="border-b border-[#E5E5E5] last:border-b-0 hover:bg-[#FAFAFA]">
                      <td className="max-w-[280px] px-3 py-2.5 font-medium text-[#111111]">
                        <Link href={`/mcqs/${mcq._id}`} className="hover:underline">
                          {truncate(mcq.questionStem, 60)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#6B6B6B]">{subjectName}</td>
                      <td className="max-w-[200px] px-3 py-2.5 text-[#6B6B6B]">{topicCell}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 capitalize">{mcq.difficulty ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{mcq.reviewStatus ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{mcq.visibilityStatus ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#6B6B6B]">{created}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(String(mcq._id))}
                            className="rounded p-2 text-[#111111] hover:bg-[#F0F0F0]"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              title="Deactivate"
                              onClick={() => onDeactivate(String(mcq._id))}
                              className="rounded p-2 text-[#6B6B6B] hover:bg-[#F0F0F0] hover:text-[#111111]"
                            >
                              <PowerOffIcon className="h-5 w-5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {!listError && !listLoading && total > PAGE_SIZE ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
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
              className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      {/* Create drawer */}
      <div
        className={`fixed inset-0 z-[60] transition ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/40 transition-opacity ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => !createBusy && setDrawerOpen(false)}
          aria-label="Close drawer"
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-[#E5E5E5] bg-white shadow-xl transition-transform duration-200 ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
            <h2 className="text-lg font-bold">Add MCQ</h2>
            <button
              type="button"
              disabled={createBusy}
              onClick={() => setDrawerOpen(false)}
              className="rounded p-2 text-[#6B6B6B] hover:bg-[#F5F5F5]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <McqFormBody
              form={createForm}
              setForm={setCreateForm}
              subjects={subjects}
              topics={topics}
              subtopics={subtopics}
              subjectsLoading={taxonomySubjectsLoading}
              topicsLoading={topicsLoading}
              subtopicsLoading={subtopicsLoading}
              examBodies={examBodies}
              examBodiesLoading={taxonomyExamBodiesLoading}
              examTypesByBody={examTypesByBody}
              loadExamTypesForBody={loadExamTypesForBody}
              submitError={createError}
              submitBusy={createBusy}
              submitLabel="Create MCQ"
              onSubmit={submitCreate}
              onCancel={() => !createBusy && setDrawerOpen(false)}
              radioGroupName="mcq-create-correct"
            />
          </div>
        </div>
      </div>

      {/* Edit drawer */}
      <div
        className={`fixed inset-0 z-[65] transition ${editOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!editOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/40 transition-opacity ${editOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeEditDrawer}
          aria-label="Close drawer"
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-[#E5E5E5] bg-white shadow-xl transition-transform duration-200 ${
            editOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
            <h2 className="text-lg font-bold">Edit MCQ</h2>
            <button
              type="button"
              disabled={editBusy}
              onClick={closeEditDrawer}
              className="rounded p-2 text-[#6B6B6B] hover:bg-[#F5F5F5] disabled:opacity-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {editLoading ? (
              <div className="py-12 text-center text-[#6B6B6B]">Loading…</div>
            ) : editLoadError ? (
              <p className="text-sm text-red-700">{editLoadError}</p>
            ) : (
              <McqFormBody
                form={editForm}
                setForm={setEditForm}
                subjects={subjects}
                topics={topics}
                subtopics={subtopics}
                subjectsLoading={taxonomySubjectsLoading}
                topicsLoading={topicsLoading}
                subtopicsLoading={subtopicsLoading}
                examBodies={examBodies}
                examBodiesLoading={taxonomyExamBodiesLoading}
                examTypesByBody={examTypesByBody}
                loadExamTypesForBody={loadExamTypesForBody}
                submitError={editError}
                submitBusy={editBusy}
                submitLabel="Save changes"
                onSubmit={submitEdit}
                onCancel={closeEditDrawer}
                radioGroupName={editId ? `mcq-edit-correct-${editId}` : 'mcq-edit-correct'}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bulk import */}
      {bulkOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => !bulkBusy && setBulkOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold">Bulk import MCQs</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">JSON array of MCQ objects (same shape as POST /api/mcqs).</p>

            <div
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-4 py-8 text-center text-sm text-[#6B6B6B] hover:border-[#111111]"
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onBulkFile(f);
              }}
              onClick={() => bulkFileRef.current?.click()}
              role="presentation"
            >
              <input
                ref={bulkFileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onBulkFile(f);
                }}
              />
              Drag and drop a JSON file here, or click to browse
            </div>

            <label className="mt-4 block text-xs font-medium text-[#6B6B6B]">
              Or paste JSON
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono text-xs text-[#111111]"
              />
            </label>

            {bulkParseError ? (
              <p className="mt-2 text-sm text-red-700">{bulkParseError}</p>
            ) : null}

            <p className="mt-3 text-sm text-[#111111]">
              {bulkItems && Array.isArray(bulkItems) ? (
                <>
                  <span className="font-semibold">{bulkItems.length}</span> item
                  {bulkItems.length === 1 ? '' : 's'} ready to import
                </>
              ) : (
                <span className="text-[#6B6B6B]">Enter valid JSON to see item count.</span>
              )}
            </p>

            {bulkResult ? (
              <div className="mt-4 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-sm">
                <p>
                  <span className="font-semibold text-green-800">{bulkResult.inserted}</span> inserted,{' '}
                  <span className="font-semibold text-red-800">{bulkResult.errors.length}</span> failed
                </p>
                {bulkResult.errors.length > 0 ? (
                  <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs text-red-900">
                    {bulkResult.errors.map((err, i) => (
                      <li key={i}>
                        {err.index >= 0 ? `#${err.index}: ` : ''}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={bulkBusy || !bulkItems?.length}
                onClick={submitBulk}
                className="rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {bulkBusy ? 'Submitting…' : 'Submit import'}
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setBulkOpen(false)}
                className="rounded-full border border-[#E5E5E5] px-4 py-2 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
