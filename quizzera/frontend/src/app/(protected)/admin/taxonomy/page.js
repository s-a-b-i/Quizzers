'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';

function ExplorerRow({
  label,
  selected,
  onSelect,
  editing,
  editValue,
  onEditChange,
  onEditSave,
  onEditCancel,
  onEditClick,
  active,
  onActiveChange,
  busy,
  disableActive,
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex cursor-pointer flex-col gap-2 border-b border-border px-3 py-2.5 text-left text-sm text-primary outline-none transition-colors last:border-b-0 ${
        selected
          ? 'border-l-[3px] border-l-primary bg-surface pl-[9px]'
          : 'border-l-[3px] border-l-transparent pl-3'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        {editing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-primary outline-none focus:border-primary"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-0">
        {editing ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onEditSave();
              }}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-surface disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onEditCancel();
              }}
              className="rounded-full px-3 py-1 text-xs font-medium text-secondary hover:text-primary disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onEditClick();
            }}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-surface disabled:opacity-50"
          >
            Edit
          </button>
        )}
        <label
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-secondary"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-border text-primary accent-primary"
            checked={active}
            disabled={busy || disableActive || editing}
            onChange={(e) => onActiveChange(e.target.checked)}
          />
          Active
        </label>
      </div>
    </div>
  );
}

