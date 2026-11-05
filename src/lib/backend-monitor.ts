export type BackendStatus = 'checking' | 'online' | 'offline';

export function isBackendReady(payload: unknown): boolean {
  const body = payload as { success?: boolean; data?: { database?: string } } | null;
  return body?.success === true && body.data?.database === 'connected';
}

export function isBackendOutage(error: { code?: string; response?: { status: number } }): boolean {
  return error.code !== 'ERR_CANCELED' &&
    (!error.response || [502, 503, 504].includes(error.response.status));
}

/** Only a fresh readiness probe can restore access after an outage. */
export function createBackendMonitor(probe: () => Promise<boolean>) {
  let status: BackendStatus = 'checking';
  let disconnected = false;
  let epoch = 0;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const resets = new Set<() => void>();
  function publish(next: BackendStatus) {
    if (next === 'offline') disconnected = true;
    if (status === next) return;
    epoch++;
    // Clear display caches before exposing a newly connected session. Not on the very
    // first connect of a page load (checking → online): nothing stale exists yet, and
    // clearing then would drop queries already in flight, leaving their screens stuck
    // on "Loading…".
    const firstConnect = status === 'checking' && next === 'online' && !disconnected;
    if (!firstConnect) for (const reset of resets) reset();
    status = next;
    for (const listener of listeners) listener();
  }
  return {
    getSnapshot: () => status,
    hasDisconnected: () => disconnected,
    getEpoch: () => epoch,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    registerReset(reset: () => void) {
      resets.add(reset);
      return () => { resets.delete(reset); };
    },
    reportFailure() {
      // Invalidate an earlier in-flight successful probe, even if already offline.
      epoch++;
      publish('offline');
    },
    check(): Promise<void> {
      if (pending) return pending;
      const startedAt = epoch;
      const request = Promise.resolve().then(probe).then(
        (ready) => { if (epoch === startedAt) publish(ready ? 'online' : 'offline'); },
        () => { if (epoch === startedAt) publish('offline'); },
      ).finally(() => { if (pending === request) pending = null; });
      pending = request;
      return request;
    },
  };
}
