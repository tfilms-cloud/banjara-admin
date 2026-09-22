"use client";

import { useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAvailability, useRooms } from "@/hooks/useRooms";
import { firstNumber, firstText, refLabel } from "@/lib/records";
import { formatCurrency, formatDate, idOf } from "@/lib/utils";

export default function AvailabilityPage() {
  const [roomId, setRoomId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const roomsQuery = useRooms();
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useAvailability({
    roomId: roomId || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const roomOptions = useMemo(() => {
    const rooms = roomsQuery.data ?? [];
    return [
      { label: "All rooms", value: "" },
      ...rooms.map((room, index) => ({
        label: `${firstText(room, ["name", "roomType", "type"], `Room ${index + 1}`)} · ${refLabel(
          (room as Record<string, unknown>)?.hotelId,
          "Hotel"
        )}`,
        value: idOf(room),
      })),
    ].filter((option, index) => index === 0 || option.value);
  }, [roomsQuery.data]);

  const rows = data ?? [];

  const columns: Column<unknown>[] = [
    {
      key: "date",
      header: "Date",
      render: (entry) => formatDate(firstText(entry, ["date", "day"], "")),
    },
    {
      key: "room",
      header: "Room",
      render: (entry) =>
        refLabel(
          (entry as Record<string, unknown>)?.roomId ?? (entry as Record<string, unknown>)?.room
        ),
    },
    {
      key: "hotel",
      header: "Hotel",
      secondary: true,
      render: (entry) => refLabel((entry as Record<string, unknown>)?.hotelId),
    },
    {
      key: "available",
      header: "Available",
      align: "right",
      render: (entry) => {
        const available = firstNumber(entry, ["availableRooms", "available", "quantity"], -1);
        return available >= 0 ? available : "—";
      },
    },
    {
      key: "booked",
      header: "Booked",
      secondary: true,
      align: "right",
      render: (entry) => {
        const booked = firstNumber(entry, ["bookedRooms", "booked"], -1);
        return booked >= 0 ? booked : "—";
      },
    },
    {
      key: "price",
      header: "Price",
      secondary: true,
      align: "right",
      render: (entry) => {
        const price = firstNumber(entry, ["price", "pricePerNight", "rate"]);
        return price ? formatCurrency(price) : "—";
      },
    },
    {
      key: "status",
      header: "Status",
      render: (entry) => {
        const status = firstText(entry, ["status"], "");
        if (status && status !== "—") return <StatusBadge status={status} />;
        const blocked = (entry as Record<string, unknown>)?.isBlocked;
        if (typeof blocked === "boolean") {
          return <StatusBadge status={blocked ? "blocked" : "available"} />;
        }
        return <span>—</span>;
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Availability"
        description="Room inventory by date across BANJARA partner hotels."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="room" className="text-xs font-medium uppercase tracking-wide text-muted">
            Room
          </label>
          <Select
            id="room"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            options={roomOptions}
            disabled={roomsQuery.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="from" className="text-xs font-medium uppercase tracking-wide text-muted">
            From
          </label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="to" className="text-xs font-medium uppercase tracking-wide text-muted">
            To
          </label>
          <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(entry, index) => idOf(entry) || `availability-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={CalendarRange}
        emptyTitle="No availability records"
        emptyDescription="Adjust the filters above, or wait for partners to publish inventory."
        caption={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
