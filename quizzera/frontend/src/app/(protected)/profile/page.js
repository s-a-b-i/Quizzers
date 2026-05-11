'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { displaySerif } from '@/lib/fonts';
import { PageLoader } from '@/components/ui/PageLoader';
import { SectionLoader } from '@/components/ui/SectionLoader';

const inputClass =
  'h-[52px] w-full rounded-full border border-border bg-background px-5 text-sm text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_0_0_3px_rgba(17,17,17,0.06)] focus:ring-0';

const sectionHeadingClass =
  'text-[14px] font-bold uppercase tracking-[0.2em] text-primary';

function flattenPreferences(obj, prefix = '') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const rows = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      rows.push(...flattenPreferences(v, path));
    } else {
      rows.push({
        key: path,
        value: typeof v === 'string' ? v : JSON.stringify(v),
      });
    }
  }
  return rows;
}

function parseCellValue(str) {
  const t = String(str).trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t !== '' && !Number.isNaN(Number(t)) && String(Number(t)) === t) return Number(t);
  try {
    if (
      (t.startsWith('{') && t.endsWith('}')) ||
      (t.startsWith('[') && t.endsWith(']'))
    ) {
      return JSON.parse(t);
    }
  } catch {
    /* keep string */
  }
  return str;
}

function unflattenPreferenceRows(rows) {
  const out = {};
  for (const { key, value } of rows) {
    const k = String(key).trim();
    if (!k) continue;
    const parts = k.split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
        cur[p] = {};
      }
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = parseCellValue(value);
  }
  return out;
}

/** Deep-merge `source` into `target` (mutates target). Used so PATCH matches API shallow merge at root without wiping sibling nested keys. */
function deepMergePreferences(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
  for (const [k, v] of Object.entries(source)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) {
        target[k] = {};
      }
      deepMergePreferences(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

export default function ProfilePage() {
  const { user: fbUser, loading: authLoading } = useAuth();

  const [me, setMe] = useState(null);
  const [prefRows, setPrefRows] = useState([{ key: '', value: '' }]);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [fetching, setFetching] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!fbUser) return;
    setLoadError('');
    setFetching(true);
    try {
      const { data } = await apiGet('/api/users/me');
      if (!data?.success || !data?.data?.user) {
        throw new Error(data?.message || 'Could not load profile.');
      }
      const u = data.data.user;
      setMe(u);
      const prefs = u.preferences && typeof u.preferences === 'object' ? u.preferences : {};
      const flat = flattenPreferences(prefs);
      setPrefRows(flat.length > 0 ? flat : [{ key: '', value: '' }]);
    } catch (e) {
      setLoadError(e?.response?.data?.message || e?.message || 'Failed to load profile.');
      setMe(null);
    } finally {
      setFetching(false);
    }
  }, [fbUser]);

  useEffect(() => {
    if (!authLoading && fbUser) {
      loadProfile();
    }
  }, [authLoading, fbUser, loadProfile]);

  function updateRow(i, field, v) {
    setPrefRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: v };
      return next;
    });
    setSavedFlash(false);
  }

  function addRow() {
    setPrefRows((prev) => [...prev, { key: '', value: '' }]);
    setSavedFlash(false);
  }

  function removeRow(i) {
    setPrefRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
    setSavedFlash(false);
  }

  async function onSave(e) {
    e.preventDefault();
    setSaveError('');
    setSavedFlash(false);
    setSaving(true);
    try {
      const partial = unflattenPreferenceRows(prefRows);
      const base =
        me?.preferences && typeof me.preferences === 'object'
          ? structuredClone(me.preferences)
          : {};
      const preferences = deepMergePreferences(base, partial);
      const { data } = await apiPatch('/api/users/me', { preferences });
      if (!data?.success || !data?.data?.user) {
        throw new Error(data?.message || 'Save failed.');
      }
      const u = data.data.user;
      setMe(u);
      const prefs = u.preferences && typeof u.preferences === 'object' ? u.preferences : {};
      const flat = flattenPreferences(prefs);
      setPrefRows(flat.length > 0 ? flat : [{ key: '', value: '' }]);
      setSavedFlash(true);
    } catch (e) {
      setSaveError(e?.response?.data?.message || e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return <PageLoader />;
  }

  if (!fbUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <main className="mx-auto max-w-[600px] px-5 py-10 sm:px-8">
        <h1
          className={`${displaySerif.className} text-center text-2xl font-semibold tracking-[-0.02em] text-primary sm:text-[1.75rem]`}
        >
          Profile
        </h1>

        {fetching ? <SectionLoader /> : null}

        {loadError ? (
          <p className="mt-6 text-center text-sm text-primary" role="alert">
            {loadError}
          </p>
        ) : null}

        {!fetching && me ? (
          <div className="mt-10 space-y-10">
            <section>
              <h2 className={sectionHeadingClass}>Account</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="profile-email" className="mb-2 block text-xs text-secondary">
                    Email
                  </label>
                  <input
                    id="profile-email"
                    readOnly
                    value={me.email ?? ''}
                    className={`${inputClass} cursor-default bg-surface text-primary`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-secondary">Role</span>
                  <span className="inline-flex rounded-full bg-primary px-3 py-1.5 text-xs font-semibold capitalize text-inverse">
                    {me.role ? String(me.role) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-secondary">Account status</span>
                  <p className="mt-1 text-sm font-medium capitalize text-primary">
                    {me.accountStatus ?? '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-secondary">Onboarding</span>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {me.onboardingCompleted ? 'Completed' : 'Not completed'}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className={sectionHeadingClass}>Preferences</h2>
              <form className="mt-4 space-y-4" onSubmit={onSave}>
                {prefRows.map((row, i) => (
                  <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <label className="mb-2 block text-xs text-secondary" htmlFor={`pref-k-${i}`}>
                        Key
                      </label>
                      <input
                        id={`pref-k-${i}`}
                        type="text"
                        value={row.key}
                        onChange={(e) => updateRow(i, 'key', e.target.value)}
                        placeholder="e.g. theme or onboarding.targetExamId"
                        className={inputClass}
                        autoComplete="off"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="mb-2 block text-xs text-secondary" htmlFor={`pref-v-${i}`}>
                        Value
                      </label>
                      <input
                        id={`pref-v-${i}`}
                        type="text"
                        value={row.value}
                        onChange={(e) => updateRow(i, 'value', e.target.value)}
                        placeholder="Value or JSON for objects/arrays"
                        className={inputClass}
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="mt-7 shrink-0 text-xs text-secondary underline hover:text-primary sm:mt-7"
                      aria-label="Remove row"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRow}
                  className="text-sm font-medium text-secondary underline hover:text-primary"
                >
                  Add field
                </button>

                {saveError ? (
                  <p className="text-sm text-primary" role="alert">
                    {saveError}
                  </p>
                ) : null}

                <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50 sm:min-w-0 sm:flex-1"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  {savedFlash ? (
                    <span className="shrink-0 text-sm font-medium text-primary sm:whitespace-nowrap">
                      Saved.
                    </span>
                  ) : null}
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
