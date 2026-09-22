"use client";

import { useQuery } from "@tanstack/react-query";
import { getBooking, listBookings } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useBookings() {
  return useQuery({
    queryKey: adminKeys.bookings(),
    queryFn: listBookings,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: adminKeys.booking(id),
    queryFn: () => getBooking(id),
    enabled: Boolean(id),
  });
}
