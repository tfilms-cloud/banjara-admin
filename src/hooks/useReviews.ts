"use client";

import { useQuery } from "@tanstack/react-query";
import { listReviews } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useReviews() {
  return useQuery({
    queryKey: adminKeys.reviews(),
    queryFn: listReviews,
  });
}
