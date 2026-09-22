"use client";

import { useQuery } from "@tanstack/react-query";
import { getProvider } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useProvider(id: string) {
  return useQuery({
    queryKey: adminKeys.provider(id),
    queryFn: () => getProvider(id),
    enabled: Boolean(id),
  });
}
