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

      <div className="relative flex min-h-screen w-full flex-1 flex-col justify-center bg-gradient-to-b from-background to-surface/40 px-5 py-12 sm:px-8 lg:w-1/2 lg:px-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-border/30 to-transparent sm:h-40" aria-hidden />

        <div className="relative mx-auto w-full max-w-[400px]">
          <div className="mb-10 text-center lg:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-secondary">Quizzera</p>
            <p className="mt-2 text-xl font-bold tracking-tight text-primary">QUIZZERA</p>
          </div>

          <div className="rounded-[1.75rem] border border-border/90 bg-background/90 p-6 shadow-[0_20px_50px_-24px_rgba(17,17,17,0.18)] backdrop-blur-sm sm:p-8">
            <h2 className="text-balance text-[26px] font-bold leading-tight tracking-tight text-primary sm:text-[28px]">
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-secondary">{subtitle}</p>

            <div className="mt-7 flex flex-col gap-5">{children}</div>
          </div>

          <p className="mt-6 text-center text-[11px] text-secondary/90">
            Secure sign-in · Your data stays yours
          </p>
        </div>
      </div>
    </div>
  );
}
