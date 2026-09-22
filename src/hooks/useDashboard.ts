"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: getDashboard,
  });
}
