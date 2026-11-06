"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BedDouble,
  CalendarRange,
  DoorOpen,
  LoaderCircle,
  LogIn,
  LogOut,
  Star,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { RoomEditor } from "@/components/lodging/room-editor";
import { useQuery } from "@/lib/live-query";
import { getProviderBookingDetails } from "@/services/customer/provider-dashboard.service";
import {
  closeNights,
  getHotelDashboard,
  getMyHotel,
  getRoomAvailability,
  listMyRooms,
  reopenNights,
  type NightAvailability,
  type OwnerRoom,
} from "@/services/customer/lodging.service";
import s from "../sections/sections.module.css";
import h from "./hotel.module.css";

const rupees = (value: number) => `Rs ${Math.round(value).toLocaleString("en-PK")}`;
const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return ymd(d);
};
const dayLabel = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", opts);

function useHotel() {
  return useQuery({ queryKey: ["provider", "my-hotel"], queryFn: getMyHotel });
}

function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <p className={h.muted} role="status">
      <LoaderCircle size={15} className={h.spin} /> {text}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

/** The host's day: who arrives, who leaves, what needs an answer. */
export function HotelDashboard() {
  const { user } = useCustomerAuth();
  const hotel = useHotel();
  const stats = useQuery({ queryKey: ["provider", "hotel-dashboard"], queryFn: getHotelDashboard });
  const bookings = useQuery({ queryKey: ["provider", "booking-details"], queryFn: () => getProviderBookingDetails(100) });
  const today = ymd(new Date());
  const all = bookings.data ?? [];
  const live = all.filter((b) => b.stay && ["pending", "confirmed"].includes(b.status));
  const arriving = live.filter((b) => b.stay!.checkIn === today && b.stay!.status === "booked");
  const leaving = all.filter((b) => b.stay?.checkOut === today && b.stay.status === "checked_in");
  const waiting = all.filter((b) => b.status === "pending");
  const upcoming = live
    .filter((b) => b.stay!.checkIn > today && b.status === "confirmed")
    .sort((a, b) => a.stay!.checkIn.localeCompare(b.stay!.checkIn))
    .slice(0, 5);
  const st = stats.data;

  return (
    <div className={s.page}>
      <div className={h.hello}>
        <div>
          <p className={h.eyebrow}>{hotel.data?.name ?? "Your property"}</p>
          <h1>Good to see you, {user?.name.split(" ")[0] ?? "host"}</h1>
        </div>
        <div className={h.helloActions}>
          <Link href="/provider/availability" className={s.secondary}>
            <CalendarRange size={15} /> Availability
          </Link>
          <Link href="/provider/rooms" className={s.primary}>
            <BedDouble size={15} /> My rooms
          </Link>
        </div>
      </div>

      <div className={`${s.tiles} ${h.tiles}`}>
        <div className={`${s.tile} ${s.tileHighlight}`}>
          <small>
            <LogIn size={12} /> Arriving today
          </small>
          <strong>{st ? st.checkInsToday : "—"}</strong>
          <span>{arriving.length ? `${arriving.length} to check in` : "Nobody waiting to check in"}</span>
        </div>
        <div className={s.tile}>
          <small>
            <LogOut size={12} /> Leaving today
          </small>
          <strong>{st ? st.checkOutsToday : "—"}</strong>
          <span>{leaving.length ? `${leaving.length} still to check out` : "No check-outs left"}</span>
        </div>
        <div className={s.tile}>
          <small>
            <BedDouble size={12} /> Rooms
          </small>
          <strong>{st ? st.rooms : "—"}</strong>
          <span>across all room types</span>
        </div>
        <div className={s.tile}>
          <small>
            <DoorOpen size={12} /> Requests waiting
          </small>
          <strong>{waiting.length}</strong>
          <span>{waiting.length ? "Answer them soon" : "You’re all caught up"}</span>
        </div>
        <div className={s.tile}>
          <small>
            <Wallet size={12} /> Earned
          </small>
          <strong>{st ? rupees(st.revenue) : "—"}</strong>
          <span>from confirmed stays</span>
        </div>
        <div className={s.tile}>
          <small>
            <Star size={12} /> Rating
          </small>
          <strong>{st && st.rating ? st.rating.toFixed(1) : "New"}</strong>
          <span>from guest reviews</span>
        </div>
      </div>

      <div className={s.grid2}>
        <StayList title="Today" empty="No arrivals or departures today." items={[...arriving, ...leaving]} today={today} />
        <StayList
          title="Needs your answer"
          empty="No booking requests waiting."
          items={waiting.filter((b) => b.stay)}
          today={today}
        />
      </div>
      <StayList title="Coming up" empty="No upcoming stays yet." items={upcoming} today={today} />
    </div>
  );
}

