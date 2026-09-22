"use client";

import { useState } from "react";
import { Ban, Check, X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  useApproveVehicle,
  useRejectVehicle,
  useSuspendVehicle,
} from "@/hooks/useVehicles";
import { firstNumber, firstText, refLabel } from "@/lib/records";
import { idOf } from "@/lib/utils";

type ActionKind = "approve" | "reject" | "suspend";

export type VehicleActionsProps = {
  vehicle: Record<string, unknown>;
  size?: ButtonProps["size"];
  className?: string;
};

export function VehicleActions({ vehicle, size = "sm", className }: VehicleActionsProps) {
  const vehicleId = idOf(vehicle);
  const [action, setAction] = useState<ActionKind | null>(null);

  const approve = useApproveVehicle();
  const reject = useRejectVehicle();
  const suspend = useSuspendVehicle();

  const status = firstText(vehicle, ["status"], "").toLowerCase();
  const canApprove = status === "pending" || status === "rejected" || status === "suspended";
  const canReject = status === "pending";
  const canSuspend = status === "active";

  const pending = approve.isPending || reject.isPending || suspend.isPending;
  const name = firstText(vehicle, ["name", "registrationNumber"], "This vehicle");
  const provider = refLabel(vehicle.providerId);
  const seats = firstNumber(vehicle, ["seatCount", "totalSeats", "capacity", "seats"]);

  const handleConfirm = async (reason: string) => {
    if (!vehicleId || !action) return;
    try {
      if (action === "approve") await approve.mutateAsync(vehicleId);
      if (action === "reject") await reject.mutateAsync({ id: vehicleId, reason });
      if (action === "suspend") await suspend.mutateAsync({ id: vehicleId, reason });
      setAction(null);
    } catch {
      // Toast handled in mutation hooks.
    }
  };

  const dialogCopy: Record<
    ActionKind,
    { title: string; description: string; confirm: string }
  > = {
    approve: {
      title: "Approve Vehicle?",
      description: `Vehicle: ${name}\nProvider: ${provider}\nSeats: ${seats || "—"}\n\nOnce approved, this vehicle can be used by the provider when creating trips on BANJARA.`,
      confirm: approve.isPending ? "Approving..." : "Approve Vehicle",
    },
    reject: {
      title: "Reject Vehicle",
      description: "Provide a clear reason so the provider can update and resubmit this vehicle.",
      confirm: reject.isPending ? "Rejecting..." : "Reject Vehicle",
    },
    suspend: {
      title: "Suspend Vehicle?",
      description: "This vehicle will no longer be available for new trips.",
      confirm: suspend.isPending ? "Suspending..." : "Suspend Vehicle",
    },
  };

  if (!canApprove && !canReject && !canSuspend) return null;

  return (
    <>
      <div className={className}>
        <div className="flex flex-wrap items-center gap-2">
          {canApprove ? (
            <Button
              variant="success"
              size={size}
              disabled={pending || !vehicleId}
              onClick={() => setAction("approve")}
            >
              <Check className="h-4 w-4" aria-hidden />
              Approve Vehicle
            </Button>
          ) : null}
          {canReject ? (
            <Button
              variant="outline"
              size={size}
              disabled={pending || !vehicleId}
              onClick={() => setAction("reject")}
            >
              <X className="h-4 w-4" aria-hidden />
              Reject Vehicle
            </Button>
          ) : null}
          {canSuspend ? (
            <Button
              variant="danger"
              size={size}
              disabled={pending || !vehicleId}
              onClick={() => setAction("suspend")}
            >
              <Ban className="h-4 w-4" aria-hidden />
              Suspend
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={action !== null}
        title={action ? dialogCopy[action].title : ""}
        description={action ? dialogCopy[action].description : undefined}
        confirmLabel={action ? dialogCopy[action].confirm : "Confirm"}
        tone={action === "approve" ? "success" : action === "suspend" ? "danger" : "primary"}
        loading={pending}
        requireReason={action === "reject" || action === "suspend"}
        reasonRequired={action === "reject"}
        reasonLabel={action === "suspend" ? "Suspension reason (optional)" : "Rejection reason"}
        reasonPlaceholder={
          action === "reject"
            ? "Enter rejection reason…"
            : "Share a short explanation for the record…"
        }
        onConfirm={handleConfirm}
        onClose={() => setAction(null)}
      />
    </>
  );
}
