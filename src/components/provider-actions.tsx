"use client";

import { useState } from "react";
import { Ban, Check, X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  useApproveProvider,
  useRejectProvider,
  useSuspendProvider,
} from "@/hooks/useProviders";
import { idOf } from "@/lib/utils";
import type { ProviderProfile } from "@/types/admin";

type ActionKind = "approve" | "reject" | "suspend";

export type ProviderActionsProps = {
  provider: ProviderProfile;
  size?: ButtonProps["size"];
  className?: string;
};

export function ProviderActions({ provider, size = "sm", className }: ProviderActionsProps) {
  const providerId = idOf(provider);
  const [action, setAction] = useState<ActionKind | null>(null);

  const approve = useApproveProvider();
  const reject = useRejectProvider();
  const suspend = useSuspendProvider();

  const status = provider.verificationStatus;
  const canApprove = status !== "approved";
  const canReject = status !== "rejected";
  const canSuspend = status === "approved";

  const pending =
    approve.isPending || reject.isPending || suspend.isPending;

  const handleConfirm = async (reason: string) => {
    if (!providerId || !action) return;
    try {
      if (action === "approve") await approve.mutateAsync(providerId);
      if (action === "reject") await reject.mutateAsync({ id: providerId, reason });
      if (action === "suspend") await suspend.mutateAsync({ id: providerId, reason });
      setAction(null);
    } catch {
      // Errors are surfaced by the mutation's toast handler.
    }
  };

  const dialogCopy: Record<ActionKind, { title: string; description: string; confirm: string }> = {
    approve: {
      title: "Approve this provider?",
      description: (provider.services ?? []).includes("transport")
        ? `${provider.businessName || "This driver"} will go live, and the vehicle they registered is approved too, so they can publish rides and accept bookings straight away.`
        : (provider.services ?? []).includes("hotel")
          ? `${provider.businessName || "This property"} will go live, and its hotel listing is published too, so travellers can book its rooms straight away.`
          : `${provider.businessName || "This provider"} will go live and can start accepting bookings.`,
      confirm: "Approve provider",
    },
    reject: {
      title: "Reject this application?",
      description: "The applicant will be notified that their application was not accepted.",
      confirm: "Reject application",
    },
    suspend: {
      title: "Suspend this provider?",
      description: "Listings will be hidden and new bookings blocked until the provider is reinstated.",
      confirm: "Suspend provider",
    },
  };

  return (
    <>
      <div className={className}>
        <div className="flex flex-wrap items-center gap-2">
          {canApprove ? (
            <Button
              variant="success"
              size={size}
              disabled={pending || !providerId}
              onClick={() => setAction("approve")}
            >
              <Check className="h-4 w-4" aria-hidden />
              Approve
            </Button>
          ) : null}
          {canReject ? (
            <Button
              variant="outline"
              size={size}
              disabled={pending || !providerId}
              onClick={() => setAction("reject")}
            >
              <X className="h-4 w-4" aria-hidden />
              Reject
            </Button>
          ) : null}
          {canSuspend ? (
            <Button
              variant="danger"
              size={size}
              disabled={pending || !providerId}
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
        reasonLabel={action === "suspend" ? "Suspension reason" : "Rejection reason"}
        onConfirm={handleConfirm}
        onClose={() => setAction(null)}
      />
    </>
  );
}
