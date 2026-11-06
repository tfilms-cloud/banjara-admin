"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarRange,
  CheckCircle2,
  LoaderCircle,
  MessageSquare,
  Smartphone,
  Ticket,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { authHref } from "@/lib/auth-redirect";
import { roomStayQuery } from "@/lib/room-details";
import { useQuery } from "@/lib/live-query";
import { formatCurrency } from "@/lib/utils";
import { createHotelBooking, type HotelBookingResult } from "@/services/customer/booking.service";
import { getHotelQuote } from "@/services/customer/hotel.service";
import type { Hotel, HotelRoom, HotelStay } from "@/types/customer/hotel";
import s from "../trips/trip-booking.module.css";

const day = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const money = (value: number) => formatCurrency(value, "PKR");

export function WebsiteRoomBooking({ hotel, room, stay }: { hotel: Hotel; room: HotelRoom; stay: HotelStay }) {
  const auth = useCustomerAuth();
  const guests = stay.adults + stay.children;
  const roomHref = `/hotels/${encodeURIComponent(hotel.id)}/rooms/${encodeURIComponent(room.id)}?${roomStayQuery(stay)}`;
  const here = `/hotels/${encodeURIComponent(hotel.id)}/rooms/${encodeURIComponent(room.id)}/book?${roomStayQuery(stay)}`;
  const quote = useQuery({
    queryKey: ["customer", "hotel-quote", hotel.id, room.id, stay],
    queryFn: () =>
      getHotelQuote({ hotelId: hotel.id, roomId: room.id, checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: stay.rooms, guests }),
    retry: false,
    staleTime: 0,
  });
  const back = (
    <Link href={roomHref} className={s.back}>
      <ArrowLeft size={15} /> Back to the room
    </Link>
  );

  if (auth.loading || quote.isPending) {
    return (
      <Shell>
        {back}
        <p className={s.state} role="status">
          <LoaderCircle size={16} className={s.spin} /> Checking your room…
        </p>
      </Shell>
    );
  }
  if (!auth.user) {
    return (
      <Shell>
        {back}
        <State title="Sign in to reserve this room" body="Your booking and messages with the property are kept in your BANJARA account.">
          <Link className={s.primary} href={authHref("/login", here)}>
            Sign in
          </Link>
          <Link className={s.secondary} href={authHref("/register/traveller", here)}>
            Create a traveller account
          </Link>
        </State>
      </Shell>
    );
  }
  if (auth.user.role !== "customer") {
    return (
      <Shell>
        {back}
        <State
          title="Book with a traveller account"
          body="You are signed in as a service provider. Rooms are booked from a traveller account."
        />
      </Shell>
    );
  }
  if (quote.isError || !quote.data) {
    return (
      <Shell>
        {back}
        <State
          title="This room isn’t available for those dates"
          body={quote.error?.message ?? "Try other dates or another room."}
        >
          <Link className={s.secondary} href={roomHref}>
            Change dates
          </Link>
        </State>
      </Shell>
    );
  }
  return (
    <Shell>
      {back}
      <BookingForm hotel={hotel} room={room} stay={stay} guests={guests} quote={quote.data} />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    // The site layout already provides <main>.
    <div className={s.page}>
      <div className={s.container}>{children}</div>
    </div>
  );
}

function State({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <section className={s.stateCard}>
      <h1>{title}</h1>
      <p>{body}</p>
      {children ? <div className={s.stateActions}>{children}</div> : null}
    </section>
  );
}

