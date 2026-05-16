'use client';

import { AuthProvider } from '@/context/AuthProvider';

export function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
