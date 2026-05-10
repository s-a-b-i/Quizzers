'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { FloatingInput } from '@/components/auth/FloatingInput';
import { PasswordFloatingInput } from '@/components/auth/PasswordFloatingInput';
import { GoogleGIcon } from '@/components/auth/GoogleGIcon';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { LoadingDots } from '@/components/auth/LoadingDots';

export default function LoginPage() {
  const { login, loginWithGoogle, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err?.message || 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  if (user && loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-primary">
        <LoadingDots />
      </main>
    );
  }

  if (!loading && user) {
    return null;
  }

  return (
    <main>
      <AuthSplitLayout title="Sign in" subtitle="Welcome back. Enter your details.">
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FloatingInput
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <PasswordFloatingInput
            id="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            error={error}
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="rounded-full px-2 py-1 text-xs font-medium text-secondary transition-colors hover:bg-surface hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-primary text-sm font-semibold tracking-wide text-inverse shadow-sm transition-all hover:bg-primary-hover hover:shadow-md active:scale-[0.99] disabled:opacity-60"
            style={{ letterSpacing: '0.5px' }}
          >
            {busy ? <LoadingDots /> : 'Sign in'}
          </button>
        </form>

        <AuthDivider />

        <button
          type="button"
          disabled={busy}
          onClick={onGoogle}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-full border border-border bg-background text-sm font-semibold text-primary shadow-sm transition-all hover:border-primary/25 hover:bg-surface hover:shadow-md active:scale-[0.99] disabled:opacity-60"
        >
          <GoogleGIcon size={22} />
          Continue with Google
        </button>

        <p className="text-center text-sm text-secondary">
          No account?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
          >
            Register
          </Link>
        </p>
      </AuthSplitLayout>
    </main>
  );
}
