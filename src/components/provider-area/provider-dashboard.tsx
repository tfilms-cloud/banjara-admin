"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CarFront,
  Clock3,
  LoaderCircle,
  Plus,
  Star,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { ProviderHome } from "@/components/site/provider/provider-home";
import { useBackendStatus, useQuery } from "@/lib/live-query";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  getMyTrips,
  getProviderBookings,
  getProviderDashboard,
  getProviderReviews,
} from "@/services/customer/provider-dashboard.service";
import styles from "./provider-dashboard.module.css";

const rupees = (value: number) => `Rs ${Math.round(value).toLocaleString("en-PK")}`;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function formatDay(date: string, time: string) {
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`;
  return parsed.toLocaleString("en-PK", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** /provider — the dashboard once approved, otherwise the application status. */
export function ProviderDashboardPage() {
  const { user } = useCustomerAuth();
  const backend = useBackendStatus();
  const application = useQuery({
    queryKey: ["provider", "application", user?.id],
    queryFn: getProviderApplication,
    enabled: user?.role === "provider",
  });
  if (backend === "checking" || application.isPending) {
    return (
      <p className={styles.loading} role="status">
        <LoaderCircle size={18} className="animate-spin" /> Loading…
      </p>
    );
  }
  if (application.data?.verificationStatus === "approved") {
    return <Dashboard providerId={application.data.id} city={application.data.city} />;
  }
  return <ProviderHome />;
}

function Dashboard({ providerId, city }: { providerId: string; city?: string }) {
  const { user } = useCustomerAuth();
  const summary = useQuery({ queryKey: ["provider", "dashboard"], queryFn: getProviderDashboard });
  const trips = useQuery({ queryKey: ["provider", "trips"], queryFn: getMyTrips });
  const bookings = useQuery({ queryKey: ["provider", "bookings", 20], queryFn: () => getProviderBookings(20) });
  const reviews = useQuery({
    queryKey: ["provider", "reviews", providerId],
    queryFn: () => getProviderReviews(providerId),
    enabled: Boolean(providerId),
  });

  const s = summary.data;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (trips.data ?? [])
    .filter((trip) => trip.departureDate >= today && trip.status !== "cancelled")
    .sort((a, b) => `${a.departureDate}${a.departureTime}`.localeCompare(`${b.departureDate}${b.departureTime}`))
    .slice(0, 5);
  const pending = (bookings.data ?? []).filter((booking) => booking.status === "pending").slice(0, 5);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <span /> Local driver{city ? ` · ${city}` : ""}
          </p>
          <h2>
            {greeting()}, {user?.name?.split(" ")[0] || "driver"}
          </h2>
          <span className={styles.verified}>
            <BadgeCheck size={14} /> Verified driver
          </span>
        </div>
        <Link href="/provider/trips" className={styles.primary}>
          <Plus size={16} /> Create trip
        </Link>
      </section>

      {summary.isError ? (
        <p className={styles.error}>{summary.error.message}</p>
      ) : (
        <section className={styles.stats} aria-label="Today">
          <Stat icon={CarFront} label="Trips today" value={s ? String(s.todaysTrips) : "—"} />
          <Stat
            icon={Users}
            label="Seats booked today"
            value={s ? `${s.bookedSeatsToday}` : "—"}
            sub={s ? `${s.availableSeatsToday} still available` : undefined}
          />
          <Stat
            icon={CalendarCheck}
            label="Pending requests"
            value={s ? String(s.pendingBookings) : "—"}
            sub={s ? `${s.totalBookings} bookings in total` : undefined}
            tone={s && s.pendingBookings > 0 ? "attention" : undefined}
          />
          <Stat icon={Wallet} label="Earned today" value={s ? rupees(s.earnings.today) : "—"} />
        </section>
      )}

      <div className={styles.columns}>
        <Panel title="Upcoming trips" href="/provider/trips" action="All trips">
          {trips.isPending ? (
            <Empty>Loading your trips…</Empty>
          ) : upcoming.length ? (
            <ul className={styles.list}>
              {upcoming.map((trip) => {
                const filled = trip.totalSeats ? Math.round((trip.bookedSeats / trip.totalSeats) * 100) : 0;
                return (
                  <li key={trip.id} className={styles.trip}>
                    <div className={styles.tripMain}>
                      <strong>
                        {trip.origin} → {trip.destination}
                      </strong>
                      <span>
                        <Clock3 size={12} /> {formatDay(trip.departureDate, trip.departureTime)}
                        {trip.bookingMode === "vehicle" ? " · Whole vehicle" : ""}
                      </span>
                    </div>
                    <div className={styles.tripSide}>
                      <strong>{rupees(trip.price)}</strong>
                      <span>
                        {trip.bookedSeats}/{trip.totalSeats} booked
                      </span>
                      <span className={styles.bar} aria-hidden="true">
                        <span style={{ width: `${filled}%` }} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>
              No upcoming trips. <Link href="/provider/trips">Create your first trip</Link> so travellers can book seats.
            </Empty>
          )}
        </Panel>

        <Panel title="Booking requests" href="/provider/bookings" action="All bookings">
          {bookings.isPending ? (
            <Empty>Loading bookings…</Empty>
          ) : pending.length ? (
            <ul className={styles.list}>
              {pending.map((booking) => (
                <li key={booking.id} className={styles.booking}>
                  <span className={styles.avatar}>{booking.customerName.charAt(0).toUpperCase()}</span>
                  <div className={styles.tripMain}>
                    <strong>{booking.customerName}</strong>
                    <span>
                      {booking.seats.length ? `Seat ${booking.seats.join(", ")}` : booking.number}
                    </span>
                  </div>
                  <div className={styles.tripSide}>
                    <strong>{rupees(booking.amount)}</strong>
                    <span className={styles.pill}>Needs approval</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No booking requests waiting. New requests appear here for you to approve.</Empty>
          )}
        </Panel>

        <Panel title="Earnings" href="/provider/earnings" action="Details">
          <dl className={styles.money}>
            <div>
              <dt>This week</dt>
              <dd>{s ? rupees(s.earnings.thisWeek) : "—"}</dd>
            </div>
            <div>
              <dt>This month</dt>
              <dd>{s ? rupees(s.earnings.thisMonth) : "—"}</dd>
            </div>
            <div>
              <dt>Waiting for payout</dt>
              <dd>{s ? rupees(s.earnings.pendingPayout) : "—"}</dd>
            </div>
            <div>
              <dt>Total earned</dt>
              <dd>{s ? rupees(s.earnings.total) : "—"}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Customer reviews" href="/provider/reviews" action="See all">
          <div className={styles.rating}>
            <Star size={22} />
            <strong>{s && s.rating > 0 ? s.rating.toFixed(1) : "New"}</strong>
            <span>{s?.totalReviews ? `${s.totalReviews} reviews` : "No reviews yet"}</span>
          </div>
          {reviews.data?.length ? (
            <ul className={styles.list}>
              {reviews.data.slice(0, 2).map((review) => (
                <li key={review.id} className={styles.review}>
                  <strong>
                    {review.author} · {"★".repeat(Math.round(review.rating))}
                  </strong>
                  <span>{review.comment || "No comment"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Reviews from travellers appear here after their trips.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: "attention";
}) {
  return (
    <div className={`${styles.stat} ${tone === "attention" ? styles.statAttention : ""}`}>
      <span className={styles.statIcon}>
        <Icon size={18} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {sub ? <span>{sub}</span> : null}
      </div>
    </div>
  );
}

function Panel({
  title,
  href,
  action,
  children,
}: {
  title: string;
  href: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel} aria-label={title}>
      <header>
        <h3>{title}</h3>
        <Link href={href}>
          {action} <ArrowRight size={14} />
        </Link>
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}
