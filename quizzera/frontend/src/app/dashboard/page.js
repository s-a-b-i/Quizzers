'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { displaySerif } from '@/lib/fonts';

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user, mongoUser, role, loading, onboardingCompleted, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const salute = greetingLabel();
  const displayEmail = mongoUser?.email ?? user?.email ?? '';
  const displayRole = mongoUser?.role ?? role;
  const accountStatus = mongoUser?.accountStatus ?? 'active';

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-primary">
        <p className="text-sm text-secondary">Loading...</p>
      </main>
    );
  }

  const showSuspendedBadge = accountStatus === 'suspended';
  const showInactiveBadge = accountStatus === 'inactive';

  return (
    <div className="min-h-screen bg-background text-primary">
      {!onboardingCompleted ? (
        <div className="flex w-full flex-col gap-4 bg-primary px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-center text-sm font-medium text-inverse sm:text-left">
            Complete your profile to get started
          </p>
          <Link
            href="/onboarding"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-background px-6 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface"
          >
            Continue
          </Link>
        </div>
      ) : null}

      <header className="flex w-full items-center justify-between border-b border-border px-6 py-4">
        <Link
          href="/dashboard"
          className="text-sm font-bold uppercase tracking-[0.35em] text-primary"
        >
          QUIZZERA
        </Link>
        <div className="flex items-center gap-4">
          <span className="max-w-[140px] truncate text-sm text-secondary sm:max-w-[240px]">
            {user.email}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={onLogout}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary hover:text-inverse disabled:opacity-50"
          >
            {busy ? '...' : 'Log out'}
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col px-6 py-12">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <h1
            className={`${displaySerif.className} break-words text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl sm:font-bold`}
          >
            {salute}, {displayEmail}
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <span className="inline-flex rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-inverse">
              {displayRole ? String(displayRole).toUpperCase() : '—'}
            </span>
            {showSuspendedBadge ? (
              <span className="inline-flex rounded-full border-2 border-primary bg-background px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                SUSPENDED
              </span>
            ) : null}
            {showInactiveBadge ? (
              <span className="inline-flex rounded-full border-2 border-primary bg-background px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                INACTIVE
              </span>
            ) : null}
          </div>
        </div>

        <section className="mt-14">
          <h2 className="text-[14px] font-bold uppercase tracking-[0.2em] text-primary">Quick links</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="#"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
              onClick={(e) => e.preventDefault()}
            >
              Practice MCQs
            </Link>
            <Link
              href="#"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
              onClick={(e) => e.preventDefault()}
            >
              Take an Exam
            </Link>
            <Link
              href="#"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
              onClick={(e) => e.preventDefault()}
            >
              View Resources
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
