'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getFirebaseAuth } from '@/lib/firebase';
import { destinationAfterProfile, useAuth } from '@/context/AuthContext';
import { OnboardingStepIndicator } from '@/components/onboarding/OnboardingStepIndicator';
import { displaySerif } from '@/lib/fonts';
import {
  EDUCATION_LEVELS,
  STUDY_MODES,
  TARGET_EXAMS,
  TIMELINE_OPTIONS,
  WEAK_AREA_TAGS,
} from '@/lib/onboardingOptions';

const TOTAL_STEPS = 5;

const api = axios.create({ baseURL: '' });

export default function OnboardingPage() {
  const router = useRouter();
  const {
    user,
    loading,
    onboardingCompleted,
    refreshUserProfile,
    role,
  } = useAuth();

  const [step, setStep] = useState(1);
  const [targetExamId, setTargetExamId] = useState('');
  const [academicNotes, setAcademicNotes] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [weakAreas, setWeakAreas] = useState([]);
  const [studyMode, setStudyMode] = useState('');
  const [timeline, setTimeline] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && onboardingCompleted) {
      router.replace(destinationAfterProfile(role, onboardingCompleted));
    }
  }, [loading, user, onboardingCompleted, role, router]);

  const toggleWeak = useCallback((tag) => {
    setWeakAreas((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  async function getBearer() {
    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    if (!u) throw new Error('Not signed in.');
    return u.getIdToken(true);
  }

  function validateStep(s) {
    setError('');
    if (s === 1 && !targetExamId) {
      setError('Choose a target exam.');
      return false;
    }
    if (s === 2) {
      if (!educationLevel) {
        setError('Select your academic level.');
        return false;
      }
      if (!academicNotes.trim()) {
        setError('Briefly describe your academic background.');
        return false;
      }
    }
    if (s === 3 && weakAreas.length === 0) {
      setError('Pick at least one weak area.');
      return false;
    }
    if (s === 4 && !studyMode) {
      setError('Choose how you prefer to study.');
      return false;
    }
    if (s === 5 && !timeline) {
      setError('Select your preparation timeline.');
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((x) => Math.min(x + 1, TOTAL_STEPS));
  }

  function goBack() {
    setError('');
    setStep((x) => Math.max(x - 1, 1));
  }

  async function finish() {
    if (!validateStep(5)) return;
    setBusy(true);
    setError('');
    try {
      const idToken = await getBearer();
      const onboardingPayload = {
        targetExamId,
        academicNotes: academicNotes.trim(),
        educationLevel,
        weakAreas,
        studyMode,
        timeline,
        finishedAt: new Date().toISOString(),
      };

      await api.patch(
        '/api/users/me',
        { preferences: { onboarding: onboardingPayload } },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      const { data } = await api.patch(
        '/api/users/me/onboarding',
        { onboardingCompleted: true },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      if (!data?.success) {
        throw new Error(data?.message || 'Could not complete onboarding.');
      }

      const profile = await refreshUserProfile(idToken);
      router.replace(
        profile
          ? destinationAfterProfile(profile.role, profile.onboardingCompleted)
          : '/dashboard'
      );
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || onboardingCompleted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-primary">
        <p className="text-sm text-secondary">Loading...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/dashboard"
          className="text-[10px] font-semibold uppercase tracking-[0.35em] text-secondary hover:text-primary"
        >
          QUIZZERA
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-16 pt-6 sm:px-8">
        <OnboardingStepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

        <h1
          className={`${displaySerif.className} mt-10 text-center text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-primary sm:text-[2rem]`}
        >
          {step === 1 && 'Target exam'}
          {step === 2 && 'Academic background'}
          {step === 3 && 'Weak areas'}
          {step === 4 && 'Study preference'}
          {step === 5 && 'Preparation timeline'}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-secondary">
          {step === 1 && 'What are you preparing for?'}
          {step === 2 && 'Tell us a bit about where you are academically.'}
          {step === 3 && 'Select topics or skills you want to strengthen.'}
          {step === 4 && 'How would you like QUIZZERA to support you?'}
          {step === 5 && 'How long do you plan to prepare?'}
        </p>

        <div className="mt-10 animate-fade-in">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TARGET_EXAMS.map((exam) => {
                const selected = targetExamId === exam.id;
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => setTargetExamId(exam.id)}
                    className={[
                      'rounded-2xl px-3 py-4 text-left text-sm font-medium transition-colors',
                      selected ? 'bg-primary text-inverse' : 'bg-surface text-primary hover:bg-border',
                    ].join(' ')}
                  >
                    {exam.label}
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <label htmlFor="edu-level" className="mb-2 block text-xs font-medium text-secondary">
                  Level
                </label>
                <select
                  id="edu-level"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="h-[52px] w-full rounded-full border border-border bg-background px-5 text-sm text-primary outline-none focus:border-primary"
                >
                  <option value="">Select…</option>
                  {EDUCATION_LEVELS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="academic-notes" className="mb-2 block text-xs font-medium text-secondary">
                  Background (short)
                </label>
                <textarea
                  id="academic-notes"
                  value={academicNotes}
                  onChange={(e) => setAcademicNotes(e.target.value)}
                  rows={4}
                  placeholder="e.g. Final year B.Sc., gap after graduation…"
                  className="w-full resize-none rounded-2xl border border-border bg-background px-5 py-4 text-sm text-primary outline-none placeholder:text-tertiary focus:border-primary"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-wrap gap-2">
              {WEAK_AREA_TAGS.map((tag) => {
                const on = weakAreas.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleWeak(tag)}
                    className={[
                      'rounded-full px-4 py-2 text-xs font-medium transition-colors',
                      on ? 'bg-primary text-inverse' : 'bg-[#E5E5E5] text-primary hover:bg-border',
                    ].join(' ')}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-3">
              {STUDY_MODES.map((m) => {
                const selected = studyMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setStudyMode(m.id)}
                    className={[
                      'rounded-2xl px-5 py-4 text-left transition-colors',
                      selected ? 'bg-primary text-inverse' : 'bg-surface text-primary hover:bg-border',
                    ].join(' ')}
                  >
                    <span className="block text-sm font-semibold">{m.title}</span>
                    <span
                      className={`mt-1 block text-xs leading-relaxed ${selected ? 'text-[rgba(255,255,255,0.85)]' : 'text-secondary'}`}
                    >
                      {m.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 5 && (
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Preparation timeline</legend>
              {TIMELINE_OPTIONS.map((opt) => {
                const selected = timeline === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={[
                      'flex cursor-pointer items-center gap-4 rounded-2xl px-5 py-4 transition-colors',
                      selected ? 'bg-primary text-inverse' : 'bg-surface text-primary hover:bg-border',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="timeline"
                      value={opt.id}
                      checked={selected}
                      onChange={() => setTimeline(opt.id)}
                      className="sr-only"
                    />
                    <span className={`text-sm font-medium ${selected ? 'text-inverse' : 'text-primary'}`}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
        </div>

        {error ? (
          <p className="mt-6 text-center text-sm text-primary" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || busy}
            className="rounded-full px-5 py-3 text-sm font-medium text-secondary transition-colors hover:text-primary disabled:opacity-40"
          >
            Back
          </button>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              disabled={busy}
              className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={busy}
              className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Finish'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
