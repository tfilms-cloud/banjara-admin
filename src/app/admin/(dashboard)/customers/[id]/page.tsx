"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ticket, User } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ErrorState } from "@/components/error-state";
import { DetailSkeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { DetailGrid, DetailRow } from "@/components/record-details";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomer } from "@/hooks/useCustomers";
import { formatCurrency, formatDate, formatDateTime, idOf } from "@/lib/utils";
import type { BookingRecord } from "@/types/admin";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data, isPending, isError, error, refetch, isFetching } = useCustomer(id);

  if (isPending) {
    return (
      <div className="space-y-5">
        <PageHeader title="Customer" description="Loading customer profile…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Customer" />
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState
            title="Could not load this customer"
            error={error}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </div>
      </div>
    );
  }

  const customer = data.customer;
  const bookings = data.bookings ?? [];

  const columns: Column<BookingRecord>[] = [
    {
      key: "number",
      header: "Booking",
      render: (booking) => (
        <Link
          href={`/admin/bookings/${idOf(booking)}`}
          className="font-medium text-navy hover:text-sky hover:underline"
        >
          {booking.bookingNumber || idOf(booking) || "Booking"}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      secondary: true,
      render: (booking) => <span className="capitalize">{booking.bookingType || "—"}</span>,
    },
    {
      key: "date",
      header: "Created",
      secondary: true,
      render: (booking) => (
        <span className="text-xs text-muted">{formatDate(booking.createdAt)}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (booking) => formatCurrency(booking.totalAmount ?? 0, booking.currency),
    },
    {
      key: "status",
      header: "Status",
      render: (booking) => <StatusBadge status={booking.bookingStatus} />,
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to customers
      </Link>

      <PageHeader
        title={customer?.name || "Customer"}
        description={customer?.email || undefined}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <User className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow label="Name" value={customer?.name || "—"} />
              <DetailRow label="Email" value={customer?.email || "—"} />
              <DetailRow label="Phone" value={customer?.phone || "—"} />
              <DetailRow
                label="Status"
                value={
                  customer?.status ? <StatusBadge status={customer.status} /> : <span>—</span>
                }
              />
              <DetailRow label="Joined" value={formatDateTime(customer?.createdAt)} />
              <DetailRow label="Customer ID" value={idOf(customer) || "—"} />
            </DetailGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Ticket className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Booking summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow label="Total bookings" value={bookings.length} />
              <DetailRow
                label="Lifetime value"
                value={formatCurrency(
                  bookings.reduce((total, booking) => total + (booking.totalAmount ?? 0), 0)
                )}
              />
            </DetailGrid>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Bookings</h2>
        <DataTable
          columns={columns}
          rows={bookings}
          rowKey={(booking, index) => idOf(booking) || `booking-${index}`}
          emptyIcon={Ticket}
          emptyTitle="No bookings yet"
          emptyDescription="This traveller has not made any bookings on Banjara."
        />
      </div>
    </div>
  );
}
