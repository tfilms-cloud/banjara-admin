"use client";

import { useQuery } from "@tanstack/react-query";
import { listMessages, listNotifications } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useNotifications() {
  return useQuery({
    queryKey: adminKeys.notifications(),
    queryFn: listNotifications,
  });
}

export function useMessages() {
  return useQuery({
    queryKey: adminKeys.messages(),
    queryFn: listMessages,
  });
}
