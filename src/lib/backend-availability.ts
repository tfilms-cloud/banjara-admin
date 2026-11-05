import { createBackendMonitor, isBackendReady } from '@/lib/backend-monitor';

async function probeBackend() {
  const response = await fetch('/api/backend-status', {
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  });
  return response.ok && isBackendReady(await response.json());
}

export const backendAvailability = createBackendMonitor(probeBackend);

export async function requireBackendConnection() {
  if (typeof window === 'undefined') return;
  if (backendAvailability.getSnapshot() === 'checking') await backendAvailability.check();
  if (backendAvailability.getSnapshot() !== 'online') throw new Error('Live data is temporarily unavailable. Please try again.');
}
