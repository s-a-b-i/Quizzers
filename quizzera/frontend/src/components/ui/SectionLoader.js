'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function SectionLoader() {
  return (
    <div className="py-6">
      <div className="flex flex-col gap-[12px]">
        <Skeleton width="40%" height="12px" />
        <Skeleton width="100%" height="14px" />
        <Skeleton width="100%" height="60px" borderRadius="4px" />
      </div>
    </div>
  );
}
