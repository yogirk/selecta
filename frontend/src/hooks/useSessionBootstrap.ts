'use client';

import { useEffect } from 'react';
import { useEnsureSession } from './useEnsureSession';
import { getUserId } from '@/lib/utils';

export function useSessionBootstrap() {
  const ensureSession = useEnsureSession(getUserId());

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);
}
