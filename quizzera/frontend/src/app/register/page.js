'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { FloatingInput } from '@/components/auth/FloatingInput';
import { PasswordFloatingInput } from '@/components/auth/PasswordFloatingInput';
import { GoogleGIcon } from '@/components/auth/GoogleGIcon';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { ButtonLoader } from '@/components/ui/ButtonLoader';

export default function RegisterPage() {
  const { register, loginWithGoogle, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await register(email, password);
    } catch (err) {
      setError(err?.message || 'Registration failed.');
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

  if (!loading && user) {
    return null;
  }

  return (
    <main>
      <AuthSplitLayout
        title="Create account"
        subtitle="Enter your details to get started."
      >
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FloatingInput
            id="reg-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <PasswordFloatingInput
            id="reg-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordFloatingInput
            id="reg-confirm"
            label="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {error ? (
            <p className="animate-fade-in text-xs leading-snug text-primary">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-primary text-sm font-semibold tracking-wide text-inverse shadow-sm transition-all hover:bg-primary-hover hover:shadow-md active:scale-[0.99] disabled:opacity-60"
            style={{ letterSpacing: '0.5px' }}
          >
            {busy ? <ButtonLoader /> : 'Create account'}
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
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
          >
            Sign in
          </Link>
        </p>
      </AuthSplitLayout>
    </main>
  );
}
