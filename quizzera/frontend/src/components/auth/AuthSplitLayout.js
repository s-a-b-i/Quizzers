'use client';

import { displaySerif } from '@/lib/fonts';

export function AuthSplitLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <aside className="auth-dot-grid relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-primary px-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent"
          aria-hidden
        />
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-inverse/[0.04] blur-3xl" aria-hidden />
        <div className="relative z-10 flex max-w-md flex-col items-center text-center">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.45em] text-inverse/55">
            Study platform
          </p>
          <h1
            className={`${displaySerif.className} text-balance text-5xl font-bold leading-[1.05] tracking-tight text-inverse sm:text-6xl`}
          >
            QUIZZERA
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-secondary">
            Prepare smarter. Score higher. One calm place for your quizzes and progress.
          </p>
          <div className="mt-10 flex items-center gap-2 rounded-full border border-inverse/15 bg-inverse/[0.06] px-5 py-2 text-xs text-inverse/80">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-inverse/50" />
            Built for focus, not noise
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-1 flex-col justify-center bg-background px-5 py-12 sm:px-8 lg:w-1/2 lg:px-14">
        <div className="relative mx-auto w-full max-w-[400px]">
          <div className="mb-10 text-center lg:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-secondary">Quizzera</p>
            <p
              className={`${displaySerif.className} mt-2 text-[1.65rem] font-bold leading-tight tracking-[-0.02em] text-primary`}
            >
              QUIZZERA
            </p>
          </div>

          <h2
            className={`${displaySerif.className} text-balance text-[1.875rem] font-semibold leading-[1.2] tracking-[-0.02em] text-primary sm:text-[2.125rem] sm:font-bold`}
          >
            {title}
          </h2>
          <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-secondary">{subtitle}</p>

          <div className="mt-8 flex flex-col gap-5">{children}</div>

          <p className="mt-8 text-center text-[11px] text-secondary/80">Secure sign-in · Your data stays yours</p>
        </div>
      </div>
    </div>
  );
}
