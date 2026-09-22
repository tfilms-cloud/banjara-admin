"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Ticket } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/hooks/useBookings";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { filterByPaths, refLabel } from "@/lib/records";
import { formatCurrency, formatDate, idOf } from "@/lib/utils";
import type { BookingRecord } from "@/types/admin";

type BookingTab = "all" | "transport" | "hotel" | "package";

const TABS: FilterTab<BookingTab>[] = [
  { value: "all", label: "All" },
  { value: "transport", label: "Transport" },
  { value: "hotel", label: "Hotel" },
  { value: "package", label: "Package" },
];

const SEARCH_PATHS = [
  "bookingNumber",
  "bookingStatus",
  "paymentStatus",
  "customerId.name",
  "customerId.email",
  "providerId.businessName",
];

export default function BookingsPage() {
  const [tab, setTab] = useState<BookingTab>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useBookings();

  const rows = useMemo(() => {
    const items = data ?? [];
    const scoped = tab === "all" ? items : items.filter((item) => item.bookingType === tab);
    return filterByPaths(scoped, debouncedSearch, SEARCH_PATHS);
  }, [data, tab, debouncedSearch]);

  const columns: Column<BookingRecord>[] = [
    {
      key: "booking",
      header: "Booking",
      render: (booking) => (
        <div className="min-w-0">
          <Link
            href={`/admin/bookings/${idOf(booking)}`}
            className="block truncate font-medium text-navy hover:text-sky hover:underline"
          >
            {booking.bookingNumber || idOf(booking) || "Booking"}
          </Link>
          <p className="truncate text-xs capitalize text-muted">{booking.bookingType || "—"}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (booking) => refLabel(booking.customerId),
    },
    {
      key: "provider",
      header: "Provider",
      secondary: true,
      render: (booking) => refLabel(booking.providerId),
    },
    {
      key: "created",
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
      render: (booking) => (
        <span className="font-medium text-navy">
          {formatCurrency(booking.totalAmount ?? 0, booking.currency)}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      secondary: true,
      render: (booking) => <StatusBadge status={booking.paymentStatus} />,
    },
    {
      key: "status",
      header: "Status",
      render: (booking) => <StatusBadge status={booking.bookingStatus} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (booking) => (
        <Link href={`/admin/bookings/${idOf(booking)}`}>
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
        title="Bookings"
        description="Every transport, hotel and package booking made on BANJARA."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search booking number or customer…"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(booking, index) => idOf(booking) || `booking-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={Ticket}
        emptyTitle="No bookings found"
        emptyDescription="Bookings confirmed by travellers will appear here."
        caption={`${rows.length} booking${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
