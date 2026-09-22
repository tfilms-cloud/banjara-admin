"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { DetailSkeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { DetailGrid, DetailRow } from "@/components/record-details";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useSupportTicket, useUpdateSupportTicket } from "@/hooks/useSupport";
import { refLabel } from "@/lib/records";
import { formatDateTime, idOf } from "@/lib/utils";

const STATUS_OPTIONS = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "inProgress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default function SupportTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data: ticket, isPending, isError, error, refetch, isFetching } = useSupportTicket(id);
  const updateTicket = useUpdateSupportTicket(id);

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [syncedFrom, setSyncedFrom] = useState<string | null>(null);

  // Re-seed the form whenever the server values for this ticket change.
  const serverState = ticket ? `${ticket.status}|${ticket.priority}` : null;
  if (ticket && serverState !== syncedFrom) {
    setSyncedFrom(serverState);
    setStatus(ticket.status);
    setPriority(ticket.priority);
  }

  if (isPending) {
    return (
      <div className="space-y-5">
        <PageHeader title="Support ticket" description="Loading ticket…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="space-y-5">
        <PageHeader title="Support ticket" />
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState
            title="Could not load this ticket"
            error={error}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </div>
      </div>
    );
  }

  const isDirty = status !== ticket.status || priority !== ticket.priority;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to support
      </Link>

      <PageHeader
        title={ticket.subject || "Support ticket"}
        description={`Raised ${formatDateTime(ticket.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {ticket.message || "No message was provided with this ticket."}
            </p>
            <div className="border-t border-border pt-4">
              <DetailGrid>
                <DetailRow
                  label="Category"
                  value={<span className="capitalize">{ticket.category || "—"}</span>}
                />
                <DetailRow label="Raised by" value={refLabel(ticket.userId)} />
                <DetailRow
                  label="Related booking"
                  value={
                    ticket.bookingId ? (
                      <Link
                        href={`/admin/bookings/${ticket.bookingId}`}
                        className="text-sky hover:underline"
                      >
                        {ticket.bookingId}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailRow label="Ticket ID" value={idOf(ticket) || "—"} />
                <DetailRow label="Last updated" value={formatDateTime(ticket.updatedAt)} />
              </DetailGrid>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="status"
                className="text-xs font-medium uppercase tracking-wide text-muted"
              >
                Status
              </label>
              <Select
                id="status"
                value={status}
                options={STATUS_OPTIONS}
                onChange={(event) => setStatus(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="priority"
                className="text-xs font-medium uppercase tracking-wide text-muted"
              >
                Priority
              </label>
              <Select
                id="priority"
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={(event) => setPriority(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!isDirty}
              loading={updateTicket.isPending}
              onClick={() => updateTicket.mutate({ status, priority })}
            >
              Save changes
            </Button>
          </CardContent>
        </Card>
      </div>

      <Button variant="ghost" size="sm" onClick={() => void refetch()} loading={isFetching}>
        Refresh ticket
      </Button>
    </div>
  );
}
