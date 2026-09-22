"use client";

import { useQuery } from "@tanstack/react-query";
import { getRoom, listAvailability, listRooms } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useRooms() {
  return useQuery({
    queryKey: adminKeys.rooms(),
    queryFn: listRooms,
  });
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: adminKeys.room(id),
    queryFn: () => getRoom(id),
    enabled: Boolean(id),
  });
}

export type AvailabilityParams = { roomId?: string; from?: string; to?: string };

export function useAvailability(params?: AvailabilityParams) {
  return useQuery({
    queryKey: adminKeys.availability(params),
    queryFn: () => listAvailability(params),
  });
}
