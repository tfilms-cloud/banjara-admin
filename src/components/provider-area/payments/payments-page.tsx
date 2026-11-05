"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@/lib/live-query";
import {
  addReceivingAccount,
  getPaymentHistory,
  getReceivingAccounts,
  removeReceivingAccount,
  updateReceivingAccount,
  type AccountInput,
  type PayoutChannel,
  type ReceivingAccount,
} from "@/services/customer/provider-payments.service";
import {
  methodLabel,
  paymentLabel,
  rupees,
  when,
} from "../bookings/booking-format";
import p from "./payments.module.css";

const CHANNELS: Array<{
  value: PayoutChannel;
  label: string;
  icon: LucideIcon;
  hint: string;
}> = [
  {
    value: "easypaisa",
    label: "Easypaisa",
    icon: Smartphone,
    hint: "Mobile wallet",
  },
  {
    value: "jazzcash",
    label: "JazzCash",
    icon: Smartphone,
    hint: "Mobile wallet",
  },
  {
    value: "bank",
    label: "Bank account",
    icon: Building2,
    hint: "IBAN or account number",
  },
  { value: "raast", label: "Raast", icon: Zap, hint: "Raast IBAN or mobile" },
];
const channelOf = (value: string) =>
  CHANNELS.find((c) => c.value === value) ?? CHANNELS[0];

