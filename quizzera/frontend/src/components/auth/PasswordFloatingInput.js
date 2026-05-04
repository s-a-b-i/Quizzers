'use client';

import { useState } from 'react';
import { FloatingInput } from '@/components/auth/FloatingInput';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="text-tertiary"
        aria-hidden
      >
        <path
          d="M3 3l18 18M10.5 10.5a3 3 0 004.2 4.2M9.88 5.09A10.94 10.94 0 0112 5c4.47 0 8.26 2.72 10 7a11.05 11.05 0 01-4.08 5.33M6.11 6.11A10.95 10.95 0 002 12c1.74 4.28 5.53 7 10 7 1.39 0 2.72-.26 3.95-.74M9.88 9.88a3 3 0 104.24 4.24"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="text-tertiary"
      aria-hidden
    >
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PasswordFloatingInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}) {
  const [show, setShow] = useState(false);

  return (
    <FloatingInput
      id={id}
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      error={error}
      rightAdornment={
        <button
          type="button"
          tabIndex={-1}
          className="rounded-full p-1.5 text-tertiary transition-colors hover:bg-surface hover:text-primary focus:outline-none"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <EyeIcon open={show} />
        </button>
      }
    />
  );
}
