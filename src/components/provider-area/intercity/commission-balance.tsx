"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Clock3, Copy, LoaderCircle, Wallet } from "lucide-react";
import { formatPakistanTime, formatRupees } from "@/lib/intercity";
import { useQuery } from "@/lib/live-query";
import {
  getDriverBalance,
  reportCommissionPayment,
  type DriverBalance,
  type LedgerEntry,
  type PayChannel,
} from "@/services/customer/intercity.service";
import s from "../sections/sections.module.css";
import c from "./intercity.module.css";

export const DRIVER_BALANCE_KEY = ["provider", "intercity-balance"];

const CHANNELS: Array<{ value: PayChannel; label: string }> = [
  { value: "easypaisa", label: "Easypaisa" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "bank", label: "Bank transfer" },
  { value: "raast", label: "Raast" },
  { value: "other", label: "Other" },
];
const channelLabel = (value: string | null) => CHANNELS.find((ch) => ch.value === value)?.label ?? "Payment";

/**
 * Riders pay the fare to the driver in cash; BANJARA's commission on each completed ride
 * is owed by the driver. This card shows the balance, where to pay, a form to report a
 * payment (an admin confirms it) and the history.
 */
export function CommissionBalance() {
  const balance = useQuery({ queryKey: DRIVER_BALANCE_KEY, queryFn: getDriverBalance, refetchInterval: 30_000 });
  if (balance.isPending) {
    return (
      <section className={s.card}>
        <p className={s.loading} role="status">
          <LoaderCircle size={16} className="animate-spin" /> Loading your balance…
        </p>
      </section>
    );
  }
  if (balance.isError || !balance.data) {
    return (
      <section className={s.card}>
        <p className={s.error}>{balance.error?.message ?? "Your balance could not be loaded."}</p>
      </section>
    );
  }
  return <BalanceCard data={balance.data} />;
}

