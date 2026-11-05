'use client';
import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backendAvailability } from '@/lib/backend-availability';
import { useBackendStatus } from '@/lib/live-query';

/** Keep the shell and controls visible while individual data sections clear. */
export function BackendAvailabilityGate({ children }: { children: ReactNode }) {
  const status = useBackendStatus();
  const queryClient = useQueryClient();
  useEffect(() => {
    const reset = backendAvailability.registerReset(() => {
      void queryClient.cancelQueries();
      queryClient.clear();
    });
    void backendAvailability.check();
    const check = () => { void backendAvailability.check(); };
    const offline = () => backendAvailability.reportFailure();
    const visible = () => { if (document.visibilityState === 'visible') check(); };
    const timer = setInterval(() => { if (document.visibilityState === 'visible') check(); }, 5000);
    window.addEventListener('online', check);
    window.addEventListener('offline', offline);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', check);
      window.removeEventListener('offline', offline);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', visible);
      reset();
    };
  }, [queryClient]);
  useEffect(() => {
    if (status === 'online' && backendAvailability.hasDisconnected()) window.location.reload();
  }, [status]);
  return <>
    {children}
    {status !== 'online' && <div role="status" className="fixed bottom-4 left-4 z-[100] flex max-w-md items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      <span>{status === 'checking' ? 'Connecting to live data…' : 'Live data unavailable. Search and navigation are still available.'}</span>
      <button type="button" onClick={() => void backendAvailability.check()} className="font-semibold text-teal-800">Retry</button>
    </div>}
  </>;
}