/* Same checks as the backend (validators/payment.validator.ts). */
function validateAccount(
  input: AccountInput,
  editing: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const id = input.identifier.replace(/[\s-]/g, "");
  const digits = id.replace(/\D/g, "");
  if (input.label.trim().length < 2)
    errors.label = "Give this account a short name, e.g. “My Easypaisa”";
  if (input.accountTitle.trim().length < 3)
    errors.accountTitle = "Enter the name on the account";
  else if (!/^[A-Za-z؀-ۿݐ-ݿ\s.'’-]+$/.test(input.accountTitle.trim()))
    errors.accountTitle = "Use letters only, exactly as on the account";
  if (!editing || id) {
    if (input.channel === "easypaisa" || input.channel === "jazzcash") {
      const mobile =
        digits.startsWith("92") && digits.length === 12
          ? `0${digits.slice(2)}`
          : digits;
      if (!/^03\d{9}$/.test(mobile))
        errors.identifier = "Enter the mobile number (03XXXXXXXXX)";
    } else if (input.channel === "bank") {
      if (
        !/^PK\d{2}[A-Z0-9]{20}$/.test(id.toUpperCase()) &&
        !/^\d{8,20}$/.test(digits)
      )
        errors.identifier =
          "Enter an IBAN (PK… 24 characters) or account number (8–20 digits)";
      if (!input.bankName?.trim()) errors.bankName = "Enter the bank name";
    } else if (input.channel === "raast") {
      const mobile =
        digits.startsWith("92") && digits.length === 12
          ? `0${digits.slice(2)}`
          : digits;
      if (
        !/^PK\d{2}[A-Z0-9]{20}$/.test(id.toUpperCase()) &&
        !/^03\d{9}$/.test(mobile)
      )
        errors.identifier =
          "Enter a Raast IBAN (PK…) or mobile number (03XXXXXXXXX)";
    }
  }
  return errors;
}

/** /provider/payments — where travellers' money goes, and what has come in. */
export function PaymentsPage() {
  const accounts = useQuery({
    queryKey: ["provider", "receiving-accounts"],
    queryFn: getReceivingAccounts,
  });
  const history = useQuery({
    queryKey: ["provider", "payment-history"],
    queryFn: () => getPaymentHistory(30),
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const list = accounts.data ?? [];
  const activeCount = list.filter((a) => a.active).length;

  return (
    <div className={p.page}>
      <p className={p.intro}>
        Travellers who pay online send money straight to your accounts below.
        You confirm each payment on the booking before it’s confirmed.
      </p>

      <section className={p.card} aria-labelledby="pay-accounts">
        <header className={p.cardHead}>
          <div>
            <h3 id="pay-accounts">Receiving accounts</h3>
            <p>
              Shown to travellers on the payment screen, with the number partly
              hidden until they pay.
            </p>
          </div>
          {!adding ? (
            <button
              type="button"
              className={p.primary}
              onClick={() => {
                setAdding(true);
                setEditing(null);
              }}
            >
              <Plus size={15} /> Add account
            </button>
          ) : null}
        </header>

        {accounts.isSuccess && activeCount === 0 ? (
          <p className={p.warn}>
            <AlertTriangle size={15} /> No active account yet — travellers can
            only book with cash until you add one.
          </p>
        ) : null}

        {adding ? <AccountForm onDone={() => setAdding(false)} /> : null}

        {accounts.isPending ? (
          <p className={p.loading}>
            <LoaderCircle size={15} className="animate-spin" /> Loading
            accounts…
          </p>
        ) : accounts.isError ? (
          <p className={p.error}>{accounts.error.message}</p>
        ) : list.length ? (
          <ul className={p.accounts}>
            {list.map((account) =>
              editing === account.id ? (
                <li key={account.id}>
                  <AccountForm
                    account={account}
                    onDone={() => setEditing(null)}
                  />
                </li>
              ) : (
                <AccountRow
                  key={account.id}
                  account={account}
                  onEdit={() => {
                    setEditing(account.id);
                    setAdding(false);
                  }}
                />
              ),
            )}
          </ul>
        ) : !adding ? (
          <p className={p.empty}>
            Add an Easypaisa, JazzCash, bank or Raast account to accept online
            payments.
          </p>
        ) : null}
      </section>

      <section className={p.card} aria-labelledby="pay-history">
        <header className={p.cardHead}>
          <div>
            <h3 id="pay-history">Recent payments</h3>
            <p>
              Payments from travellers for your bookings. Open one to see its
              booking.
            </p>
          </div>
        </header>
        {history.isPending ? (
          <p className={p.loading}>
            <LoaderCircle size={15} className="animate-spin" /> Loading
            payments…
          </p>
        ) : history.isError ? (
          <p className={p.error}>{history.error.message}</p>
        ) : history.data?.length ? (
          <ul className={p.history}>
            {history.data.map((pay) => (
              <li key={pay.id}>
                <Link
                  href={
                    pay.bookingId
                      ? `/provider/bookings/${pay.bookingId}`
                      : "/provider/bookings"
                  }
                >
                  <span className={p.histIcon}>
                    <Wallet size={16} />
                  </span>
                  <span className={p.histMain}>
                    <strong>{rupees(pay.amount)}</strong>
                    <span>
                      {methodLabel(pay.method)}
                      {pay.reference && !pay.reference.startsWith("TXN-")
                        ? ` · Ref ${pay.reference}`
                        : ""}{" "}
                      · {when(pay.paidAt || pay.createdAt)}
                    </span>
                  </span>
                  <span className={`${p.badge} ${tone(pay.status)}`}>
                    {paymentLabel(pay.status, "")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={p.empty}>No payments yet.</p>
        )}
      </section>

      <section className={p.card} aria-labelledby="pay-topup">
        <header className={p.cardHead}>
          <div>
            <h3 id="pay-topup">Top-up</h3>
            <p>
              Adding balance to your BANJARA account is coming to the website
              soon. You can top up in the BANJARA app today.
            </p>
          </div>
        </header>
      </section>
    </div>
  );
}

function tone(status: string) {
  if (["paid", "confirmed"].includes(status)) return p.green;
  if (
    [
      "proof_submitted",
      "under_review",
      "payment_initiated",
      "pending",
      "unpaid",
      "refund_pending",
    ].includes(status)
  )
    return p.amber;
  if (["rejected", "failed", "disputed"].includes(status)) return p.red;
  return "";
}

function AccountRow({
  account,
  onEdit,
}: {
  account: ReceivingAccount;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");
  const channel = channelOf(account.channel);
  const Icon = channel.icon;

  const run = async (task: () => Promise<unknown>) => {
    setError("");
    setBusy(true);
    try {
      await task();
      await queryClient.invalidateQueries({
        queryKey: ["provider", "receiving-accounts"],
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`${p.account} ${account.active ? "" : p.inactive}`}>
      <span className={p.accIcon}>
        <Icon size={17} />
      </span>
      <span className={p.accMain}>
        <strong>
          {account.label} <span className={p.channel}>{channel.label}</span>
        </strong>
        <span>
          {account.accountTitle} ·{" "}
          <span className={p.mono}>{account.displayIdentifier}</span>
          {account.bankName ? ` · ${account.bankName}` : ""}
        </span>
        {error ? <span className={p.inlineError}>{error}</span> : null}
      </span>
      {confirmRemove ? (
        <span className={p.confirm}>
          Remove?
          <button
            type="button"
            className={p.ghost}
            onClick={() => setConfirmRemove(false)}
            disabled={busy}
          >
            Keep
          </button>
          <button
            type="button"
            className={p.danger}
            onClick={() => void run(() => removeReceivingAccount(account.id))}
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}{" "}
            Remove
          </button>
        </span>
      ) : (
        <span className={p.accActions}>
          <label
            className={p.switch}
            title={
              account.active ? "Shown to travellers" : "Hidden from travellers"
            }
          >
            <input
              type="checkbox"
              checked={account.active}
              disabled={busy}
              onChange={(event) =>
                void run(() =>
                  updateReceivingAccount(account.id, {
                    active: event.target.checked,
                  }),
                )
              }
            />
            <span aria-hidden="true" />
            {account.active ? "Active" : "Off"}
          </label>
          <button
            type="button"
            className={p.iconBtn}
            onClick={onEdit}
            aria-label={`Edit ${account.label}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className={p.iconBtn}
            onClick={() => setConfirmRemove(true)}
            aria-label={`Remove ${account.label}`}
          >
            <Trash2 size={14} />
          </button>
        </span>
      )}
    </li>
  );
}

function AccountForm({
  account,
  onDone,
}: {
  account?: ReceivingAccount;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const editing = Boolean(account);
  const [form, setForm] = useState<AccountInput>({
    channel: account?.channel ?? "easypaisa",
    label: account?.label ?? "",
    accountTitle: account?.accountTitle ?? "",
    identifier: "",
    bankName: account?.bankName ?? "",
    branch: account?.branch ?? "",
    instructions: account?.instructions ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: keyof AccountInput, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const isMobile = form.channel === "easypaisa" || form.channel === "jazzcash";

  const save = async () => {
    const next = validateAccount(form, editing);
    setErrors(next);
    if (Object.keys(next).length) return;
    setError("");
    setSaving(true);
    try {
      if (account) {
        const { channel: _channel, ...rest } = form;
        void _channel;
        await updateReceivingAccount(account.id, rest);
      } else {
        await addReceivingAccount(form);
      }
      await queryClient.invalidateQueries({
        queryKey: ["provider", "receiving-accounts"],
      });
      onDone();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn’t save this account.",
      );
      setSaving(false);
    }
  };

  return (
    <div className={p.form}>
      <h4>{editing ? `Edit ${account?.label}` : "Add a receiving account"}</h4>
      {!editing ? (
        <div className={p.channels} role="radiogroup" aria-label="Account type">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const on = form.channel === c.value;
            return (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={on}
                className={`${p.channelBtn} ${on ? p.channelOn : ""}`}
                onClick={() => set("channel", c.value)}
              >
                <Icon size={16} />
                <span>
                  <strong>{c.label}</strong>
                  <small>{c.hint}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {error ? <p className={p.error}>{error}</p> : null}
      <div className={p.row2}>
        <Field label="Name for this account *" error={errors.label}>
          <input
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder={`e.g. My ${channelOf(form.channel).label}`}
            maxLength={40}
          />
        </Field>
        <Field
          label="Account holder name *"
          error={errors.accountTitle}
          hint="Exactly as registered on the account"
        >
          <input
            value={form.accountTitle}
            onChange={(e) => set("accountTitle", e.target.value)}
            placeholder="e.g. Ayesha Khan"
            maxLength={80}
          />
        </Field>
      </div>
      <Field
        label={
          isMobile
            ? `${channelOf(form.channel).label} mobile number ${editing ? "" : "*"}`
            : form.channel === "bank"
              ? `IBAN or account number ${editing ? "" : "*"}`
              : `Raast IBAN or mobile number ${editing ? "" : "*"}`
        }
        error={errors.identifier}
        hint={
          editing
            ? `Current: ${account?.displayIdentifier}. Leave empty to keep it.`
            : undefined
        }
      >
        <input
          value={form.identifier}
          onChange={(e) => set("identifier", e.target.value)}
          inputMode={isMobile ? "numeric" : "text"}
          placeholder={
            isMobile
              ? "03XXXXXXXXX"
              : form.channel === "bank"
                ? "PK36SCBL0000001123456702"
                : "PK… or 03XXXXXXXXX"
          }
          maxLength={64}
        />
      </Field>
      {form.channel === "bank" ? (
        <div className={p.row2}>
          <Field label="Bank name *" error={errors.bankName}>
            <input
              value={form.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              placeholder="e.g. Meezan Bank"
              maxLength={80}
            />
          </Field>
          <Field label="Branch (optional)">
            <input
              value={form.branch}
              onChange={(e) => set("branch", e.target.value)}
              placeholder="e.g. Gilgit main"
              maxLength={60}
            />
          </Field>
        </div>
      ) : null}
      <Field label="Note for travellers (optional)">
        <input
          value={form.instructions}
          onChange={(e) => set("instructions", e.target.value)}
          placeholder="e.g. Add your booking number in the reference"
          maxLength={300}
        />
      </Field>
      <div className={p.formActions}>
        <button
          type="button"
          className={p.ghost}
          onClick={onDone}
          disabled={saving}
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="button"
          className={p.primary}
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}{" "}
          {editing ? "Save changes" : "Add account"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={p.field}>
      <span className={p.label}>{label}</span>
      <span className={`${p.control} ${error ? p.controlError : ""}`}>
        {children}
      </span>
      {error ? (
        <span className={p.fieldError}>{error}</span>
      ) : hint ? (
        <span className={p.hint}>{hint}</span>
      ) : null}
    </label>
  );
}
