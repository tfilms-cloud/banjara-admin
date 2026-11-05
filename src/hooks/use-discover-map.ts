"use client";

import { keepPreviousData, useQuery } from "@/lib/live-query";
import { getDiscover } from "@/services/customer/discover.service";
import type { DiscoverParams, DiscoverResult } from "@/types/customer/discover";

/**
 * Map pins for the current Explore filters (GET /api/discover?view=map).
 * Like the list, if the default sub-type (e.g. "Hotels") has no listings it shows the first
 * sub-type that does, so the map and the list never disagree.
 */
export function useDiscoverMap(
  base: DiscoverParams,
  category: string | undefined,
  bbox?: string,
  enabled = true,
) {
  const run = (cat: string | undefined) =>
    getDiscover({ ...base, category: cat, view: "map", limit: 300, bbox });
  const first = useQuery({
    queryKey: ["customer", "explore", "map", base, category, bbox],
    queryFn: () => run(category),
    staleTime: 30000,
    placeholderData: keepPreviousData,
    enabled,
  });
  const available = first.data?.options.categories ?? [];
  const fallback =
    category && available.length > 0 && !available.some((o) => o.id === category)
      ? available[0].id
      : undefined;
  const second = useQuery({
    queryKey: ["customer", "explore", "map", base, fallback, bbox],
    queryFn: () => run(fallback),
    staleTime: 30000,
    placeholderData: keepPreviousData,
    enabled: enabled && !!fallback,
  });
  const active = fallback ? second : first;
  return {
    data: active.data as DiscoverResult | undefined,
    isPending: active.isPending,
    isError: active.isError,
    isFetching: active.isFetching,
    refetch: active.refetch,
    category: fallback ?? category,
  };
}
