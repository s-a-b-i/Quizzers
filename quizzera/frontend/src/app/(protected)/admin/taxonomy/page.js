'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';

export default function AdminTaxonomyPage() {
  const router = useRouter();
  const { mongoUser, role, loading } = useAuth();
  const effectiveRole = mongoUser?.role ?? role;
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'superAdmin';

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-primary">
      <h1 className="text-xl font-semibold">Admin: Taxonomy</h1>
      <p className="mt-2 text-sm text-secondary">Coming soon.</p>
    </main>
  );
}