function BalanceCard({ data }: { data: DriverBalance }) {
  const unclaimed = Math.max(0, data.owed - data.pendingPayments);
  return (
    <section className={s.card} aria-labelledby="ic-balance" id="commission">
      <h3 id="ic-balance" className={s.cardTitle}>
        BANJARA commission
      </h3>
      <div className={c.balanceTop}>
        <div>
          <span className={c.balanceLabel}>You owe</span>
          <strong className={c.balanceAmount} data-blocked={data.blocked || undefined}>
            {formatRupees(data.owed)}
          </strong>
          {data.pendingPayments > 0 ? (
            <span className={c.balanceNote}>
              <Clock3 size={13} /> {formatRupees(data.pendingPayments)} reported, waiting for BANJARA to confirm
            </span>
          ) : null}
        </div>
        <span className={data.blocked ? c.statusBlocked : data.owed > 0 ? c.statusDue : c.statusClear}>
          {data.blocked ? <Ban size={14} /> : data.owed > 0 ? <Wallet size={14} /> : <CheckCircle2 size={14} />}
          {data.blocked ? "Pay to take new rides" : data.owed > 0 ? "Payment due" : "All paid"}
        </span>
      </div>
      <p className={c.muted}>
        Riders pay you the fare in cash. BANJARA&apos;s commission is {data.commissionPercent}% of each completed City to
        City ride. Keep your balance under {formatRupees(data.maxDriverDue)} and pay within {data.maxDueDays} days to
        keep receiving requests.
        {data.dueSince ? ` Oldest unpaid ride: ${formatPakistanTime(data.dueSince)}.` : ""}
      </p>
      {data.blocked && data.message ? <p className={s.error}>{data.message}</p> : null}

      {data.owed > 0 ? (
        <div className={c.payBox}>
          <h4>How to pay</h4>
          {data.payTo.length ? (
            <ul className={c.payTo}>
              {data.payTo.map((account) => (
                <li key={`${account.channel}-${account.accountNumber}`}>
                  <span>
                    <strong>{channelLabel(account.channel)}</strong>
                    {account.accountTitle} · <span className={c.mono}>{account.accountNumber}</span>
                    {account.note ? <small>{account.note}</small> : null}
                  </span>
                  <CopyButton text={account.accountNumber} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={c.muted}>Contact BANJARA support for the account to pay into.</p>
          )}
          {unclaimed > 0 ? (
            <ReportForm max={unclaimed} />
          ) : (
            <p className={c.muted}>Your reported payments cover your balance. We&apos;ll confirm them shortly.</p>
          )}
        </div>
      ) : null}

      {data.entries.length ? <History entries={data.entries} /> : null}
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={s.secondary}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      aria-label={`Copy account number ${text}`}
    >
      <Copy size={14} /> {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ReportForm({ max }: { max: number }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(max));
  const [channel, setChannel] = useState<PayChannel>("easypaisa");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(false);
    const value = Math.round(Number(amount));
    if (!(value > 0) || value > max) {
      setError(`Enter an amount between Rs 1 and ${formatRupees(max)}.`);
      return;
    }
    if (reference.trim().length < 4) {
      setError("Enter the transaction ID from your payment receipt.");
      return;
    }
    setBusy(true);
    try {
      await reportCommissionPayment({ amount: value, channel, reference: reference.trim() });
      setDone(true);
      setReference("");
      await queryClient.invalidateQueries({ queryKey: DRIVER_BALANCE_KEY });
      await queryClient.invalidateQueries({ queryKey: ["provider", "intercity-requests"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The payment could not be reported.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={c.reportForm} onSubmit={submit} noValidate>
      <h4>Already paid? Tell us</h4>
      <div className={c.reportFields}>
        <label>
          Amount (Rs)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Paid with
          <select value={channel} onChange={(e) => setChannel(e.target.value as PayChannel)}>
            {CHANNELS.map((ch) => (
              <option key={ch.value} value={ch.value}>
                {ch.label}
              </option>
            ))}
          </select>
        </label>
        <label className={c.wide}>
          Transaction ID
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="From your receipt, e.g. 0123456789"
            maxLength={80}
            required
            autoComplete="off"
          />
        </label>
      </div>
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className={c.sent} role="status">
          <CheckCircle2 size={15} /> Payment reported. It counts once BANJARA confirms it.
        </p>
      ) : null}
      <button type="submit" className={s.primary} disabled={busy}>
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : null}
        Report payment
      </button>
    </form>
  );
}

function History({ entries }: { entries: LedgerEntry[] }) {
  return (
    <details className={c.history}>
      <summary>History</summary>
      <ul className={s.list}>
        {entries.map((e) => (
          <li key={e.id} className={s.row}>
            <div className={s.rowMain}>
              <strong>
                {e.kind === "commission"
                  ? `Commission · ${e.route ?? "City to City ride"}`
                  : `${channelLabel(e.channel)} payment · ${e.reference ?? ""}`}
              </strong>
              <span>
                {formatPakistanTime(e.createdAt)}
                {e.kind === "commission" && e.fare
                  ? ` · ${e.percent}% of ${formatRupees(e.fare)}${e.bookingNumber ? ` · ${e.bookingNumber}` : ""}`
                  : ""}
                {e.status === "rejected" && e.rejectionReason ? ` · ${e.rejectionReason}` : ""}
              </span>
            </div>
            <div className={s.rowSide}>
              <strong>{e.kind === "commission" ? `+${formatRupees(e.amount)}` : `−${formatRupees(e.amount)}`}</strong>
              {e.kind === "payment" ? (
                <span
                  className={`${s.badge} ${
                    e.status === "approved" ? s.badgeGreen : e.status === "rejected" ? s.badgeRed : s.badgeAmber
                  }`}
                >
                  {e.status === "approved" ? "Confirmed" : e.status === "rejected" ? "Not verified" : "Waiting"}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

export type { DriverBalance };
