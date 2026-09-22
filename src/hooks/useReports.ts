"use client";

import { useQuery } from "@tanstack/react-query";
import { getReports } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useReports(range = "30d") {
  return useQuery({
    queryKey: adminKeys.reports(range),
    queryFn: () => getReports(range),
  });
}
