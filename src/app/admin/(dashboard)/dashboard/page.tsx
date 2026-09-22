"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  LifeBuoy,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { CardsSkeleton, Skeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/hooks/useDashboard";
import { firstNumber, firstText, refLabel } from "@/lib/records";
import { formatCurrency, formatDate, idOf } from "@/lib/utils";

function SectionCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Link href={href} className="text-xs font-medium text-sky hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function RowLink({
  href,
  primary,
  secondary,
  trailing,
  badge,
}: {
  href: string;
  primary: string;
  secondary?: string;
  trailing?: string;
  badge?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0 hover:bg-sky/5"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-navy">{primary}</p>
        {secondary ? <p className="truncate text-xs text-muted">{secondary}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trailing ? <span className="text-sm text-foreground">{trailing}</span> : null}
        {badge ? <StatusBadge status={badge} /> : null}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useDashboard();

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Live snapshot of the BANJARA platform." />
        <CardsSkeleton count={8} />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Live snapshot of the BANJARA platform." />
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
        </div>
      </div>
    );
  }

  const charts = data.charts ?? [];
  const recentBookings = data.recentBookings ?? [];
  const recentProviders = data.recentProviders ?? [];
  const recentPayments = data.recentPayments ?? [];
  const recentTickets = data.recentTickets ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live snapshot of the BANJARA platform."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Customers"
          value={data.totalCustomers ?? 0}
          icon={Users}
          tone="sky"
          hint="Registered travellers"
        />
        <StatCard
          label="Providers"
          value={data.totalProviders ?? 0}
          icon={BadgeCheck}
          tone="navy"
          hint={
            data.activeProviders !== undefined ? `${data.activeProviders} active` : undefined
          }
        />
        <StatCard
          label="Pending Applications"
          value={data.pendingProviders ?? 0}
          icon={ClipboardList}
          tone="amber"
          hint="Awaiting review"
        />
        <StatCard
          label="Open Tickets"
          value={data.openTickets ?? 0}
          icon={LifeBuoy}
          tone="danger"
          hint="Support queue"
        />
        <StatCard
          label="Bookings"
          value={data.totalBookings ?? 0}
          icon={Ticket}
          tone="navy"
          hint={data.todaysBookings !== undefined ? `${data.todaysBookings} today` : undefined}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(data.revenue ?? 0)}
          icon={Wallet}
          tone="green"
          hint="Gross booking value"
        />
        <StatCard
          label="Platform Fees"
          value={formatCurrency(data.platformFees ?? 0)}
          icon={CreditCard}
          tone="sky"
          hint={
            data.pendingPayments !== undefined
              ? `${data.pendingPayments} payments pending`
              : undefined
          }
        />
        <StatCard
          label="Trips & Hotels"
          value={`${data.totalTrips ?? 0} / ${data.totalHotels ?? 0}`}
          icon={Building2}
          tone="amber"
          hint={data.todaysTrips !== undefined ? `${data.todaysTrips} trips today` : undefined}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Bookings & revenue</CardTitle>
            <p className="text-sm text-muted">Trend reported by the platform API.</p>
          </div>
          <TrendingUp className="h-5 w-5 text-sky" aria-hidden />
        </CardHeader>
        <CardContent>
          {charts.length ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No chart data yet"
              description="The dashboard endpoint has not returned any time-series data."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Recent bookings" href="/admin/bookings">
          {recentBookings.length ? (
            recentBookings.slice(0, 6).map((booking, index) => (
              <RowLink
                key={idOf(booking) || `booking-${index}`}
                href={`/admin/bookings/${idOf(booking)}`}
                primary={firstText(booking, ["bookingNumber", "_id", "id"], "Booking")}
                secondary={firstText(booking, ["bookingType", "createdAt"], "")}
                trailing={formatCurrency(firstNumber(booking, ["totalAmount", "amount"]))}
                badge={firstText(booking, ["bookingStatus", "status"], "")}
              />
            ))
          ) : (
            <EmptyState
              icon={Ticket}
              title="No recent bookings"
              description="New bookings will appear here as travellers confirm them."
            />
          )}
        </SectionCard>

        <SectionCard title="Recent provider applications" href="/admin/providers/applications">
          {recentProviders.length ? (
            recentProviders.slice(0, 6).map((provider, index) => (
              <RowLink
                key={idOf(provider) || `provider-${index}`}
                href={`/admin/providers/applications/${idOf(provider)}`}
                primary={provider.businessName || provider.ownerName || "Provider"}
                secondary={[provider.city, provider.email].filter(Boolean).join(" · ")}
                badge={provider.verificationStatus}
              />
            ))
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No recent applications"
              description="Provider applications appear here as they are submitted."
            />
          )}
        </SectionCard>

        <SectionCard title="Recent payments" href="/admin/payments">
          {recentPayments.length ? (
            recentPayments.slice(0, 6).map((payment, index) => (
              <RowLink
                key={idOf(payment) || `payment-${index}`}
                href={`/admin/payments/${idOf(payment)}`}
                primary={firstText(payment, ["transactionId", "_id", "id"], "Payment")}
                secondary={firstText(payment, ["method", "createdAt"], "")}
                trailing={formatCurrency(firstNumber(payment, ["amount"]))}
                badge={firstText(payment, ["status"], "")}
              />
            ))
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No recent payments"
              description="Settled and pending payments will be listed here."
            />
          )}
        </SectionCard>

        <SectionCard title="Recent support tickets" href="/admin/support">
          {recentTickets.length ? (
            recentTickets.slice(0, 6).map((ticket, index) => (
              <RowLink
                key={idOf(ticket) || `ticket-${index}`}
                href={`/admin/support/${idOf(ticket)}`}
                primary={firstText(ticket, ["subject"], "Support ticket")}
                secondary={[
                  refLabel(ticket, ""),
                  formatDate(firstText(ticket, ["createdAt"], "")),
                ]
                  .filter((part) => part && part !== "—")
                  .join(" · ")}
                badge={firstText(ticket, ["status"], "")}
              />
            ))
          ) : (
            <EmptyState
              icon={Bell}
              title="No open tickets"
              description="Support requests raised by travellers will show up here."
            />
          )}
        </SectionCard>
      </div>

      {data.upcomingTrips !== undefined || data.totalRooms !== undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.upcomingTrips !== undefined ? (
            <StatCard
              label="Upcoming trips"
              value={data.upcomingTrips}
              icon={CalendarClock}
              tone="sky"
            />
          ) : null}
          {data.bookedSeats !== undefined ? (
            <StatCard
              label="Booked seats"
              value={data.bookedSeats}
              icon={Ticket}
              tone="navy"
              hint={
                data.availableSeats !== undefined
                  ? `${data.availableSeats} seats available`
                  : undefined
              }
            />
          ) : null}
          {data.totalRooms !== undefined ? (
            <StatCard
              label="Rooms"
              value={data.totalRooms}
              icon={Building2}
              tone="amber"
              hint={
                data.availableRooms !== undefined
                  ? `${data.availableRooms} available`
                  : undefined
              }
            />
          ) : null}
          {data.todaysCheckIns !== undefined ? (
            <StatCard
              label="Check-ins today"
              value={data.todaysCheckIns}
              icon={Building2}
              tone="green"
              hint={
                data.todaysCheckOuts !== undefined
                  ? `${data.todaysCheckOuts} check-outs`
                  : undefined
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
