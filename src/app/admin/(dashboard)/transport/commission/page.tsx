"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Plus, Trash2, Wallet, X } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  approveCommissionPayment,
  getCommissionSettings,
  listCommissionPayments,
  rejectCommissionPayment,
  saveCommissionSettings,
  type CommissionPayment,
  type CommissionSettings,
} from "@/services/admin.service";
import { formatCurrency, formatDate } from "@/lib/utils";

type Tab = "pending" | "approved" | "rejected" | "all";
const TABS: FilterTab<Tab>[] = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];
const CHANNELS = [
  { value: "easypaisa", label: "Easypaisa" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "bank", label: "Bank transfer" },
  { value: "raast", label: "Raast" },
  { value: "other", label: "Other" },
];
const channelLabel = (value: string | null) => CHANNELS.find((c) => c.value === value)?.label ?? value ?? "—";
const PAYMENTS_KEY = ["admin", "intercity-commission", "payments"] as const;
const SETTINGS_KEY = ["admin", "intercity-commission", "settings"] as const;

/**
 * City to City commission. Riders pay drivers the fare in cash, so drivers owe BANJARA its
 * commission. Drivers report the payments they make; check each one in the receiving
 * account and approve it (it reduces their balance) or reject it.
 */
export default function CommissionPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const queryClient = useQueryClient();
  const payments = useQuery({ queryKey: [...PAYMENTS_KEY, tab], queryFn: () => listCommissionPayments(tab) });
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: (input: { id: string; decision: "approve" | "reject"; reason?: string }) =>
      input.decision === "approve"
        ? approveCommissionPayment(input.id)
        : rejectCommissionPayment(input.id, input.reason ?? ""),
    onSuccess: () => {
      setRejecting(null);
      setReason("");
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "That didn't work. Please try again."),
  });

  const rows = useMemo(() => payments.data ?? [], [payments.data]);
  const waitingTotal = rows.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);

  const columns: Column<CommissionPayment>[] = [
    {
      key: "driver",
      header: "Driver",
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-navy">{p.driverName}</p>
          <p className="truncate text-xs text-muted">
            Owes {formatCurrency(p.driverOwed)}
            {p.driverBlocked ? " · blocked" : ""}
            {p.driverPhone ? ` · ${p.driverPhone}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (p) => (
        <div className="min-w-0">
          <p className="font-semibold text-navy">{formatCurrency(p.amount)}</p>
          <p className="truncate text-xs text-muted">
            {channelLabel(p.channel)} · <span className="font-mono">{p.reference}</span>
          </p>
        </div>
      ),
    },
    {
      key: "reported",
      header: "Reported",
      secondary: true,
      render: (p) => formatDate(p.createdAt),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <div className="min-w-0">
          <StatusBadge status={p.status} />
          {p.status === "rejected" && p.rejectionReason ? (
            <p className="mt-1 truncate text-xs text-muted">{p.rejectionReason}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) =>
        p.status !== "pending" ? null : rejecting === p.id ? (
          <form
            className="flex items-center justify-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              review.mutate({ id: p.id, decision: "reject", reason });
            }}
          >
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason (shown to the driver)"
              aria-label="Reason for rejecting"
              className="h-8 w-56 text-xs"
              maxLength={300}
              autoFocus
            />
            <Button type="submit" variant="danger" size="sm" loading={review.isPending}>
              Reject
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(null)} aria-label="Cancel">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        ) : (
          <div className="flex justify-end gap-2">
            <Button
              variant="success"
              size="sm"
              loading={review.isPending && review.variables?.id === p.id && review.variables.decision === "approve"}
              onClick={() => review.mutate({ id: p.id, decision: "approve" })}
            >
              <Check className="h-4 w-4" aria-hidden />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejecting(p.id);
                setReason("");
              }}
            >
              <Ban className="h-4 w-4" aria-hidden />
              Reject
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="City to City commission"
        description="Drivers collect the fare in cash and owe BANJARA its commission. Check each reported payment in the receiving account, then approve it to clear the driver's balance."
        actions={
          <Button variant="outline" size="sm" onClick={() => void payments.refetch()} loading={payments.isFetching}>
            Refresh
          </Button>
        }
      />
      <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
      {actionError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        loading={payments.isPending}
        error={payments.isError ? payments.error : undefined}
        onRetry={() => void payments.refetch()}
        emptyIcon={Wallet}
        emptyTitle={tab === "pending" ? "No payments waiting" : "No payments"}
        emptyDescription="Payments drivers report appear here for you to confirm."
        caption={
          tab === "pending" && rows.length
            ? `${rows.length} waiting · ${formatCurrency(waitingTotal)}`
            : `${rows.length} payment${rows.length === 1 ? "" : "s"}`
        }
      />
      <SettingsCard />
    </div>
  );
}

function SettingsCard() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: getCommissionSettings });
  // Edits live here; until the admin changes something, the form shows the saved settings.
  const [edits, setDraft] = useState<CommissionSettings | null>(null);
  const draft = edits ?? settings.data ?? null;
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (input: CommissionSettings) => saveCommissionSettings(input),
    onSuccess: (data) => {
      setDraft(data);
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });

  if (!draft) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted">
          {settings.isError ? settings.error.message : "Loading commission settings…"}
        </CardContent>
      </Card>
    );
  }
  const set = (patch: Partial<CommissionSettings>) => {
    setSaved(false);
    setDraft({ ...draft, ...patch });
  };
  const accounts = draft.collectionAccounts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission settings</CardTitle>
        <CardDescription>
          Applies to rides completed from now on. Drivers over the limit, or with commission unpaid for longer than
          the allowed days, stop receiving new City to City requests until they pay.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({
              ...draft,
              collectionAccounts: accounts.filter((a) => a.accountTitle.trim() && a.accountNumber.trim()),
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-navy">
              Commission (% of fare)
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={draft.commissionPercent}
                onChange={(e) => set({ commissionPercent: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-navy">
              Block above (Rs owed)
              <Input
                type="number"
                min={0}
                step={500}
                value={draft.maxDriverDue}
                onChange={(e) => set({ maxDriverDue: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-navy">
              Block after (days unpaid)
              <Input
                type="number"
                min={0}
                max={365}
                value={draft.maxDueDays}
                onChange={(e) => set({ maxDueDays: Number(e.target.value) })}
              />
            </label>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-navy">Where drivers pay BANJARA</legend>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted">No accounts yet. Drivers are told to contact support to pay.</p>
            ) : null}
            {accounts.map((account, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[160px_1fr_1fr_auto]">
                <Select
                  aria-label="Channel"
                  value={account.channel}
                  options={CHANNELS}
                  onChange={(e) =>
                    set({ collectionAccounts: accounts.map((a, i) => (i === index ? { ...a, channel: e.target.value } : a)) })
                  }
                />
                <Input
                  aria-label="Account title"
                  placeholder="Account title"
                  value={account.accountTitle}
                  onChange={(e) =>
                    set({ collectionAccounts: accounts.map((a, i) => (i === index ? { ...a, accountTitle: e.target.value } : a)) })
                  }
                />
                <Input
                  aria-label="Account number"
                  placeholder="Account / IBAN / mobile number"
                  value={account.accountNumber}
                  onChange={(e) =>
                    set({ collectionAccounts: accounts.map((a, i) => (i === index ? { ...a, accountNumber: e.target.value } : a)) })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove account"
                  onClick={() => set({ collectionAccounts: accounts.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set({ collectionAccounts: [...accounts, { channel: "easypaisa", accountTitle: "", accountNumber: "" }] })
              }
              disabled={accounts.length >= 10}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add account
            </Button>
          </fieldset>

          {save.isError ? (
            <p role="alert" className="text-sm text-red-700">
              {save.error instanceof Error ? save.error.message : "Settings could not be saved."}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={save.isPending}>
              Save settings
            </Button>
            {saved ? <span className="text-sm text-green">Saved</span> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
