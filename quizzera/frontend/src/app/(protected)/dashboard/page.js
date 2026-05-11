'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { displaySerif } from '@/lib/fonts';

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user, mongoUser, role } = useAuth();

  const salute = greetingLabel();
  const displayEmail = mongoUser?.email ?? user?.email ?? '';
  const displayRole = mongoUser?.role ?? role;
  const accountStatus = mongoUser?.accountStatus ?? 'active';

  const showSuspendedBadge = accountStatus === 'suspended';
  const showInactiveBadge = accountStatus === 'inactive';

  return (
    <div className="min-h-screen bg-background text-primary">
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
          <h2 className="text-[14px] font-bold uppercase tracking-[0.2em] text-primary">
            Quick links
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/mcqs"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
            >
              Practice MCQs
            </Link>
            <Link
              href="/exams"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
            >
              Take an Exam
            </Link>
            <Link
              href="/resources"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-2 border-primary bg-background px-6 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface sm:w-auto sm:min-w-[10rem]"
            >
              View Resources
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
