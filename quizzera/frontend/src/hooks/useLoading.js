'use client';

import { useCallback, useState } from 'react';

export function useLoading(initial = false) {
  const [loading, setLoading] = useState(initial);

  const startLoading = useCallback(() => {
    setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  return { loading, startLoading, stopLoading };
}
