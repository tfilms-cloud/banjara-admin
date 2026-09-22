"use client";

import { useQuery } from "@tanstack/react-query";
import { getTrip, listTrips } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useTrips() {
  return useQuery({
    queryKey: adminKeys.trips(),
    queryFn: listTrips,
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: adminKeys.trip(id),
    queryFn: () => getTrip(id),
    enabled: Boolean(id),
  });
}
