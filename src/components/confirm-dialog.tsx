"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: NonNullable<ButtonProps["variant"]>;
  loading?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Share a short explanation for the record…",
  reasonRequired = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [wasOpen, setWasOpen] = useState(open);

  // Clear the reason each time the dialog is opened for a new action.
  if (open !== wasOpen) {
    setWasOpen(open);
    setReason("");
  }

  const missingReason = requireReason && reasonRequired && reason.trim().length === 0;

  return (
    <Dialog
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      description={description}
      dismissible={!loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            loading={loading}
            disabled={missingReason}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {requireReason ? (
        <div className="space-y-2">
          <label htmlFor="confirm-reason" className="text-sm font-medium text-navy">
            {reasonLabel}
            {reasonRequired ? <span className="text-danger"> *</span> : null}
          </label>
          <Textarea
            id="confirm-reason"
            value={reason}
            placeholder={reasonPlaceholder}
            onChange={(event) => setReason(event.target.value)}
            invalid={missingReason}
          />
          {missingReason ? (
            <p className="text-xs text-danger">A reason is required for this action.</p>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
