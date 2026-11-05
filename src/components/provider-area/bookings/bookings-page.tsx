"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  CarFront,
  Check,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useQuery } from "@/lib/live-query";
import {
  getMyTrips,
  getProviderBookingDetails,
  isOnlinePayment,
  setBookingStatus,
  type BookingDetail,
} from "@/services/customer/provider-dashboard.service";
import { bookingStatus, paymentLabel, rupees, tripWhen } from "./booking-format";
import b from "./bookings.module.css";

const PENDING = ["pending", "payment_verification"];
const CONFIRMED = ["confirmed"];
/** Payment states where the traveller has sent proof for the driver to check. */
const PROOF_IN = ["proof_submitted", "under_review", "disputed"];

/** Provider bookings, grouped like the app: approval first, then confirmed, then the rest. */
export function BookingsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showOther, setShowOther] = useState(false);
  const bookings = useQuery({ queryKey: ["provider", "booking-details"], queryFn: () => getProviderBookingDetails(100) });
  const trips = useQuery({ queryKey: ["provider", "trips"], queryFn: getMyTrips });

  const all = useMemo(() => bookings.data ?? [], [bookings.data]);
  const term = query.trim().toLowerCase();
  const matches = (x: BookingDetail) =>
    !term ||
    [x.customerName, x.number, x.route, ...x.passengers.map((p) => p.name), ...x.seats]
      .join(" ")
      .toLowerCase()
      .includes(term);
  const shown = all.filter(matches);
  const pending = shown.filter((x) => PENDING.includes(x.status));
  const confirmed = shown.filter((x) => CONFIRMED.includes(x.status));
  const other = shown.filter((x) => !PENDING.includes(x.status) && !CONFIRMED.includes(x.status));

  const today = new Date().toISOString().slice(0, 10);
  const activeTrips = (trips.data ?? [])
    .filter((t) => t.departureDate >= today && t.status !== "cancelled")
    .sort((x, y) => `${x.departureDate}${x.departureTime}`.localeCompare(`${y.departureDate}${y.departureTime}`));
  const seatsBooked = all
    .filter((x) => CONFIRMED.includes(x.status))
    .reduce((sum, x) => sum + (x.seats.length || 1), 0);

  const decide = async (booking: BookingDetail, status: "confirmed" | "rejected") => {
    setError("");
    setBusy(booking.id);
    try {
      await setBookingStatus(booking.id, status);
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t update this booking.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={b.page}>
      <div className={b.head}>
        <p>Manage traveller requests and see who’s riding with you.</p>
        <label className={b.search}>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, booking no. or seat"
            aria-label="Search bookings"
          />
        </label>
      </div>

      <div className={b.stats}>
        <Stat label="Needs approval" value={all.filter((x) => PENDING.includes(x.status)).length} tone={pending.length ? "amber" : undefined} />
        <Stat label="Confirmed" value={all.filter((x) => CONFIRMED.includes(x.status)).length} />
        <Stat label="Seats booked" value={seatsBooked} />
        <Stat label="Upcoming trips" value={activeTrips.length} />
      </div>

      {error ? <p className={b.error}>{error}</p> : null}

      {bookings.isPending ? (
        <p className={b.loading} role="status">
          <LoaderCircle size={16} className="animate-spin" /> Loading bookings…
        </p>
      ) : bookings.isError ? (
        <p className={b.error}>{bookings.error.message}</p>
      ) : (
        <>
          <Section title="Needs your approval" count={pending.length} hint="Approve quickly so travellers can plan their trip.">
            {pending.length ? (
              pending.map((x) => (
                <BookingCard key={x.id} booking={x}>
                  <button type="button" className={b.decline} disabled={busy === x.id} onClick={() => void decide(x, "rejected")}>
                    <X size={14} /> Decline
                  </button>
                  {!isOnlinePayment(x.paymentMethod) ? (
                    <button type="button" className={b.approve} disabled={busy === x.id} onClick={() => void decide(x, "confirmed")}>
                      {busy === x.id ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Approve
                    </button>
                  ) : PROOF_IN.includes(x.paymentStatus) ? (
                    // Online payments are approved by confirming the money arrived.
                    <Link href={`/provider/bookings/${x.id}`} className={b.approve}>
                      <Wallet size={14} /> Check payment
                    </Link>
                  ) : (
                    <span className={b.waiting}>
                      <Clock3 size={13} /> Waiting for payment
                    </span>
                  )}
                </BookingCard>
              ))
            ) : (
              <Empty>No requests waiting. New bookings appear here for you to approve.</Empty>
            )}
          </Section>

          <Section title="Confirmed" count={confirmed.length} hint="Travellers riding with you.">
            {confirmed.length ? confirmed.map((x) => <BookingCard key={x.id} booking={x} />) : <Empty>No confirmed bookings yet.</Empty>}
          </Section>

          <Section
            title="Other bookings"
            count={other.length}
            hint="Completed, cancelled and expired."
            action={
              other.length ? (
                <button type="button" className={b.linkButton} onClick={() => setShowOther((v) => !v)}>
                  {showOther ? "Hide" : "Show"}
                </button>
              ) : null
            }
          >
            {showOther ? other.map((x) => <BookingCard key={x.id} booking={x} />) : null}
            {!other.length ? <Empty>Nothing here yet.</Empty> : null}
          </Section>
        </>
      )}

      <Section
        title="Active trips"
        count={activeTrips.length}
        hint="Seats filled on your upcoming trips."
        action={
          <Link href="/provider/trips/new" className={b.linkButton}>
            <Plus size={14} /> Create trip
          </Link>
        }
      >
        {activeTrips.length ? (
          activeTrips.map((t) => {
            const filled = t.totalSeats ? Math.round((t.bookedSeats / t.totalSeats) * 100) : 0;
            return (
              <Link key={t.id} href={`/provider/trips/${t.id}`} className={b.trip}>
                <span className={b.icon}>
                  <CarFront size={17} />
                </span>
                <span className={b.main}>
                  <strong>
                    {t.origin} → {t.destination}
                  </strong>
                  <span>
                    <Clock3 size={12} /> {tripWhen(t.departureDate, t.departureTime)}
                  </span>
                </span>
                <span className={b.side}>
                  <strong>
                    {t.bookedSeats}/{t.totalSeats} seats
                  </strong>
                  <span className={b.bar} aria-hidden="true">
                    <span style={{ width: `${filled}%` }} />
                  </span>
                </span>
              </Link>
            );
          })
        ) : (
          <Empty>No upcoming trips. Create one so travellers can book.</Empty>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" }) {
  return (
    <div className={`${b.stat} ${tone === "amber" ? b.statAmber : ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function Section({
  title,
  count,
  hint,
  action,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={b.section} aria-label={title}>
      <header>
        <div>
          <h3>
            {title} <span className={b.count}>{count}</span>
          </h3>
          <p>{hint}</p>
        </div>
        {action}
      </header>
      <div className={b.list}>{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className={b.empty}>{children}</p>;
}

/** One booking: passengers first (who's riding), then the trip, seats and money. */
function BookingCard({ booking, children }: { booking: BookingDetail; children?: React.ReactNode }) {
  const status = bookingStatus(booking.status);
  const names = booking.passengers.map((p) => p.name).filter(Boolean);
  const lead = names[0] || booking.customerName;
  return (
    <article className={b.card}>
      <Link href={`/provider/bookings/${booking.id}`} className={b.cardLink}>
        <span className={b.avatar}>{lead.charAt(0).toUpperCase()}</span>
        <span className={b.main}>
          <strong>
            {lead}
            {names.length > 1 ? <em> +{names.length - 1} more</em> : null}
          </strong>
          <span>
            <CalendarCheck size={12} /> {booking.route || "Trip"} · {tripWhen(booking.tripDate, booking.departureTime)}
          </span>
          <span>
            <Users size={12} /> {booking.seats.length ? `Seat ${booking.seats.join(", ")}` : `${booking.passengers.length} passenger(s)`}
            {booking.pickup ? (
              <>
                {" "}
                · <MapPin size={12} /> {booking.pickup}
              </>
            ) : null}
          </span>
        </span>
        <span className={b.side}>
          <strong>{rupees(booking.amount)}</strong>
          <span className={`${b.badge} ${b[status.tone]}`}>{status.label}</span>
          <span className={b.payment}>{paymentLabel(booking.paymentStatus, booking.paymentMethod)}</span>
        </span>
        <ChevronRight size={16} className={b.chevron} />
      </Link>
      {children ? <div className={b.actions}>{children}</div> : null}
    </article>
  );
}
