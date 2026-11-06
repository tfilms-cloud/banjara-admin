"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CarFront,
  CheckCheck,
  Clock3,
  Hourglass,
  LoaderCircle,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useQuery } from "@/lib/live-query";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  getMyTrips,
  getProviderEarnings,
  getProviderNotifications,
  getProviderReviews,
  markAllNotificationsRead,
} from "@/services/customer/provider-dashboard.service";
import { getDriverReview } from "@/services/customer/provider-application.service";
import { BookingsPage } from "../bookings/bookings-page";
import { PaymentsPage } from "../payments/payments-page";
import { MessagesPage } from "../messages/messages-page";
import { SettingsSection } from "../settings/settings-section";
import { AvailabilitySection, RoomsSection } from "../hotel/hotel-sections";
import s from "./sections.module.css";

const rupees = (value: number) => `Rs ${Math.round(value).toLocaleString("en-PK")}`;
const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};
const tripTime = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  return Number.isNaN(parsed.getTime())
    ? `${date} ${time}`
    : parsed.toLocaleString("en-PK", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

/** Approval status shared by every section (actions wait for approval). */
function useApproval() {
  const { user } = useCustomerAuth();
  const application = useQuery({
    queryKey: ["provider", "application", user?.id],
    queryFn: getProviderApplication,
    enabled: user?.role === "provider",
  });
  return {
    approved: application.data?.verificationStatus === "approved",
    providerId: application.data?.id ?? "",
    ready: application.isSuccess,
  };
}

function PendingNotice({ children }: { children: ReactNode }) {
  return (
    <p className={s.notice}>
      <Hourglass size={15} />
      <span>{children}</span>
    </p>
  );
}

function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className={s.empty}>
      <Icon size={26} />
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}

