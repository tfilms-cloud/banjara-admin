"use client";

import { useQuery } from "@tanstack/react-query";
import { getPayment, listPayments } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function usePayments() {
  return useQuery({
    queryKey: adminKeys.payments(),
    queryFn: listPayments,
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: adminKeys.payment(id),
    queryFn: () => getPayment(id),
    enabled: Boolean(id),
  });
}