function BookingForm({
  hotel,
  room,
  stay,
  guests,
  quote,
}: {
  hotel: Hotel;
  room: HotelRoom;
  stay: HotelStay;
  guests: number;
  quote: Awaited<ReturnType<typeof getHotelQuote>>;
}) {
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [requests, setRequests] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<HotelBookingResult | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Enter the name the booking is under.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Enter a phone number the property can reach you on.");
    setSubmitting(true);
    try {
      const result = await createHotelBooking({
        hotelId: hotel.id,
        roomId: room.id,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        rooms: stay.rooms,
        guests,
        guest: { name, email, phone, specialRequests: requests },
      });
      setBooked(result);
      void queryClient.invalidateQueries({ queryKey: ["customer"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t reserve this room.");
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) return <Confirmation hotel={hotel} room={room} stay={stay} booking={booked} />;

  return (
    <form className={s.layout} onSubmit={submit} noValidate>
      <div className={s.main}>
        <header className={s.heading}>
          <p className={s.eyebrow}>Reserve your stay</p>
          <h1>{room.name}</h1>
          <p className={s.sub}>
            <Building2 size={14} /> {hotel.name}{hotel.location.city ? ` · ${hotel.location.city}` : ""}
          </p>
        </header>

        <section className={s.card} aria-labelledby="stay-title">
          <h2 id="stay-title">
            <span className={s.step}>1</span> Your stay
          </h2>
          <p className={s.note}>
            <strong>{day(stay.checkIn)}</strong> → <strong>{day(stay.checkOut)}</strong> · {quote.nights}{" "}
            {quote.nights === 1 ? "night" : "nights"} · {stay.rooms} {stay.rooms === 1 ? "room" : "rooms"} · {guests}{" "}
            {guests === 1 ? "guest" : "guests"}.{" "}
            <Link href={`/hotels/${encodeURIComponent(hotel.id)}/rooms/${encodeURIComponent(room.id)}?${roomStayQuery(stay)}`}>
              Change
            </Link>
          </p>
          {hotel.checkInTime || hotel.checkOutTime ? (
            <p className={s.note}>
              Check-in from {hotel.checkInTime || "the afternoon"} · check-out by {hotel.checkOutTime || "midday"}.
            </p>
          ) : null}
        </section>

        <section className={s.card} aria-labelledby="guest-title">
          <h2 id="guest-title">
            <span className={s.step}>2</span> Who is staying
          </h2>
          <div className={s.passenger}>
            <p className={s.passengerLabel}>
              <UserRound size={14} /> Main guest
            </p>
            <label>
              Full name
              <input value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} maxLength={80} />
            </label>
            <label>
              Phone
              <input type="tel" value={phone} autoComplete="tel" placeholder="03XX XXXXXXX" onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            </label>
            <label>
              Email
              <input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} maxLength={120} />
            </label>
            <label>
              Requests <small>(optional)</small>
              <input value={requests} placeholder="Late arrival, extra bed…" onChange={(e) => setRequests(e.target.value)} maxLength={300} />
            </label>
          </div>
        </section>

        <section className={s.card} aria-labelledby="payment-title">
          <h2 id="payment-title">
            <span className={s.step}>3</span> How you’ll pay
          </h2>
          <div className={s.options}>
            <label className={`${s.option} ${s.optionOn}`}>
              <input type="radio" name="payment" checked readOnly />
              <Wallet size={16} />
              <span>
                <strong>Pay at the property</strong>
                <small>Pay when you arrive. The property records it in BANJARA.</small>
              </span>
            </label>
            {/* Online wallets are waiting on BANJARA’s merchant accounts. */}
            <div className={`${s.option} ${s.optionSoon}`} aria-disabled="true">
              <input type="radio" name="payment" disabled />
              <Smartphone size={16} />
              <span>
                <strong>EasyPaisa</strong>
                <small>Pay online from your EasyPaisa account.</small>
              </span>
              <em>Coming soon</em>
            </div>
            <div className={`${s.option} ${s.optionSoon}`} aria-disabled="true">
              <input type="radio" name="payment" disabled />
              <Wallet size={16} />
              <span>
                <strong>JazzCash</strong>
                <small>Pay online from your JazzCash account.</small>
              </span>
              <em>Coming soon</em>
            </div>
          </div>
        </section>
      </div>

      <aside className={s.summary} aria-label="Booking summary">
        <h2>Summary</h2>
        <dl className={s.facts}>
          <div>
            <dt>
              <Building2 size={13} /> Property
            </dt>
            <dd>{hotel.name}</dd>
          </div>
          <div>
            <dt>
              <BedDouble size={13} /> Room
            </dt>
            <dd>
              {stay.rooms} × {room.name}
            </dd>
          </div>
          <div>
            <dt>
              <CalendarRange size={13} /> Nights
            </dt>
            <dd>
              {quote.nights} · {stay.checkIn} → {stay.checkOut}
            </dd>
          </div>
          <div>
            <dt>
              <Users size={13} /> Guests
            </dt>
            <dd>{guests}</dd>
          </div>
        </dl>
        <div className={s.priceLine}>
          <span>
            {quote.nights} {quote.nights === 1 ? "night" : "nights"} × {stay.rooms} {stay.rooms === 1 ? "room" : "rooms"}
          </span>
          <strong>{money(quote.subtotal)}</strong>
        </div>
        <p className={s.fine}>Tax and BANJARA’s service fee are added to this. You’ll see the exact total right after booking.</p>
        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={s.primary} disabled={submitting}>
          {submitting ? <LoaderCircle size={16} className={s.spin} /> : null}
          {submitting ? "Reserving…" : "Request booking"}
        </button>
        <p className={s.fine}>The property confirms your booking. Nothing is paid now: you pay when you arrive.</p>
      </aside>
    </form>
  );
}

function Confirmation({
  hotel,
  room,
  stay,
  booking,
}: {
  hotel: Hotel;
  room: HotelRoom;
  stay: HotelStay;
  booking: HotelBookingResult;
}) {
  const messageHref = hotel.providerUserId
    ? `/account/messages?with=${encodeURIComponent(hotel.providerUserId)}&booking=${encodeURIComponent(booking.id)}`
    : null;
  return (
    <section className={s.done} aria-live="polite">
      <CheckCircle2 size={40} className={s.doneIcon} />
      <p className={s.eyebrow}>Booking {booking.bookingNumber}</p>
      <h1>Request sent to {hotel.name}</h1>
      <p className={s.sub}>
        {room.name} · {day(stay.checkIn)} → {day(stay.checkOut)}
      </p>
      <ol className={s.next}>
        <li>
          <strong>Waiting for the property.</strong> You’ll get a notification as soon as they confirm.
        </li>
        <li>
          <strong>Pay {money(booking.totalAmount)} at the property</strong> when you arrive (rooms, tax and service fee
          included).
        </li>
        <li>
          <strong>Show your booking</strong> from My bookings when you check in.
        </li>
      </ol>
      <div className={s.stateActions}>
        <Link className={s.primary} href={`/account/bookings?booking=${encodeURIComponent(booking.id)}`}>
          <Ticket size={16} /> View my booking
        </Link>
        {messageHref ? (
          <Link className={s.secondary} href={messageHref}>
            <MessageSquare size={16} /> Message the property
          </Link>
        ) : null}
      </div>
    </section>
  );
}
