'use client';

import { useSyncExternalStore } from 'react';
import { useQuery as useTanstackQuery, type QueryKey, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { backendAvailability } from '@/lib/backend-availability';
export * from '@tanstack/react-query';

export function useBackendStatus() {
  return useSyncExternalStore(backendAvailability.subscribe, backendAvailability.getSnapshot, () => 'checking' as const);
}

/** Only query data is gated. Forms, navigation and the surrounding UI stay mounted. */
export function useQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  const status = useBackendStatus();
  const online = status === 'online' && !backendAvailability.hasDisconnected();
  const enabled = options.enabled;
  const result = useTanstackQuery({
    ...options,
    initialData: online ? options.initialData : undefined,
    enabled: typeof enabled === 'function' ? query => online && enabled(query) : online && enabled !== false,
  });
  if (online) return result;
  return { ...result, data: undefined, error: new Error('Live data is temporarily unavailable. Please try again.') as TError,
    isLoading: false, isPending: false, isFetching: false, isError: true, isSuccess: false, status: 'error', fetchStatus: 'idle' } as UseQueryResult<TData, TError>;
}
