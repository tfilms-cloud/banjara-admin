"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  approveVehicle,
  getVehicle,
  listVehicles,
  rejectVehicle,
  suspendVehicle,
} from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useVehicles(params?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: [...adminKeys.vehicles(), params ?? {}],
    queryFn: () => listVehicles(params),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: adminKeys.vehicle(id),
    queryFn: () => getVehicle(id),
    enabled: Boolean(id),
  });
}

function invalidateVehicles(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: ["admin", "vehicles"] });
  if (id) void qc.invalidateQueries({ queryKey: adminKeys.vehicle(id) });
}

export function useApproveVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveVehicle(id),
    onSuccess: (_data, id) => {
      toast.success("Vehicle approved successfully.");
      invalidateVehicles(qc, id);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Approval failed. Please try again.");
    },
  });
}

export function useRejectVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectVehicle(id, reason),
    onSuccess: (_data, vars) => {
      toast.success("Vehicle rejected.");
      invalidateVehicles(qc, vars.id);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Rejection failed. Please try again.");
    },
  });
}

export function useSuspendVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => suspendVehicle(id, reason),
    onSuccess: (_data, vars) => {
      toast.success("Vehicle suspended.");
      invalidateVehicles(qc, vars.id);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Suspension failed. Please try again.");
    },
  });
}