function TaxonomyFlowGuide({ selectedBody, selectedType }) {
  const steps = [
    {
      key: 'body',
      n: '1',
      title: 'Exam body',
      caption: 'Click a row to select · black bar = active',
      active: !!selectedBody,
    },
    {
      key: 'type',
      n: '2',
      title: 'Exam type',
      caption: selectedBody ? `Under ${selectedBody.name}` : 'Opens after a body is selected',
      active: !!selectedType,
    },
    {
      key: 'subject',
      n: '3',
      title: 'Subjects',
      caption:
        selectedBody && selectedType
          ? `Add under ${selectedBody.name} × ${selectedType.name}`
          : 'Opens after a type is selected',
      active: !!(selectedBody && selectedType),
    },
  ];

  return (
    <div
      className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-0 sm:rounded-xl sm:border sm:border-border sm:shadow-soft"
      role="region"
      aria-label="Taxonomy workflow"
    >
      {steps.map((s, i) => (
        <div
          key={s.key}
          className={`flex gap-3 rounded-xl border border-border p-3 sm:rounded-none sm:border-0 sm:p-4 ${
            i > 0 ? 'sm:border-l sm:border-border' : ''
          } ${s.active ? 'bg-surface' : 'bg-background'}`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
              s.active ? 'bg-primary text-inverse' : 'border border-border text-primary'
            }`}
            aria-hidden
          >
            {s.n}
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold tracking-tight text-primary">{s.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-secondary">{s.caption}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ColumnShell({ title, action, children }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-background px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">{title}</h2>
          {action}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-background">{children}</div>
    </section>
  );
}

export default function AdminTaxonomyPage() {
  const router = useRouter();
  const { user: fbUser, mongoUser, role, loading: authLoading } = useAuth();
  const effectiveRole = mongoUser?.role ?? role;
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'superAdmin';

  const [examBodies, setExamBodies] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedBodySlug, setSelectedBodySlug] = useState(null);
  const [selectedTypeSlug, setSelectedTypeSlug] = useState(null);
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState(null);

  const [loadingBodies, setLoadingBodies] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [error, setError] = useState('');

  const [addBodyName, setAddBodyName] = useState('');
  const [addTypeName, setAddTypeName] = useState('');
  const [addSubjectName, setAddSubjectName] = useState('');
  const [showAddBody, setShowAddBody] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [busySlug, setBusySlug] = useState(null);

  const selectedBody = useMemo(
    () => examBodies.find((b) => b.slug === selectedBodySlug) ?? null,
    [examBodies, selectedBodySlug]
  );
  const selectedType = useMemo(
    () => examTypes.find((t) => t.slug === selectedTypeSlug) ?? null,
    [examTypes, selectedTypeSlug]
  );

  const handleAuthError = useCallback(
    (e) => {
      if (e?.response?.status === 403) {
        router.replace('/dashboard');
        return true;
      }
      return false;
    },
    [router]
  );

  const loadBodies = useCallback(async () => {
    if (!fbUser || !isAdmin) return;
    setError('');
    setLoadingBodies(true);
    try {
      const { data } = await apiGet('/api/taxonomy/exam-bodies', {
        params: { includeInactive: 'true' },
      });
      if (!data?.success || !Array.isArray(data?.data?.examBodies)) {
        throw new Error(data?.message || 'Could not load exam bodies.');
      }
      setExamBodies(data.data.examBodies);
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e?.response?.data?.message || e?.message || 'Failed to load exam bodies.');
      setExamBodies([]);
    } finally {
      setLoadingBodies(false);
    }
  }, [fbUser, isAdmin, handleAuthError]);

  const loadTypes = useCallback(
    async (examBodyId) => {
      if (!fbUser || !isAdmin || !examBodyId) {
        setExamTypes([]);
        return;
      }
      setError('');
      setLoadingTypes(true);
      try {
        const { data } = await apiGet('/api/taxonomy/exam-types', {
          params: { examBodyId, includeInactive: 'true' },
        });
        if (!data?.success || !Array.isArray(data?.data?.examTypes)) {
          throw new Error(data?.message || 'Could not load exam types.');
        }
        setExamTypes(data.data.examTypes);
      } catch (e) {
        if (handleAuthError(e)) return;
        setError(e?.response?.data?.message || e?.message || 'Failed to load exam types.');
        setExamTypes([]);
      } finally {
        setLoadingTypes(false);
      }
    },
    [fbUser, isAdmin, handleAuthError]
  );

  const loadSubjects = useCallback(
    async (examBodyId, examTypeId) => {
      if (!fbUser || !isAdmin || !examBodyId || !examTypeId) {
        setSubjects([]);
        return;
      }
      setError('');
      setLoadingSubjects(true);
      try {
        const { data } = await apiGet('/api/taxonomy/subjects', {
          params: { examBodyId, examTypeId, includeInactive: 'true' },
        });
        if (!data?.success || !Array.isArray(data?.data?.subjects)) {
          throw new Error(data?.message || 'Could not load subjects.');
        }
        setSubjects(data.data.subjects);
      } catch (e) {
        if (handleAuthError(e)) return;
        setError(e?.response?.data?.message || e?.message || 'Failed to load subjects.');
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    },
    [fbUser, isAdmin, handleAuthError]
  );

  useEffect(() => {
    if (!authLoading && fbUser && mongoUser && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, fbUser, mongoUser, isAdmin, router]);

  useEffect(() => {
    if (!authLoading && fbUser && mongoUser && isAdmin) {
      loadBodies();
    }
  }, [authLoading, fbUser, mongoUser, isAdmin, loadBodies]);

  useEffect(() => {
    if (!selectedBody?._id) {
      setExamTypes([]);
      setSelectedTypeSlug(null);
      setSubjects([]);
      setSelectedSubjectSlug(null);
      return;
    }
    loadTypes(selectedBody._id);
    setSelectedTypeSlug(null);
    setSubjects([]);
    setSelectedSubjectSlug(null);
  }, [selectedBody, loadTypes]);

  useEffect(() => {
    if (!selectedBody?._id || !selectedType?._id) {
      setSubjects([]);
      setSelectedSubjectSlug(null);
      return;
    }
    loadSubjects(selectedBody._id, selectedType._id);
    setSelectedSubjectSlug(null);
  }, [selectedBody, selectedType, loadSubjects]);

  const setBusy = (slug, v) => setBusySlug(v ? slug : null);

  async function patchBySlug(resource, slug, body) {
    setBusy(slug, true);
    setError('');
    try {
      const { data } = await apiPatch(`/api/taxonomy/${resource}/${encodeURIComponent(slug)}`, body);
      if (!data?.success) {
        throw new Error(data?.message || 'Update failed.');
      }
      return data.data;
    } catch (e) {
      if (handleAuthError(e)) return null;
      setError(e?.response?.data?.message || e?.message || 'Update failed.');
      return null;
    } finally {
      setBusy(slug, false);
    }
  }

  async function handleRename(resource, slug, name, reload) {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return;
    }
    const res = await patchBySlug(resource, slug, { name: trimmed });
    if (res) {
      let newSlug = null;
      if (resource === 'exam-bodies' && res.examBody) newSlug = res.examBody.slug;
      if (resource === 'exam-types' && res.examType) newSlug = res.examType.slug;
      if (resource === 'subjects' && res.subject) newSlug = res.subject.slug;
      if (newSlug && newSlug !== slug) {
        if (resource === 'exam-bodies' && selectedBodySlug === slug) setSelectedBodySlug(newSlug);
        if (resource === 'exam-types' && selectedTypeSlug === slug) setSelectedTypeSlug(newSlug);
        if (resource === 'subjects' && selectedSubjectSlug === slug) setSelectedSubjectSlug(newSlug);
      }
      await reload();
    }
    setEditing(null);
    setEditDraft('');
  }

  async function handleActiveToggle(resource, slug, nextActive, onLocalListUpdate) {
    const res = await patchBySlug(resource, slug, { isActive: nextActive });
    if (!res) return;
    if (!nextActive) {
      onLocalListUpdate((list) => list.filter((x) => x.slug !== slug));
      if (resource === 'exam-bodies' && selectedBodySlug === slug) {
        setSelectedBodySlug(null);
      }
      if (resource === 'exam-types' && selectedTypeSlug === slug) {
        setSelectedTypeSlug(null);
      }
      if (resource === 'subjects' && selectedSubjectSlug === slug) {
        setSelectedSubjectSlug(null);
      }
    } else {
      await loadBodies();
      if (selectedBody?._id) await loadTypes(selectedBody._id);
      if (selectedBody?._id && selectedType?._id) {
        await loadSubjects(selectedBody._id, selectedType._id);
      }
    }
  }

  async function createExamBody() {
    const name = addBodyName.trim();
    if (!name) {
      setError('Enter a name for the exam body.');
      return;
    }
    setError('');
    setBusy('__add_body', true);
    try {
      const { data } = await apiPost('/api/taxonomy/exam-bodies', {
        name,
        description: '',
        country: '',
        tags: [],
      });
      if (!data?.success || !data?.data?.examBody) {
        throw new Error(data?.message || 'Create failed.');
      }
      setAddBodyName('');
      setShowAddBody(false);
      await loadBodies();
      const slug = data.data.examBody.slug;
      if (slug) setSelectedBodySlug(slug);
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e?.response?.data?.message || e?.message || 'Create failed.');
    } finally {
      setBusy('__add_body', false);
    }
  }

  async function createExamType() {
    if (!selectedBody?._id) return;
    const name = addTypeName.trim();
    if (!name) {
      setError('Enter a name for the exam type.');
      return;
    }
    setError('');
    setBusy('__add_type', true);
    try {
      const { data } = await apiPost('/api/taxonomy/exam-types', {
        name,
        examBodyId: selectedBody._id,
        description: '',
      });
      if (!data?.success || !data?.data?.examType) {
        throw new Error(data?.message || 'Create failed.');
      }
      setAddTypeName('');
      setShowAddType(false);
      await loadTypes(selectedBody._id);
      const slug = data.data.examType.slug;
      if (slug) setSelectedTypeSlug(slug);
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e?.response?.data?.message || e?.message || 'Create failed.');
    } finally {
      setBusy('__add_type', false);
    }
  }

  async function createSubject() {
    if (!selectedBody?._id || !selectedType?._id) return;
    const name = addSubjectName.trim();
    if (!name) {
      setError('Enter a name for the subject.');
      return;
    }
    setError('');
    setBusy('__add_subject', true);
    try {
      const { data } = await apiPost('/api/taxonomy/subjects', {
        name,
        examBodyId: selectedBody._id,
        examTypeId: selectedType._id,
        description: '',
        tags: [],
        weightage: 0,
      });
      if (!data?.success || !data?.data?.subject) {
        throw new Error(data?.message || 'Create failed.');
      }
      setAddSubjectName('');
      setShowAddSubject(false);
      await loadSubjects(selectedBody._id, selectedType._id);
      const slug = data.data.subject.slug;
      if (slug) setSelectedSubjectSlug(slug);
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e?.response?.data?.message || e?.message || 'Create failed.');
    } finally {
      setBusy('__add_subject', false);
    }
  }

  if (authLoading || !fbUser) {
    return <PageLoader />;
  }

  if (!mongoUser || !isAdmin) {
    return null;
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 text-primary md:px-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Admin: Taxonomy</h1>
        <p className="mt-1 text-sm text-secondary">
          Exam bodies, types, and subjects. Changes apply to the live taxonomy service.
        </p>
      </header>

      <TaxonomyFlowGuide selectedBody={selectedBody} selectedType={selectedType} />

      {error ? (
        <div
          className="mb-4 rounded border border-border bg-surface px-4 py-3 text-sm text-primary"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid min-h-[min(70vh,560px)] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-background shadow-soft md:grid-cols-3 md:divide-x md:divide-y-0">
        <ColumnShell
          title="Exam bodies"
          action={
            <button
              type="button"
              onClick={() => setShowAddBody((v) => !v)}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-surface"
            >
              {showAddBody ? 'Close' : 'Add'}
            </button>
          }
        >
          {showAddBody ? (
            <div className="border-b border-border bg-surface px-3 py-3">
              <input
                type="text"
                value={addBodyName}
                onChange={(e) => setAddBodyName(e.target.value)}
                placeholder="New exam body name"
                className="mb-2 w-full rounded border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busySlug === '__add_body'}
                  onClick={createExamBody}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-inverse hover:bg-primary-hover disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          ) : null}
          {loadingBodies ? (
            <p className="px-3 py-6 text-sm text-secondary">Loading…</p>
          ) : examBodies.length === 0 ? (
            <p className="px-3 py-6 text-sm text-secondary">No exam bodies yet.</p>
          ) : (
            examBodies.map((b) => (
              <ExplorerRow
                key={b.slug}
                label={b.name}
                selected={selectedBodySlug === b.slug}
                onSelect={() => setSelectedBodySlug(b.slug)}
                editing={editing?.kind === 'body' && editing.slug === b.slug}
                editValue={editDraft}
                onEditChange={setEditDraft}
                onEditSave={() => handleRename('exam-bodies', b.slug, editDraft, loadBodies)}
                onEditCancel={() => {
                  setEditing(null);
                  setEditDraft('');
                }}
                onEditClick={() => {
                  setEditing({ kind: 'body', slug: b.slug });
                  setEditDraft(b.name);
                }}
                active={b.isActive !== false}
                onActiveChange={(checked) =>
                  handleActiveToggle('exam-bodies', b.slug, checked, setExamBodies)
                }
                busy={busySlug === b.slug}
                disableActive={false}
              />
            ))
          )}
        </ColumnShell>

        <ColumnShell
          title="Exam types"
          action={
            <button
              type="button"
              disabled={!selectedBody}
              onClick={() => setShowAddType((v) => !v)}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              {showAddType ? 'Close' : 'Add'}
            </button>
          }
        >
          {!selectedBody ? (
            <p className="px-3 py-6 text-sm text-secondary">
              Click an exam body in column 1 to enable this column.
            </p>
          ) : (
            <>
              {showAddType ? (
                <div className="border-b border-border bg-surface px-3 py-3">
                  <input
                    type="text"
                    value={addTypeName}
                    onChange={(e) => setAddTypeName(e.target.value)}
                    placeholder="New exam type name"
                    className="mb-2 w-full rounded border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    disabled={busySlug === '__add_type'}
                    onClick={createExamType}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-inverse hover:bg-primary-hover disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              ) : null}
              {loadingTypes ? (
                <p className="px-3 py-6 text-sm text-secondary">Loading…</p>
              ) : examTypes.length === 0 ? (
                <p className="px-3 py-6 text-sm text-secondary">No exam types for this body.</p>
              ) : (
                examTypes.map((t) => (
                  <ExplorerRow
                    key={t.slug}
                    label={t.name}
                    selected={selectedTypeSlug === t.slug}
                    onSelect={() => setSelectedTypeSlug(t.slug)}
                    editing={editing?.kind === 'type' && editing.slug === t.slug}
                    editValue={editDraft}
                    onEditChange={setEditDraft}
                    onEditSave={() =>
                      handleRename('exam-types', t.slug, editDraft, () =>
                        loadTypes(selectedBody._id)
                      )
                    }
                    onEditCancel={() => {
                      setEditing(null);
                      setEditDraft('');
                    }}
                    onEditClick={() => {
                      setEditing({ kind: 'type', slug: t.slug });
                      setEditDraft(t.name);
                    }}
                    active={t.isActive !== false}
                    onActiveChange={(checked) =>
                      handleActiveToggle('exam-types', t.slug, checked, setExamTypes)
                    }
                    busy={busySlug === t.slug}
                    disableActive={false}
                  />
                ))
              )}
            </>
          )}
        </ColumnShell>

        <ColumnShell
          title="Subjects"
          action={
            <button
              type="button"
              disabled={!selectedType}
              onClick={() => setShowAddSubject((v) => !v)}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              {showAddSubject ? 'Close' : 'Add'}
            </button>
          }
        >
          {!selectedType ? (
            <p className="px-3 py-6 text-sm text-secondary">
              Click an exam type in column 2 to attach new subjects to that type.
            </p>
          ) : (
            <>
              {showAddSubject ? (
                <div className="border-b border-border bg-surface px-3 py-3">
                  <input
                    type="text"
                    value={addSubjectName}
                    onChange={(e) => setAddSubjectName(e.target.value)}
                    placeholder="New subject name"
                    className="mb-2 w-full rounded border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    disabled={busySlug === '__add_subject'}
                    onClick={createSubject}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-inverse hover:bg-primary-hover disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              ) : null}
              {loadingSubjects ? (
                <p className="px-3 py-6 text-sm text-secondary">Loading…</p>
              ) : subjects.length === 0 ? (
                <p className="px-3 py-6 text-sm text-secondary">No subjects for this type.</p>
              ) : (
                subjects.map((s) => (
                  <ExplorerRow
                    key={s.slug}
                    label={s.name}
                    selected={selectedSubjectSlug === s.slug}
                    onSelect={() => setSelectedSubjectSlug(s.slug)}
                    editing={editing?.kind === 'subject' && editing.slug === s.slug}
                    editValue={editDraft}
                    onEditChange={setEditDraft}
                    onEditSave={() =>
                      handleRename('subjects', s.slug, editDraft, () =>
                        loadSubjects(selectedBody._id, selectedType._id)
                      )
                    }
                    onEditCancel={() => {
                      setEditing(null);
                      setEditDraft('');
                    }}
                    onEditClick={() => {
                      setEditing({ kind: 'subject', slug: s.slug });
                      setEditDraft(s.name);
                    }}
                    active={s.isActive !== false}
                    onActiveChange={(checked) =>
                      handleActiveToggle('subjects', s.slug, checked, setSubjects)
                    }
                    busy={busySlug === s.slug}
                    disableActive={false}
                  />
                ))
              )}
            </>
          )}
        </ColumnShell>
      </div>
    </main>
  );
}
