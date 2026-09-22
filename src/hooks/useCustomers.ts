"use client";

import { useQuery } from "@tanstack/react-query";
import { getCustomer, listCustomers } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useCustomers() {
  return useQuery({
    queryKey: adminKeys.customers(),
    queryFn: listCustomers,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: adminKeys.customer(id),
    queryFn: () => getCustomer(id),
    enabled: Boolean(id),
  });
}
