'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedLayout({ children }) {
  const { user, loading, onboardingCompleted } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!onboardingCompleted && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [loading, user, onboardingCompleted, pathname, router]);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <PageLoader />;
  }

  if (!onboardingCompleted && pathname !== '/onboarding') {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-[60px]">{children}</div>
    </div>
  );
}
