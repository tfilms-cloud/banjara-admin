'use client';
import type { ReactNode } from 'react';
import { useBackendStatus } from '@/lib/live-query';
import { backendAvailability } from '@/lib/backend-availability';

export function BackendData({ children, label = 'Live data' }: { children: ReactNode; label?: string }) {
  const status = useBackendStatus();
  if (status === 'online' && !backendAvailability.hasDisconnected()) return children;
  return <div role="status" className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
    <p className="font-semibold">{label} temporarily unavailable</p>
    <p className="mt-2 text-sm text-muted">Your search and navigation are still available. Data will return when the connection is restored.</p>
  </div>;
}