function StayList({
  title,
  empty,
  items,
  today,
}: {
  title: string;
  empty: string;
  items: Awaited<ReturnType<typeof getProviderBookingDetails>>;
  today: string;
}) {
  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h3 className={h.cardTitle}>{title}</h3>
        <Link href="/provider/bookings" className={s.edit}>
          All bookings <ArrowRight size={13} />
        </Link>
      </div>
      {items.length ? (
        <ul className={h.stays}>
          {items.map((b) => {
            const stay = b.stay!;
            const action =
              b.status === "pending"
                ? "Approve"
                : stay.status === "booked" && stay.checkIn === today
                  ? "Check in"
                  : stay.status === "checked_in"
                    ? "Check out"
                    : "View";
            return (
              <li key={b.id}>
                <Link href={`/provider/bookings/${b.id}`}>
                  <span className={h.avatar}>{(b.passengers[0]?.name || b.customerName).charAt(0).toUpperCase()}</span>
                  <span className={h.stayMain}>
                    <strong>{b.passengers[0]?.name || b.customerName}</strong>
                    <span>
                      {stay.roomName} · {dayLabel(stay.checkIn, { day: "numeric", month: "short" })} →{" "}
                      {dayLabel(stay.checkOut, { day: "numeric", month: "short" })} · {stay.guests}{" "}
                      {stay.guests === 1 ? "guest" : "guests"}
                    </span>
                  </span>
                  <span className={h.stayAction}>{action}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={h.muted}>{empty}</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* My rooms                                                            */
/* ------------------------------------------------------------------ */

export function RoomsSection() {
  const hotel = useHotel();
  if (hotel.isPending) return <Loading text="Loading your property…" />;
  if (hotel.isError) return <p className={s.error}>{hotel.error.message}</p>;
  if (!hotel.data) return <p className={s.error}>Your property listing wasn’t found. Contact BANJARA support.</p>;
  return (
    <div className={s.page}>
      <p className={h.muted}>
        Travellers book these room types. Prices are per room, per night. To close rooms on certain dates, use{" "}
        <Link href="/provider/availability">Availability</Link>.
      </p>
      <section className={s.card}>
        <RoomEditor hotelId={hotel.data.id} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

const DAYS = 42; // six weeks

export function AvailabilitySection() {
  const hotel = useHotel();
  const rooms = useQuery({
    queryKey: ["provider", "rooms", hotel.data?.id],
    queryFn: () => listMyRooms(hotel.data!.id),
    enabled: Boolean(hotel.data?.id),
  });
  const [roomId, setRoomId] = useState<string | null>(null);
  const list = rooms.data ?? [];
  const room = list.find((r) => r.id === roomId) ?? list[0];

  if (hotel.isPending || (hotel.data && rooms.isPending)) return <Loading />;
  if (hotel.isError || rooms.isError) return <p className={s.error}>{(hotel.error ?? rooms.error)?.message}</p>;
  if (!list.length) {
    return (
      <section className={s.card}>
        <p className={h.muted}>
          Add a room type first, then open or close its dates here. <Link href="/provider/rooms">Go to My rooms</Link>
        </p>
      </section>
    );
  }
  return (
    <div className={s.page}>
      <div className={h.roomTabs} role="tablist" aria-label="Room type">
        {list.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === room!.id}
            className={`${h.roomTab} ${r.id === room!.id ? h.roomTabOn : ""}`}
            onClick={() => setRoomId(r.id)}
          >
            {r.name}
            <small>{r.totalRooms} rooms</small>
          </button>
        ))}
      </div>
      <RoomCalendar key={room!.id} room={room!} />
    </div>
  );
}

function RoomCalendar({ room }: { room: OwnerRoom }) {
  const queryClient = useQueryClient();
  const key = ["provider", "availability", room.id];
  const nights = useQuery({ queryKey: key, queryFn: () => getRoomAvailability(room.id) });
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [count, setCount] = useState(room.totalRooms);
  const [busy, setBusy] = useState<"close" | "open" | null>(null);
  const today = ymd(new Date());

  const byDate = useMemo(() => {
    const map = new Map<string, NightAvailability>();
    for (const n of nights.data ?? []) map.set(n.date, n);
    return map;
  }, [nights.data]);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(today, i)), [today]);
  const leading = (new Date(`${today}T12:00:00`).getDay() + 6) % 7; // Monday-first grid

  const night = (date: string) => {
    const n = byDate.get(date);
    const total = n?.totalRooms || room.totalRooms;
    const booked = n?.bookedRooms ?? 0;
    const blocked = n?.blockedRooms ?? 0;
    return { total, booked, blocked, free: Math.max(0, total - booked - blocked) };
  };
  const last = end ?? start;
  const inRange = (date: string) => Boolean(start && last && date >= start && date <= last);

  const pick = (date: string) => {
    if (!start || end) {
      setStart(date);
      setEnd(null);
    } else if (date < start) {
      setStart(date);
    } else {
      setEnd(date);
    }
  };

  const apply = async (action: "close" | "open") => {
    if (!start) return;
    const to = addDays(last!, 1); // the API takes nights up to, not including, `to`
    setBusy(action);
    try {
      if (action === "close") await closeNights(room.id, start, to, count);
      else await reopenNights(room.id, start, to);
      toast.success(action === "close" ? "Those nights are closed to travellers." : "Those nights are open again.");
      setStart(null);
      setEnd(null);
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not update those nights.");
    } finally {
      setBusy(null);
    }
  };

  const selectedNights = start ? Math.round((Date.parse(`${last}T12:00:00`) - Date.parse(`${start}T12:00:00`)) / 86400000) + 1 : 0;

  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h3 className={h.cardTitle}>{room.name}</h3>
        <span className={h.muted}>Next six weeks · tap a night, or two nights for a range</span>
      </div>
      {nights.isPending ? (
        <Loading text="Loading the calendar…" />
      ) : nights.isError ? (
        <p className={s.error}>{nights.error.message}</p>
      ) : (
        <>
          <div className={h.weekdays} aria-hidden="true">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className={h.calendar}>
            {Array.from({ length: leading }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {days.map((date) => {
              const n = night(date);
              const tone = n.free === 0 ? (n.blocked ? h.closed : h.full) : n.blocked || n.booked ? h.partial : "";
              return (
                <button
                  key={date}
                  type="button"
                  className={`${h.day} ${tone} ${inRange(date) ? h.selected : ""}`}
                  aria-pressed={inRange(date)}
                  aria-label={`${dayLabel(date, { weekday: "long", day: "numeric", month: "long" })}: ${n.free} of ${n.total} free${n.booked ? `, ${n.booked} booked` : ""}${n.blocked ? `, ${n.blocked} closed` : ""}`}
                  onClick={() => pick(date)}
                >
                  <span className={h.dayNum}>
                    {dayLabel(date, { day: "numeric" })}
                    {date.endsWith("-01") || date === today ? <em>{dayLabel(date, { month: "short" })}</em> : null}
                  </span>
                  <span className={h.dayFree}>
                    {n.free}/{n.total}
                  </span>
                </button>
              );
            })}
          </div>
          <ul className={h.legend}>
            <li>
              <span className={h.day} /> Open
            </li>
            <li>
              <span className={`${h.day} ${h.partial}`} /> Some booked or closed
            </li>
            <li>
              <span className={`${h.day} ${h.full}`} /> Fully booked
            </li>
            <li>
              <span className={`${h.day} ${h.closed}`} /> Closed by you
            </li>
          </ul>
          {start ? (
            <div className={h.actionBar}>
              <p>
                <strong>
                  {dayLabel(start, { day: "numeric", month: "short" })}
                  {last !== start ? ` – ${dayLabel(last!, { day: "numeric", month: "short" })}` : ""}
                </strong>{" "}
                · {selectedNights} {selectedNights === 1 ? "night" : "nights"}
              </p>
              <label>
                Close
                <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {Array.from({ length: room.totalRooms }, (_, i) => room.totalRooms - i).map((value) => (
                    <option key={value} value={value}>
                      {value === room.totalRooms ? `all ${value} rooms` : `${value} ${value === 1 ? "room" : "rooms"}`}
                    </option>
                  ))}
                </select>
              </label>
              <div className={h.actionButtons}>
                <button type="button" className={s.secondary} disabled={busy !== null} onClick={() => void apply("open")}>
                  {busy === "open" ? <LoaderCircle size={14} className={h.spin} /> : null} Reopen
                </button>
                <button type="button" className={s.danger} disabled={busy !== null} onClick={() => void apply("close")}>
                  {busy === "close" ? <LoaderCircle size={14} className={h.spin} /> : null} Close nights
                </button>
                <button type="button" className={h.clear} onClick={() => { setStart(null); setEnd(null); }}>
                  Clear
                </button>
              </div>
            </div>
          ) : null}
          <p className={h.muted}>Booked nights stay booked: closing only stops new bookings.</p>
        </>
      )}
    </section>
  );
}
