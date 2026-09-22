"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPickupPoint,
  getRoute,
  listPickupPoints,
  listRoutes,
} from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useRoutes() {
  return useQuery({
    queryKey: adminKeys.routes(),
    queryFn: listRoutes,
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: adminKeys.route(id),
    queryFn: () => getRoute(id),
    enabled: Boolean(id),
  });
}

export function usePickupPoints() {
  return useQuery({
    queryKey: adminKeys.pickupPoints(),
    queryFn: listPickupPoints,
  });
}

export function usePickupPoint(id: string) {
  return useQuery({
    queryKey: adminKeys.pickupPoint(id),
    queryFn: () => getPickupPoint(id),
    enabled: Boolean(id),
  });
}
