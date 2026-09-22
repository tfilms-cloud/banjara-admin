"use client";

import { useQuery } from "@tanstack/react-query";
import { getHotel, listHotels } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useHotels() {
  return useQuery({
    queryKey: adminKeys.hotels(),
    queryFn: listHotels,
  });
}

export function useHotel(id: string) {
  return useQuery({
    queryKey: adminKeys.hotel(id),
    queryFn: () => getHotel(id),
    enabled: Boolean(id),
  });
}
