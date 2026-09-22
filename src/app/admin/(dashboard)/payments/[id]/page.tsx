"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { DetailSkeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { DetailGrid, DetailRow } from "@/components/record-details";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePayment } from "@/hooks/usePayments";
import { refLabel } from "@/lib/records";
import { formatCurrency, formatDateTime, idOf } from "@/lib/utils";

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data: payment, isPending, isError, error, refetch, isFetching } = usePayment(id);

  if (isPending) {
    return (
      <div className="space-y-5">
        <PageHeader title="Payment" description="Loading payment details…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <div className="space-y-5">
        <PageHeader title="Payment" />
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState
            title="Could not load this payment"
            error={error}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </div>
      </div>
    );
  }

  const bookingId = idOf(payment.bookingId);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/payments"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to payments
      </Link>

      <PageHeader
        title={payment.transactionId || "Payment"}
        description={formatDateTime(payment.paidAt ?? payment.createdAt)}
        actions={<StatusBadge status={payment.status} />}
      />

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <CreditCard className="h-4 w-4 text-sky" aria-hidden />
          <CardTitle>Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailRow
              label="Amount"
              value={
                <span className="text-lg font-semibold text-navy">
                  {formatCurrency(payment.amount ?? 0, payment.currency)}
                </span>
              }
            />
            <DetailRow
              label="Method"
              value={<span className="capitalize">{payment.method || "—"}</span>}
            />
            <DetailRow label="Status" value={<StatusBadge status={payment.status} />} />
            <DetailRow label="Transaction ID" value={payment.transactionId || "—"} />
            <DetailRow label="Customer" value={refLabel(payment.customerId)} />
            <DetailRow label="Provider" value={refLabel(payment.providerId)} />
            <DetailRow
              label="Booking"
              value={
                bookingId ? (
                  <Link
                    href={`/admin/bookings/${bookingId}`}
                    className="text-sky hover:underline"
                  >
                    {refLabel(payment.bookingId, bookingId)}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow label="Paid at" value={formatDateTime(payment.paidAt)} />
            <DetailRow label="Created" value={formatDateTime(payment.createdAt)} />
          </DetailGrid>
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" onClick={() => void refetch()} loading={isFetching}>
        Refresh details
      </Button>
    </div>
  );
}
