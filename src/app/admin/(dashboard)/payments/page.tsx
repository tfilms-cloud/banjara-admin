"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePayments } from "@/hooks/usePayments";
import { filterByPaths, refLabel } from "@/lib/records";
import { formatCurrency, formatDate, idOf } from "@/lib/utils";
import type { PaymentRecord } from "@/types/admin";

type PaymentTab = "all" | "paid" | "pending" | "failed" | "refunded";

const TABS: FilterTab<PaymentTab>[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const SEARCH_PATHS = [
  "transactionId",
  "method",
  "status",
  "customerId.name",
  "providerId.businessName",
];

export default function PaymentsPage() {
  const [tab, setTab] = useState<PaymentTab>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = usePayments();

  const payments = useMemo(() => data ?? [], [data]);

  const rows = useMemo(() => {
    const scoped =
      tab === "all"
        ? payments
        : payments.filter((payment) => (payment.status ?? "").toLowerCase() === tab);
    return filterByPaths(scoped, debouncedSearch, SEARCH_PATHS);
  }, [payments, tab, debouncedSearch]);

  const settled = useMemo(
    () =>
      payments
        .filter((payment) => (payment.status ?? "").toLowerCase() === "paid")
        .reduce((total, payment) => total + (payment.amount ?? 0), 0),
    [payments]
  );

  const refunded = useMemo(
    () =>
      payments
        .filter((payment) => (payment.status ?? "").toLowerCase() === "refunded")
        .reduce((total, payment) => total + (payment.amount ?? 0), 0),
    [payments]
  );

  const columns: Column<PaymentRecord>[] = [
    {
      key: "transaction",
      header: "Transaction",
      render: (payment) => (
        <div className="min-w-0">
          <Link
            href={`/admin/payments/${idOf(payment)}`}
            className="block truncate font-medium text-navy hover:text-sky hover:underline"
          >
            {payment.transactionId || idOf(payment) || "Payment"}
          </Link>
          <p className="truncate text-xs capitalize text-muted">{payment.method || "—"}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      secondary: true,
      render: (payment) => refLabel(payment.customerId),
    },
    {
      key: "booking",
      header: "Booking",
      secondary: true,
      render: (payment) => refLabel(payment.bookingId),
    },
    {
      key: "date",
      header: "Date",
      secondary: true,
      render: (payment) => (
        <span className="text-xs text-muted">{formatDate(payment.paidAt ?? payment.createdAt)}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (payment) => (
        <span className="font-medium text-navy">
          {formatCurrency(payment.amount ?? 0, payment.currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (payment) => (
        <Link href={`/admin/payments/${idOf(payment)}`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" aria-hidden />
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        description="Settlement activity across the BANJARA platform."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      {!isPending && !isError && payments.length ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Transactions" value={payments.length} icon={CreditCard} tone="navy" />
          <StatCard label="Settled" value={formatCurrency(settled)} tone="green" />
          <StatCard label="Refunded" value={formatCurrency(refunded)} tone="amber" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search transaction or customer…"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(payment, index) => idOf(payment) || `payment-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={CreditCard}
        emptyTitle="No payments found"
        emptyDescription="Payments captured through BANJARA will appear here."
        caption={`${rows.length} payment${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