function Loading() {
  return (
    <p className={s.loading} role="status">
      <LoaderCircle size={16} className="animate-spin" /> Loading…
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* My trips                                                            */
/* ------------------------------------------------------------------ */

function TripsSection() {
  const { approved } = useApproval();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const trips = useQuery({ queryKey: ["provider", "trips"], queryFn: getMyTrips });
  const today = new Date().toISOString().slice(0, 10);
  const all = trips.data ?? [];
  const upcoming = all
    .filter((t) => t.departureDate >= today && t.status !== "cancelled")
    .sort((a, b) => `${a.departureDate}${a.departureTime}`.localeCompare(`${b.departureDate}${b.departureTime}`));
  const past = all
    .filter((t) => t.departureDate < today || t.status === "cancelled")
    .sort((a, b) => `${b.departureDate}${b.departureTime}`.localeCompare(`${a.departureDate}${a.departureTime}`));
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className={s.page}>
      <div className={s.head}>
        <p>Rides you publish on your routes. Travellers book seats or the whole vehicle.</p>
        {approved ? (
          <Link href="/provider/trips/new" className={s.primary}>
            <Plus size={16} /> Create trip
          </Link>
        ) : (
          <button type="button" className={s.primary} disabled title="Available after approval">
            <Plus size={16} /> Create trip
          </button>
        )}
      </div>
      {!approved ? <PendingNotice>You can create trips once BANJARA approves your application.</PendingNotice> : null}
      <div className={s.tabs} role="tablist" aria-label="Trips">
        {(["upcoming", "past"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`${s.tab} ${tab === key ? s.tabOn : ""}`}
            onClick={() => setTab(key)}
          >
            {key === "upcoming" ? "Upcoming" : "Past & cancelled"}
            <span className={s.count}>{key === "upcoming" ? upcoming.length : past.length}</span>
          </button>
        ))}
      </div>
      {trips.isPending ? (
        <Loading />
      ) : trips.isError ? (
        <p className={s.error}>{trips.error.message}</p>
      ) : shown.length ? (
        <ul className={s.list}>
          {shown.map((trip) => {
            const filled = trip.totalSeats ? Math.round((trip.bookedSeats / trip.totalSeats) * 100) : 0;
            return (
              <li key={trip.id} className={s.row}>
                <span className={s.rowIcon}>
                  <CarFront size={18} />
                </span>
                <div className={s.rowMain}>
                  <strong>
                    {trip.origin} → {trip.destination}
                  </strong>
                  <span>
                    <Clock3 size={12} /> {tripTime(trip.departureDate, trip.departureTime)}
                    {trip.bookingMode === "vehicle" ? " · Whole vehicle" : " · By seat"}
                  </span>
                </div>
                <div className={s.rowSide}>
                  <strong>{rupees(trip.price)}</strong>
                  <span className={s.badge}>
                    {trip.bookedSeats}/{trip.totalSeats} booked
                  </span>
                  <span className={s.bar} aria-hidden="true">
                    <span style={{ width: `${filled}%` }} />
                  </span>
                  {tab === "upcoming" ? (
                    <Link href={`/provider/trips/${trip.id}`} className={s.secondary} style={{ height: 32 }}>
                      <Pencil size={13} /> Edit
                    </Link>
                  ) : trip.status === "cancelled" ? (
                    <span className={`${s.badge} ${s.badgeRed}`}>Cancelled</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty icon={CarFront} title={tab === "upcoming" ? "No upcoming trips" : "No past trips yet"}>
          {tab === "upcoming"
            ? "Trips you publish appear here with seats booked and fares."
            : "Finished and cancelled trips appear here."}
        </Empty>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Earnings                                                            */
/* ------------------------------------------------------------------ */

function EarningsSection() {
  const earnings = useQuery({ queryKey: ["provider", "earnings"], queryFn: getProviderEarnings });
  const e = earnings.data;
  if (earnings.isPending) return <Loading />;
  if (earnings.isError || !e) return <p className={s.error}>{earnings.error?.message}</p>;
  return (
    <div className={s.page}>
      <div className={s.head}>
        <p>Money from confirmed bookings. BANJARA’s service fee is {Math.round(e.feePercent * 100)}% of each fare.</p>
      </div>
      <div className={s.tiles}>
        <div className={`${s.tile} ${s.tileHighlight}`}>
          <small>Today</small>
          <strong>{rupees(e.today)}</strong>
        </div>
        <div className={s.tile}>
          <small>This week</small>
          <strong>{rupees(e.thisWeek)}</strong>
        </div>
        <div className={s.tile}>
          <small>This month</small>
          <strong>{rupees(e.thisMonth)}</strong>
        </div>
      </div>
      <div className={s.grid2}>
        <section className={s.card}>
          <h3 className={s.cardTitle}>Totals</h3>
          <dl className={s.facts}>
            <div>
              <dt>Total from bookings</dt>
              <dd>{rupees(e.total)}</dd>
            </div>
            <div>
              <dt>BANJARA service fee</dt>
              <dd>{rupees(e.platformFees)}</dd>
            </div>
            <div className={s.factWide}>
              <dt>Your earnings after fees</dt>
              <dd>
                <strong>{rupees(e.net)}</strong>
              </dd>
            </div>
          </dl>
        </section>
        <section className={s.card}>
          <h3 className={s.cardTitle}>Payouts</h3>
          <dl className={s.facts}>
            <div>
              <dt>Waiting for payout</dt>
              <dd>{rupees(e.pendingPayout)}</dd>
            </div>
            <div>
              <dt>Paid to you</dt>
              <dd>{rupees(e.completedPayout)}</dd>
            </div>
          </dl>
        </section>
      </div>
      {e.total === 0 ? (
        <Empty icon={Wallet} title="No earnings yet">
          Your earnings appear here after travellers book and complete trips with you.
        </Empty>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

function ReviewsSection() {
  const { providerId, ready } = useApproval();
  const reviews = useQuery({
    queryKey: ["provider", "reviews", providerId],
    queryFn: () => getProviderReviews(providerId),
    enabled: Boolean(providerId),
  });
  const list = reviews.data ?? [];
  const average = list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;
  if (!ready || reviews.isPending) return <Loading />;
  return (
    <div className={s.page}>
      <div className={s.tiles}>
        <div className={`${s.tile} ${s.tileHighlight}`}>
          <small>Rating</small>
          <strong>{list.length ? average.toFixed(1) : "New"}</strong>
          <span>{list.length ? "out of 5" : "No ratings yet"}</span>
        </div>
        <div className={s.tile}>
          <small>Reviews</small>
          <strong>{list.length}</strong>
        </div>
      </div>
      {list.length ? (
        <ul className={s.list}>
          {list.map((review) => (
            <li key={review.id} className={s.row}>
              <span className={s.rowIcon}>{review.author.charAt(0).toUpperCase()}</span>
              <div className={s.rowMain}>
                <strong>
                  {review.author} <span className={`${s.badge} ${s.badgeAmber}`}>{"★".repeat(Math.round(review.rating))}</span>
                </strong>
                <span>{review.comment || "No comment"}</span>
              </div>
              <span className={s.time}>{when(review.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={Star} title="No reviews yet">
          Travellers can review you after their trip. Your rating shows on your profile and rides.
        </Empty>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

function NotificationsSection() {
  const queryClient = useQueryClient();
  const [marking, setMarking] = useState(false);
  const notifications = useQuery({ queryKey: ["provider", "notifications"], queryFn: getProviderNotifications });
  const list = notifications.data ?? [];
  const unread = list.filter((n) => !n.read).length;
  const markAll = async () => {
    setMarking(true);
    try {
      await markAllNotificationsRead();
      await queryClient.invalidateQueries({ queryKey: ["provider", "notifications"] });
    } finally {
      setMarking(false);
    }
  };
  return (
    <div className={s.page}>
      <div className={s.head}>
        <p>{unread ? `${unread} unread` : "You’re all caught up."}</p>
        {unread ? (
          <button type="button" className={s.secondary} onClick={() => void markAll()} disabled={marking}>
            <CheckCheck size={15} /> Mark all as read
          </button>
        ) : null}
      </div>
      {notifications.isPending ? (
        <Loading />
      ) : notifications.isError ? (
        <p className={s.error}>{notifications.error.message}</p>
      ) : list.length ? (
        <ul className={s.list}>
          {list.map((n) => (
            <li key={n.id} className={`${s.row} ${n.read ? "" : s.unread}`}>
              <span className={s.rowIcon}>
                <Bell size={17} />
              </span>
              <div className={s.rowMain}>
                <strong>{n.title}</strong>
                <span>{n.message}</span>
              </div>
              <span className={s.time}>{when(n.createdAt)}</span>
              {!n.read ? <span className={s.dot} aria-label="Unread" /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={Bell} title="No notifications yet">
          Updates about your application, bookings and payouts appear here.
        </Empty>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

const TYPE_LABEL: Record<string, string> = { car: "Car", jeep: "Jeep", suv: "SUV", van: "Van", mini_bus: "Mini bus", bus: "Bus" };

function ProfileSection() {
  const { approved } = useApproval();
  const { user } = useCustomerAuth();
  const profile = useQuery({ queryKey: ["provider", "review", user?.id], queryFn: getDriverReview });
  if (profile.isPending) return <Loading />;
  if (profile.isError || !profile.data) return <p className={s.error}>{profile.error?.message}</p>;
  const p = profile.data;
  const t = p.transport as Record<string, unknown>;
  const photo = String(t.driverPhoto ?? "");
  const routes = Array.isArray(t.operatingRoutes) ? (t.operatingRoutes as string[]) : [];
  const fare =
    t.pricingMethod === "negotiable"
      ? "Negotiable"
      : Number(t.priceAmount) > 0
        ? `${rupees(Number(t.priceAmount))} ${t.pricingMethod === "per_vehicle" ? "per vehicle" : "per seat"}`
        : "—";

  return (
    <div className={s.page}>
      <section className={s.card}>
        <div className={s.profileTop}>
          {photo ? (
            <img src={photo} alt="" className={s.profilePhoto} />
          ) : (
            <span className={s.profilePhoto}>{p.ownerName.charAt(0).toUpperCase()}</span>
          )}
          <div>
            <h2>{p.ownerName}</h2>
            <p>
              Local driver · {p.city || "—"} · {p.yearsExperience} {p.yearsExperience === 1 ? "year" : "years"} driving
            </p>
            <span className={`${s.badge} ${approved ? s.badgeGreen : s.badgeAmber}`}>
              {approved ? "Verified driver" : "Waiting for approval"}
            </span>
          </div>
        </div>
        {p.description ? <p className={s.head} style={{ marginTop: 14 }}>{p.description}</p> : null}
      </section>

      <div className={s.grid2}>
        <section className={s.card}>
          <div className={s.cardHead}>
            <h3>Contact & base</h3>
            <Link href="/provider-application/location" className={s.edit}>
              <Pencil size={13} /> Edit
            </Link>
          </div>
          <dl className={s.facts}>
            <div>
              <dt>
                <Phone size={11} /> Phone
              </dt>
              <dd>{p.phone || "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{p.email || "—"}</dd>
            </div>
            <div className={s.factWide}>
              <dt>
                <MapPin size={11} /> Base
              </dt>
              <dd>{p.address || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className={s.card}>
          <div className={s.cardHead}>
            <h3>Routes & fares</h3>
            <Link href="/provider-application/vehicle" className={s.edit}>
              <Pencil size={13} /> Edit
            </Link>
          </div>
          <dl className={s.facts}>
            <div className={s.factWide}>
              <dt>Routes</dt>
              <dd>{routes.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Fare</dt>
              <dd>{fare}</dd>
            </div>
            <div>
              <dt>Advance</dt>
              <dd>{t.pricePercent != null ? `${t.pricePercent}%` : "None"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={s.card}>
        <div className={s.cardHead}>
          <h3>Your vehicle</h3>
          <Link href="/provider-application/vehicle-setup" className={s.edit}>
            <Pencil size={13} /> Edit
          </Link>
        </div>
        <dl className={s.facts}>
          <div>
            <dt>Name</dt>
            <dd>{p.vehicle?.name || "—"}</dd>
          </div>
          <div>
            <dt>Vehicle</dt>
            <dd>
              {[TYPE_LABEL[String(t.vehicleClass)], t.vehicleModel, t.vehicleMakeYear].filter(Boolean).join(" · ") || "—"}
            </dd>
          </div>
          <div>
            <dt>Registration</dt>
            <dd>{String(t.registrationNumber ?? "") || "—"}</dd>
          </div>
          <div>
            <dt>Passenger seats</dt>
            <dd>{p.vehicle?.seatCount ?? "—"}</dd>
          </div>
          <div className={s.factWide}>
            <dt>Amenities</dt>
            <dd>{p.vehicle?.amenities.join(", ") || "None"}</dd>
          </div>
        </dl>
        {p.vehicle?.images.length ? (
          <div className={s.photoRow}>
            {p.vehicle.images.map((url) => (
              <img key={url} src={url} alt="" />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** Built sections; the rest still show the "coming soon" description. */
export const BUILT_SECTIONS: Record<string, () => ReactNode> = {
  trips: TripsSection,
  bookings: BookingsPage,
  earnings: EarningsSection,
  reviews: ReviewsSection,
  notifications: NotificationsSection,
  profile: ProfileSection,
  payments: PaymentsPage,
  messages: MessagesPage,
  settings: SettingsSection,
  rooms: RoomsSection,
  availability: AvailabilitySection,
};
