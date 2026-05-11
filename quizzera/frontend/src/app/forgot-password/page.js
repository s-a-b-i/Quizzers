'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { FloatingInput } from '@/components/auth/FloatingInput';
import { ButtonLoader } from '@/components/ui/ButtonLoader';

function mapFirebaseAuthMessage(err) {
  const code = err?.code;
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/missing-email') return 'Enter your email address.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
  return err?.message || 'Could not send reset email.';
}

export default function ForgotPasswordPage() {
  const { sendPasswordReset, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSuccess(
        'If an account exists for this email, you will receive password reset instructions shortly.'
      );
    } catch (err) {
      setError(mapFirebaseAuthMessage(err));
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
        title="Reset password"
        subtitle="Enter the email you use for QUIZZERA. We will send you a link to choose a new password."
      >
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FloatingInput
            id="forgot-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
              setSuccess('');
            }}
            autoComplete="email"
          />
          {error ? <p className="text-sm font-medium text-primary">{error}</p> : null}
          {success ? (
            <p className="text-sm text-secondary" role="status" aria-live="polite">
              {success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-primary text-sm font-semibold tracking-wide text-inverse shadow-sm transition-all hover:bg-primary-hover hover:shadow-md active:scale-[0.99] disabled:opacity-60"
            style={{ letterSpacing: '0.5px' }}
          >
            {busy ? <ButtonLoader /> : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm text-secondary">
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </AuthSplitLayout>
    </main>
  );
}
