'use client';

import { createContext, useContext } from 'react';

/** Stable module for Fast Refresh — keep provider logic in AuthProvider.js. */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
