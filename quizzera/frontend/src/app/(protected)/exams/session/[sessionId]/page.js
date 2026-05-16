'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import {
  answersListFromMap,
  answersMapFromList,
  clearExamSessionLocal,
  readExamSessionLocal,
  writeExamSessionLocal,
} from '@/lib/examSessionLocalState';
import { ExamPageError } from '@/components/exam/ExamPageStates';
import { ActionConfirmModal } from '@/components/ui/ActionConfirmModal';
import { Skeleton } from '@/components/ui/Skeleton';

const AUTOSAVE_MS = 30_000;
const WARN_MS = 5 * 60 * 1000;

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function optionClassName(isSelected) {
  const base =
    'flex w-full cursor-pointer items-start gap-3 rounded-[12px] border p-4 text-left text-[#111111] transition-colors';
  if (isSelected) {
    return `${base} border-[#111111] bg-[#F9F9F9]`;
  }
  return `${base} border-[#E5E5E5] bg-white hover:bg-[#F9F9F9]`;
}

export default function ExamSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params?.sessionId ?? '').trim();

  const [examTitle, setExamTitle] = useState('');
  const [mcqs, setMcqs] = useState([]);
  const [expiresAt, setExpiresAt] = useState(null);
  const [answersByMcqId, setAnswersByMcqId] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submittingRef = useRef(false);
  const answersRef = useRef(answersByMcqId);
  const mcqsRef = useRef(mcqs);

  useEffect(() => {
    answersRef.current = answersByMcqId;
  }, [answersByMcqId]);

  useEffect(() => {
    mcqsRef.current = mcqs;
  }, [mcqs]);

  const unansweredCount = useMemo(() => {
    return mcqs.filter((mcq) => {
      const id = String(mcq._id ?? mcq.id ?? '');
      const label = (answersByMcqId[id] ?? '').trim();
      return !label;
    }).length;
  }, [mcqs, answersByMcqId]);

  const currentMcq = mcqs[currentIndex] ?? null;
  const currentMcqId = currentMcq ? String(currentMcq._id ?? currentMcq.id ?? '') : '';

  const persistLocal = useCallback(
    (nextAnswers, nextIndex) => {
      if (!sessionId) return;
      writeExamSessionLocal(sessionId, {
        answersByMcqId: nextAnswers,
        currentIndex: nextIndex,
        expiresAt,
        examTitle,
      });
    },
    [sessionId, expiresAt, examTitle]
  );

  const saveProgress = useCallback(async () => {
    if (!sessionId || mcqsRef.current.length === 0) return;
    const answers = answersListFromMap(mcqsRef.current, answersRef.current);
    await apiPatch(`/api/exams/sessions/${sessionId}/progress`, { answers });
  }, [sessionId]);

  const submitSession = useCallback(async () => {
    if (!sessionId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitBusy(true);
    setSubmitError('');
    try {
      try {
        await saveProgress();
      } catch {
        /* proceed to submit even if final save fails */
      }
      const { data } = await apiPost(`/api/exams/sessions/${sessionId}/submit`);
      if (!data?.success) {
        throw new Error(data?.message || 'Submit failed.');
      }
      clearExamSessionLocal(sessionId);
      router.replace(`/exams/results/${sessionId}`);
    } catch (err) {
      submittingRef.current = false;
      setSubmitError(
        err?.response?.data?.message || err?.message || 'Could not submit exam.'
      );
    } finally {
      setSubmitBusy(false);
      setSubmitConfirmOpen(false);
    }
  }, [sessionId, router, saveProgress]);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setLoadError('Invalid session.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await apiGet(`/api/exams/sessions/${sessionId}`);
      if (!data?.success || !data?.data) {
        setLoadError('Session not found.');
        return;
      }
      const payload = data.data;
      const list = Array.isArray(payload.mcqs) ? payload.mcqs : [];
      if (list.length === 0) {
        setLoadError('No questions in this session.');
        return;
      }

      const serverMap = answersMapFromList(payload.answers);
      const local = readExamSessionLocal(sessionId);
      const localMap =
        local?.answersByMcqId && typeof local.answersByMcqId === 'object'
          ? local.answersByMcqId
          : {};
      const merged = { ...serverMap, ...localMap };

      const idx =
        typeof local?.currentIndex === 'number' &&
        local.currentIndex >= 0 &&
        local.currentIndex < list.length
          ? local.currentIndex
          : 0;

      setExamTitle(payload.examTitle ?? 'Exam');
      setMcqs(list);
      setExpiresAt(payload.expiresAt ? new Date(payload.expiresAt) : null);
      setAnswersByMcqId(merged);
      setCurrentIndex(idx);
      writeExamSessionLocal(sessionId, {
        answersByMcqId: merged,
        currentIndex: idx,
        expiresAt: payload.expiresAt,
        examTitle: payload.examTitle,
      });
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message;
      if (status === 400 && /submitted/i.test(String(msg))) {
        router.replace(`/exams/results/${sessionId}`);
        return;
      }
      setLoadError(msg || 'Could not load session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!expiresAt) return undefined;
    const tick = () => {
      const ms = expiresAt.getTime() - Date.now();
      setRemainingMs(ms);
      if (ms <= 0 && !submittingRef.current) {
        submitSession();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, submitSession]);

  useEffect(() => {
    if (loading || !sessionId || mcqs.length === 0) return undefined;
    const id = window.setInterval(() => {
      saveProgress().catch(() => {});
    }, AUTOSAVE_MS);
    return () => window.clearInterval(id);
  }, [loading, sessionId, mcqs.length, saveProgress]);

  useEffect(() => {
    if (loading) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [loading]);

  useEffect(() => {
    if (loading) return undefined;
    window.history.pushState({ examGuard: true }, '', window.location.href);
    const onPopState = () => {
      const leave = window.confirm(
        'Leave this exam? Your timer will keep running and progress may be lost if you leave without submitting.'
      );
      if (!leave) {
        window.history.pushState({ examGuard: true }, '', window.location.href);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loading]);

  const handleSelectOption = (label) => {
    if (!currentMcqId) return;
    setAnswersByMcqId((prev) => {
      const next = { ...prev, [currentMcqId]: label };
      persistLocal(next, currentIndex);
      return next;
    });
  };

  const timerClass =
    remainingMs > 0 && remainingMs < WARN_MS
      ? 'font-mono text-lg font-bold tabular-nums text-red-600'
      : 'font-mono text-lg font-bold tabular-nums text-[#111111]';

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
          <Skeleton height="20px" width="180px" />
          <Skeleton height="28px" width="100px" />
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

  if (loadError) {
    return (
      <main className="min-h-screen bg-white px-4 py-10">
        <ExamPageError onRetry={loadSession} />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#111111]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] bg-white px-4 py-3">
        <h1 className="min-w-0 flex-1 truncate text-base font-bold sm:text-lg">{examTitle}</h1>
        <div className="flex items-center gap-3">
          <span className={timerClass} aria-live="polite">
            {formatCountdown(remainingMs)}
          </span>
          <button
            type="button"
            onClick={() => setSubmitConfirmOpen(true)}
            disabled={submitBusy}
            className="rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-50"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {submitError ? (
        <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="border-b border-[#E5E5E5] bg-[#FAFAFA] p-4 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
            Questions
          </p>
          <nav
            className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-4"
            aria-label="Question navigator"
          >
            {mcqs.map((mcq, index) => {
              const id = String(mcq._id ?? mcq.id ?? '');
              const answered = Boolean((answersByMcqId[id] ?? '').trim());
              const isCurrent = index === currentIndex;
              let btnClass =
                'flex h-9 w-full items-center justify-center rounded-md text-sm font-semibold transition-colors';
              if (isCurrent) {
                btnClass += ' border-2 border-[#111111] bg-white text-[#111111]';
              } else if (answered) {
                btnClass += ' bg-[#111111] text-white';
              } else {
                btnClass += ' border border-[#E5E5E5] bg-white text-[#111111] hover:bg-[#F9F9F9]';
              }
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(index);
                    persistLocal(answersByMcqId, index);
                  }}
                  className={btnClass}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {index + 1}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentMcq ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
                Question {currentIndex + 1} of {mcqs.length}
              </p>
              <h2 className="mt-3 text-[18px] font-bold leading-snug">{currentMcq.questionStem}</h2>
              <div className="mt-8 flex flex-col gap-3" role="radiogroup" aria-label="Answer choices">
                {(currentMcq.options ?? []).map((opt) => {
                  const label = String(opt.label ?? '').trim();
                  const isSelected = (answersByMcqId[currentMcqId] ?? '').trim() === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectOption(label)}
                      className={optionClassName(isSelected)}
                    >
                      <span className="min-w-[1.25rem] font-semibold">{opt.label}.</span>
                      <span className="flex-1">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      </div>

      <ActionConfirmModal
        open={submitConfirmOpen}
        onClose={() => !submitBusy && setSubmitConfirmOpen(false)}
        title="Submit exam?"
        description={
          unansweredCount > 0
            ? `You have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'}. Are you sure?`
            : 'Are you sure you want to submit? You cannot change your answers after submitting.'
        }
        confirmLabel="Submit"
        cancelLabel="Keep working"
        tone="warning"
        confirmBusy={submitBusy}
        onConfirm={submitSession}
      />
    </div>
  );
}
