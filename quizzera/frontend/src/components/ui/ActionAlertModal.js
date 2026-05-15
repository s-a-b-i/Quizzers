'use client';

import { useEffect, useId, useRef } from 'react';

/**
 * Single-action alert (replaces window.alert) with the same visual language as {@link ActionConfirmModal}.
 */
export function ActionAlertModal({ open, onClose, title, message, tone = 'danger' }) {
  const titleId = useId();
  const msgId = useId();
  const btnRef = useRef(null);
  const isWarning = tone === 'warning';
  const ring = isWarning
    ? 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white text-amber-700'
    : 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-white text-rose-600';
  const btn = isWarning
    ? 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500/40'
    : 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && btnRef.current) btnRef.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#0a0a0a]/50 backdrop-blur-[3px]"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={msgId}
        className="animate-fade-in relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-[0_24px_80px_-12px_rgba(0,0,0,0.22)]"
      >
        <div className="px-6 py-8 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${ring} shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]`}
            >
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 8v5m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 id={titleId} className="mt-5 text-lg font-semibold text-[#111111]">
              {title}
            </h2>
            <p id={msgId} className="mt-2 text-sm leading-relaxed text-[#5C5C5C]">
              {message}
            </p>
            <button
              ref={btnRef}
              type="button"
              onClick={onClose}
              className={`mt-8 w-full max-w-[220px] rounded-full px-5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto ${btn}`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
