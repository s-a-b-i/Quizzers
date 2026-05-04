'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const salute = greetingLabel();

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

  return (
    <div className="min-h-screen bg-background text-primary">
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

      <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
        <h1 className="break-words text-3xl font-bold leading-tight sm:text-4xl">
          {salute}, {user.email}
        </h1>
        <div className="mt-8">
          <span className="inline-block rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-inverse">
            {role ? String(role).toUpperCase() : '—'}
          </span>
        </div>
      </main>
    </div>
  );
}
