"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Receipt, Ticket, User } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { DetailSkeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { DetailGrid, DetailRow, RecordDetails } from "@/components/record-details";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBooking } from "@/hooks/useBookings";
import { refLabel } from "@/lib/records";
import { formatCurrency, formatDateTime, idOf } from "@/lib/utils";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data: booking, isPending, isError, error, refetch, isFetching } = useBooking(id);

  if (isPending) {
    return (
      <div className="space-y-5">
        <PageHeader title="Booking" description="Loading booking details…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="space-y-5">
        <PageHeader title="Booking" />
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState
            title="Could not load this booking"
            error={error}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </div>
      </div>
    );
  }

  const currency = booking.currency;
  const details =
    booking.bookingType === "hotel" ? booking.hotelBooking : booking.transportBooking;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to bookings
      </Link>

      <PageHeader
        title={booking.bookingNumber || "Booking"}
        description={`${booking.bookingType ?? "booking"} · created ${formatDateTime(
          booking.createdAt
        )}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.bookingStatus} />
            <StatusBadge status={booking.paymentStatus} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <User className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow label="Customer" value={refLabel(booking.customerId)} />
              <DetailRow label="Provider" value={refLabel(booking.providerId)} />
              <DetailRow label="Booking ID" value={idOf(booking) || "—"} />
              <DetailRow label="Last updated" value={formatDateTime(booking.updatedAt)} />
            </DetailGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Receipt className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow
                label="Subtotal"
                value={formatCurrency(booking.subtotal ?? 0, currency)}
              />
              <DetailRow label="Tax" value={formatCurrency(booking.tax ?? 0, currency)} />
              <DetailRow
                label="Service fee"
                value={formatCurrency(booking.serviceFee ?? 0, currency)}
              />
              <DetailRow
                label="Discount"
                value={formatCurrency(booking.discount ?? 0, currency)}
              />
            </DetailGrid>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium text-muted">Total</span>
              <span className="text-lg font-semibold text-navy">
                {formatCurrency(booking.totalAmount ?? 0, currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {details ? (
        <RecordDetails
          record={details}
          title={booking.bookingType === "hotel" ? "Stay details" : "Journey details"}
        />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Ticket className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Booking details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">
              The API did not return itinerary details for this booking.
            </p>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" size="sm" onClick={() => void refetch()} loading={isFetching}>
        Refresh details
      </Button>
    </div>
  );
}
