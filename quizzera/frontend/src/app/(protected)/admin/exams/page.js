'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ExamPageError } from '@/components/exam/ExamPageStates';
import { McqResultsEmpty } from '@/components/mcq/McqPageStates';
import { ActionConfirmModal } from '@/components/ui/ActionConfirmModal';
import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/Skeleton';

const ADMIN_EXAM_ROLES = new Set(['admin', 'superAdmin', 'contentManager']);
const CAN_EDIT_ROLES = new Set(['admin', 'superAdmin']);

const EXAM_TYPES = [
  'mock',
  'topic-quiz',
  'timed-practice',
  'dynamic',
  'weak-area',
  'sectional',
  'syllabus-weighted',
];

const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'];
const VISIBILITY = ['public', 'premium', 'hidden'];

const EMPTY_FORM = {
  title: '',
  description: '',
  examType: 'mock',
  examBodyId: '',
  examTypeId: '',
  subjectIds: [],
  topicIds: [],
  subtopicIds: [],
  difficulty: 'mixed',
  totalQuestions: 20,
  durationMinutes: 30,
  passingScore: 50,
  visibilityStatus: 'public',
  isActive: true,
};

function formatType(value) {
  return String(value)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function AdminExamsPage() {
  const router = useRouter();
  const { user, mongoUser, role } = useAuth();
  const displayRole = mongoUser?.role ?? role ?? '';
  const canAccess = ADMIN_EXAM_ROLES.has(displayRole);
  const canEdit = CAN_EDIT_ROLES.has(displayRole);

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [examBodies, setExamBodies] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!canAccess) router.replace('/dashboard');
  }, [user, canAccess, router]);

  const loadTaxonomyRoots = useCallback(async () => {
    try {
      const { data } = await apiGet('/api/taxonomy/exam-bodies');
      if (data?.success && Array.isArray(data?.data?.examBodies)) {
        setExamBodies(data.data.examBodies);
      }
    } catch {
      setExamBodies([]);
    }
  }, []);

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await apiGet('/api/exams', { params: { page: 1, limit: 200 } });
      if (!data?.success || !Array.isArray(data?.data?.exams)) {
        setExams([]);
        setError(true);
        return;
      }
      setExams(data.data.exams);
    } catch {
      setExams([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    loadTaxonomyRoots();
    loadExams();
  }, [canAccess, loadTaxonomyRoots, loadExams]);

  const loadExamTypes = useCallback(async (examBodyId) => {
    if (!examBodyId) {
      setExamTypes([]);
      return;
    }
    try {
      const { data } = await apiGet('/api/taxonomy/exam-types', {
        params: { examBodyId },
      });
      setExamTypes(data?.success && Array.isArray(data?.data?.examTypes) ? data.data.examTypes : []);
    } catch {
      setExamTypes([]);
    }
  }, []);

  const loadSubjects = useCallback(async (examBodyId) => {
    if (!examBodyId) {
      setSubjects([]);
      return;
    }
    try {
      const { data } = await apiGet('/api/taxonomy/subjects', { params: { examBodyId } });
      setSubjects(data?.success && Array.isArray(data?.data?.subjects) ? data.data.subjects : []);
    } catch {
      setSubjects([]);
    }
  }, []);

  const loadTopics = useCallback(async (subjectIds) => {
    if (!subjectIds?.length) {
      setTopics([]);
      return;
    }
    const byId = new Map();
    await Promise.all(
      subjectIds.map(async (sid) => {
        try {
          const { data } = await apiGet('/api/taxonomy/topics', { params: { subjectId: sid } });
          if (!data?.success || !Array.isArray(data?.data?.topics)) return;
          for (const t of data.data.topics) byId.set(String(t._id), t);
        } catch {
          /* skip */
        }
      })
    );
    setTopics([...byId.values()].sort((a, b) => String(a.name).localeCompare(String(b.name))));
  }, []);

  const loadSubtopics = useCallback(async (topicIds) => {
    if (!topicIds?.length) {
      setSubtopics([]);
      return;
    }
    const byId = new Map();
    await Promise.all(
      topicIds.map(async (tid) => {
        try {
          const { data } = await apiGet('/api/taxonomy/subtopics', { params: { topicId: tid } });
          if (!data?.success || !Array.isArray(data?.data?.subtopics)) return;
          for (const s of data.data.subtopics) byId.set(String(s._id), s);
        } catch {
          /* skip */
        }
      })
    );
    setSubtopics([...byId.values()].sort((a, b) => String(a.name).localeCompare(String(b.name))));
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setTopics([]);
    setSubtopics([]);
    setDrawerOpen(true);
  };

  const openEdit = (exam) => {
    setEditingId(String(exam._id));
    setForm({
      title: exam.title ?? '',
      description: exam.description ?? '',
      examType: exam.examType ?? 'mock',
      examBodyId: exam.examBodyId ? String(exam.examBodyId) : '',
      examTypeId: exam.examTypeId ? String(exam.examTypeId) : '',
      subjectIds: (exam.subjectIds ?? []).map((id) => String(id)),
      topicIds: (exam.topicIds ?? []).map((id) => String(id)),
      subtopicIds: (exam.subtopicIds ?? []).map((id) => String(id)),
      difficulty: exam.difficulty ?? 'mixed',
      totalQuestions: Number(exam.totalQuestions) || 20,
      durationMinutes: Number(exam.durationMinutes) || 30,
      passingScore: Number(exam.passingScore) ?? 50,
      visibilityStatus: exam.visibilityStatus ?? 'public',
      isActive: exam.isActive !== false,
    });
    setFormError('');
    setDrawerOpen(true);
    if (exam.examBodyId) {
      loadExamTypes(String(exam.examBodyId));
      loadSubjects(String(exam.examBodyId));
    }
    if (exam.subjectIds?.length) {
      loadTopics((exam.subjectIds ?? []).map((id) => String(id)));
    }
    if (exam.topicIds?.length) {
      loadSubtopics((exam.topicIds ?? []).map((id) => String(id)));
    }
  };

  const toggleId = (field, id) => {
    const key = String(id);
    setForm((prev) => {
      const set = new Set(prev[field]);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [field]: [...set] };
    });
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    examType: form.examType,
    examBodyId: form.examBodyId || undefined,
    examTypeId: form.examTypeId || undefined,
    subjectIds: form.subjectIds,
    topicIds: form.topicIds,
    subtopicIds: form.subtopicIds,
    difficulty: form.difficulty,
    totalQuestions: Number(form.totalQuestions),
    durationMinutes: Number(form.durationMinutes),
    passingScore: Number(form.passingScore),
    visibilityStatus: form.visibilityStatus,
    isActive: form.isActive,
  });

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    if (form.topicIds.length === 0 && form.subtopicIds.length === 0) {
      setFormError(
        'Select at least one topic (all subtopics under it are used automatically) or pick subtopics manually.'
      );
      setSaving(false);
      return;
    }
    try {
      const payload = buildPayload();
      if (editingId) {
        if (!canEdit) {
          setFormError('You do not have permission to edit exams.');
          return;
        }
        const { data } = await apiPatch(`/api/exams/${editingId}`, payload);
        if (!data?.success) {
          setFormError(data?.message || 'Could not update exam.');
          return;
        }
      } else {
        const { data } = await apiPost('/api/exams', payload);
        if (!data?.success) {
          setFormError(data?.message || 'Could not create exam.');
          return;
        }
      }
      setDrawerOpen(false);
      await loadExams();
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget || !canEdit) return;
    setDeactivating(true);
    try {
      await apiDelete(`/api/exams/${deactivateTarget._id}`);
      setDeactivateTarget(null);
      await loadExams();
    } catch {
      /* alert handled by modal staying open - user can retry */
    } finally {
      setDeactivating(false);
    }
  };

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [exams]
  );

  if (!user || !canAccess) {
    return <PageLoader />;
  }

  const inputClass =
    'mt-1 w-full rounded border border-[#E5E5E5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-[#111111]';

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#111111]">Admin: Exams</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Create predefined exam templates. Students only start exams — they never configure them here.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#333333]"
        >
          + Add exam
        </button>
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height="56px" width="100%" borderRadius="8px" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8">
          <ExamPageError onRetry={loadExams} />
        </div>
      ) : sortedExams.length === 0 ? (
        <div className="mt-8">
          <McqResultsEmpty onClearFilters={() => loadExams()} />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[12px] border border-[#E5E5E5] bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wide text-[#6B6B6B]">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExams.map((exam) => (
                <tr key={String(exam._id)} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-4 py-3 font-medium text-[#111111]">{exam.title}</td>
                  <td className="px-4 py-3 capitalize text-[#6B6B6B]">{formatType(exam.examType)}</td>
                  <td className="px-4 py-3 text-[#6B6B6B]">
                    {exam.totalQuestions} · {exam.durationMinutes}m
                  </td>
                  <td className="px-4 py-3 capitalize text-[#6B6B6B]">{exam.visibilityStatus}</td>
                  <td className="px-4 py-3">{exam.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(exam)}
                            className="text-xs font-semibold text-[#111111] underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeactivateTarget(exam)}
                            className="text-xs font-semibold text-[#6B6B6B] underline"
                          >
                            Deactivate
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-[#6B6B6B]">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#111111]">
              {editingId ? 'Edit exam' : 'New exam'}
            </h2>
            <div className="mt-6 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                Exam type
                <select
                  value={form.examType}
                  onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value }))}
                  className={inputClass}
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {formatType(t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                Exam body
                <select
                  value={form.examBodyId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setForm((f) => ({
                      ...f,
                      examBodyId: id,
                      examTypeId: '',
                      subjectIds: [],
                      topicIds: [],
                      subtopicIds: [],
                    }));
                    loadExamTypes(id);
                    loadSubjects(id);
                    setTopics([]);
                    setSubtopics([]);
                  }}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {examBodies.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                Exam type (taxonomy)
                <select
                  value={form.examTypeId}
                  onChange={(e) => setForm((f) => ({ ...f, examTypeId: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {examTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-[#111111]">
                  Subjects
                </legend>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                  {subjects.map((s) => (
                    <li key={s._id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.subjectIds.includes(String(s._id))}
                          onChange={() => {
                            const key = String(s._id);
                            setForm((f) => {
                              const nextSubjects = f.subjectIds.includes(key)
                                ? f.subjectIds.filter((id) => id !== key)
                                : [...f.subjectIds, key];
                              loadTopics(nextSubjects);
                              return {
                                ...f,
                                subjectIds: nextSubjects,
                                topicIds: [],
                                subtopicIds: [],
                              };
                            });
                          }}
                        />
                        {s.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-[#111111]">
                  Topics
                </legend>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                  {topics.map((t) => (
                    <li key={t._id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.topicIds.includes(String(t._id))}
                          onChange={() => {
                            const key = String(t._id);
                            setForm((f) => {
                              const nextTopics = f.topicIds.includes(key)
                                ? f.topicIds.filter((id) => id !== key)
                                : [...f.topicIds, key];
                              loadSubtopics(nextTopics);
                              return { ...f, topicIds: nextTopics, subtopicIds: [] };
                            });
                          }}
                        />
                        {t.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <fieldset>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-[#111111]">
                    Subtopics
                  </legend>
                  {subtopics.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          subtopicIds: subtopics.map((s) => String(s._id)),
                        }))
                      }
                      className="text-xs font-semibold text-[#111111] underline-offset-2 hover:underline"
                    >
                      Select all
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[#6B6B6B]">
                  Optional if topics are selected — all subtopics under those topics are used when you save.
                </p>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                  {subtopics.map((s) => (
                    <li key={s._id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.subtopicIds.includes(String(s._id))}
                          onChange={() => toggleId('subtopicIds', s._id)}
                        />
                        {s.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                  Difficulty
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                    className={inputClass}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                  Visibility
                  <select
                    value={form.visibilityStatus}
                    onChange={(e) => setForm((f) => ({ ...f, visibilityStatus: e.target.value }))}
                    className={inputClass}
                  >
                    {VISIBILITY.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                  Questions
                  <input
                    type="number"
                    min={1}
                    value={form.totalQuestions}
                    onChange={(e) => setForm((f) => ({ ...f, totalQuestions: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                  Duration (min)
                  <input
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#111111]">
                  Passing %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.passingScore}
                    onChange={(e) => setForm((f) => ({ ...f, passingScore: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
            </div>
            {formError ? (
              <p className="mt-4 text-sm text-red-700">{formError}</p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-full bg-[#111111] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full border-2 border-[#111111] px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ActionConfirmModal
        open={Boolean(deactivateTarget)}
        onClose={() => !deactivating && setDeactivateTarget(null)}
        title="Deactivate exam?"
        description={`"${deactivateTarget?.title ?? 'Exam'}" will be hidden from students.`}
        confirmLabel="Deactivate"
        tone="warning"
        confirmBusy={deactivating}
        onConfirm={handleDeactivate}
      />
    </main>
  );
}
