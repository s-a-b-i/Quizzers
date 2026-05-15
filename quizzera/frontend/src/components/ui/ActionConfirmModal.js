'use client';

import { useEffect, useId, useRef } from 'react';

const toneStyles = {
  danger: {
    ring: 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-white text-rose-600',
    confirm:
      'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500/40 disabled:opacity-55',
  },
  warning: {
    ring: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white text-amber-700',
    confirm:
      'bg-amber-600 text-white shadow-sm hover:bg-amber-700 focus-visible:ring-amber-500/40 disabled:opacity-55',
  },
  neutral: {
    ring: 'border-[#E5E5E5] bg-gradient-to-br from-[#FAFAFA] to-white text-[#111111]',
    confirm:
      'bg-[#111111] text-white shadow-sm hover:opacity-90 focus-visible:ring-[#111111]/30 disabled:opacity-55',
  },
};

function ToneIcon({ tone }) {
  if (tone === 'danger') {
    return (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 9v4m0 3h.01M10.3 3.6h3.4l7.1 12.3c.4.7-.1 1.6-.9 1.6H4.1c-.8 0-1.3-.9-.9-1.6L10.3 3.6z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === 'warning') {
    return (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 9v4m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16h.01M12 8v4m9 4a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Accessible confirmation dialog (replaces window.confirm) with polished layout.
 */
export function ActionConfirmModal({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  confirmBusy = false,
  onConfirm,
}) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const t = toneStyles[tone] ?? toneStyles.danger;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirmBusy) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, confirmBusy, onClose]);

  useEffect(() => {
    if (open && cancelRef.current && (tone === 'danger' || tone === 'warning')) {
      cancelRef.current.focus();
    } else if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open, tone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#0a0a0a]/50 backdrop-blur-[3px] transition-opacity"
        aria-label="Dismiss"
        disabled={confirmBusy}
        onClick={() => !confirmBusy && onClose()}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="animate-fade-in relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.03)]"
      >
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90 ${
            tone === 'warning'
              ? 'from-amber-500/0 via-amber-500/70 to-amber-500/0'
              : tone === 'neutral'
                ? 'from-[#111]/0 via-[#111]/35 to-[#111]/0'
                : 'from-rose-500/0 via-rose-500/70 to-rose-500/0'
          }`}
        />
        <div className="px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-9">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${t.ring} shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]`}
            >
              <ToneIcon tone={tone} />
            </div>
            <div className="mt-5 min-w-0 flex-1 sm:mt-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-[#111111] sm:text-xl">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-2 text-sm leading-relaxed text-[#5C5C5C]">
                  {description}
                </p>
              ) : null}
              {children ? <div className="mt-4 text-left text-sm text-[#111111]">{children}</div> : null}
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              ref={cancelRef}
              type="button"
              disabled={confirmBusy}
              onClick={onClose}
              className="rounded-full border border-[#E5E5E5] bg-white px-5 py-2.5 text-sm font-semibold text-[#111111] shadow-sm transition-colors hover:bg-[#F9F9F9] disabled:opacity-45"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              disabled={confirmBusy}
              onClick={() => onConfirm?.()}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${t.confirm}`}
            >
              {confirmBusy ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                    aria-hidden
                  />
                  Working…
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
