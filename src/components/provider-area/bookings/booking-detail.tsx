"use client";
/* eslint-disable @next/next/no-img-element -- receipts are short-lived signed storage links */

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CarFront,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Flag,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Phone,
  Route,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
  Banknote,
  BedDouble,
  LogIn,
  LogOut,
  Navigation,
  UserX,
} from "lucide-react";
import { pakistanDate } from "@/lib/home-discovery";
import { directionsUrl } from "@/lib/map-config";
import { markRideNoShow } from "@/services/customer/intercity.service";
import { useQuery } from "@/lib/live-query";
import {
  PAYMENT_ISSUES,
  completeBooking,
  markCashReceived,
  checkInGuest,
  checkOutGuest,
  confirmBookingPayment,
  getBookingDetail,
  getBookingPayment,
  isOnlinePayment,
  reportPaymentIssue,
  setBookingStatus,
} from "@/services/customer/provider-dashboard.service";
import {
  bookingStatus,
  methodLabel,
  paymentLabel,
  rupees,
  tripWhen,
  when,
} from "./booking-format";
import b from "./bookings.module.css";

const VEHICLE_TYPE: Record<string, string> = {
  car: "Car",
  jeep: "Jeep",
  suv: "SUV",
  van: "Van",
  minibus: "Mini bus",
  mini_bus: "Mini bus",
  bus: "Bus",
  coaster: "Coaster",
  tourVehicle: "Tour vehicle",
  other: "Other",
};

/** One booking in full — the app's "Booking Details" screen. */
const STAY_STATUS: Record<string, string> = {
  booked: "Not arrived yet",
  checked_in: "Checked in",
  checked_out: "Checked out",
};

function stayDay(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function stayDates(checkIn: string, checkOut: string) {
  const fmt = (date: string) => {
    const d = new Date(`${date}T12:00:00`);
    return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  };
  return `${fmt(checkIn)} → ${fmt(checkOut)}`;
}

export function BookingDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<
    "confirmed" | "rejected" | "completed" | "cash" | "checkin" | "checkout" | "noshow" | null
  >(null);
  const [error, setError] = useState("");
  const booking = useQuery({
    queryKey: ["provider", "booking", id],
    queryFn: () => getBookingDetail(id),
  });

  if (booking.isPending) {
    return (
      <p className={b.loading} role="status">
        <LoaderCircle size={16} className="animate-spin" /> Loading booking…
      </p>
    );
  }
  if (booking.isError || !booking.data) {
    return (
      <p className={b.error}>
        {booking.error?.message ?? "Booking not found."}
      </p>
    );
  }
  const x = booking.data;
  const status = bookingStatus(x.status);
  const pending = ["pending", "payment_verification"].includes(x.status);
  const tripOver =
    x.tripDate &&
    new Date(`${x.tripDate}T${x.departureTime || "00:00"}:00`) < new Date();
  const stay = x.stay;
  // Hotel stays finish at check-out; rides are marked completed after the trip.
  const canComplete = !stay && x.status === "confirmed" && tripOver;
  const awaitingStay = Boolean(stay && x.status === "confirmed" && stay.status === "booked");
  // Guests are checked in from their check-in day (Pakistan time), as the API enforces.
  const arrivalDay = Boolean(stay && stay.checkIn && stay.checkIn <= pakistanDate());
  const canCheckIn = awaitingStay && arrivalDay;
  const notYetArrived = awaitingStay && !arrivalDay;
  const canCheckOut = Boolean(stay && x.status === "confirmed" && stay.status === "checked_in");
  // Online payments must be checked before the booking can be confirmed (cash is settled in person).
  const online = isOnlinePayment(x.paymentMethod);
  // Cash is paid in person, so the driver records it once the booking is approved.
  const cashDue =
    (x.paymentMethod === "cash" || x.paymentMethod === "payAtHotel") &&
    ["confirmed", "completed"].includes(x.status) &&
    x.paymentStatus !== "paid";

  const ride = x.intercity;
  // The API refuses (409, with the reason) until the no-show wait has passed.
  const canNoShow = Boolean(ride && x.status === "confirmed");

  const act = async (next: "confirmed" | "rejected" | "completed" | "cash" | "checkin" | "checkout" | "noshow") => {
    setError("");
    setBusy(next);
    try {
      if (next === "noshow") await markRideNoShow(x.id);
      else if (next === "completed") await completeBooking(x.id);
      else if (next === "cash") await markCashReceived(x.id);
      else if (next === "checkin") await checkInGuest(x.id);
      else if (next === "checkout") await checkOutGuest(x.id);
      else await setBookingStatus(x.id, next);
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn’t update this booking.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={b.detail}>
      <Link href="/provider/bookings" className={b.back}>
        <ArrowLeft size={15} /> Back to bookings
      </Link>

      <header className={b.detailHead}>
        <div>
          <p className={b.eyebrow}>
            <span /> Booking {x.number}
          </p>
          <h2>{x.route || "Booking"}</h2>
          <p className={b.detailSub}>
            {stay
              ? `${stayDates(stay.checkIn, stay.checkOut)} · ${stay.nights} ${stay.nights === 1 ? "night" : "nights"} · ${stay.rooms} ${stay.rooms === 1 ? "room" : "rooms"} · ${stay.guests} ${stay.guests === 1 ? "guest" : "guests"}`
              : `${tripWhen(x.tripDate, x.departureTime)} · ${
                  ride?.rideType === "full_car"
                    ? `Full car · ${ride.passengers} ${ride.passengers === 1 ? "passenger" : "passengers"}`
                    : x.seats.length
                      ? `Seat ${x.seats.join(", ")}`
                      : `${x.passengers.length} passenger(s)`
                }`}
          </p>
        </div>
        <div className={b.detailRight}>
          <span className={`${b.badge} ${b[status.tone]}`}>{status.label}</span>
          <strong>{rupees(x.amount)}</strong>
        </div>
      </header>

      {error ? <p className={b.error}>{error}</p> : null}

      {pending && online && x.paymentId ? (
        <PaymentCheck
          paymentId={x.paymentId}
          method={x.paymentMethod}
          onDecline={() => void act("rejected")}
          declining={busy === "rejected"}
        />
      ) : notYetArrived && stay ? (
        <div className={b.actionBar}>
          <span>
            This stay starts on {stayDay(stay.checkIn)}. You can check the guest in from that day.
          </span>
        </div>
      ) : pending || canComplete || canCheckIn || canCheckOut ? (
        <div className={b.actionBar}>
          <span>
            {pending
              ? "This traveller is waiting for your answer."
              : canCheckIn
                ? "When the guest arrives, check them in."
                : canCheckOut
                  ? "The guest is staying with you. Check them out when they leave."
                  : "The trip has passed. Mark it completed when the ride is done."}
          </span>
          <div className={b.actions}>
            {pending ? (
              <>
                <button
                  type="button"
                  className={b.decline}
                  disabled={Boolean(busy)}
                  onClick={() => void act("rejected")}
                >
                  {busy === "rejected" ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <X size={14} />
                  )}{" "}
                  Decline
                </button>
                <button
                  type="button"
                  className={b.approve}
                  disabled={Boolean(busy)}
                  onClick={() => void act("confirmed")}
                >
                  {busy === "confirmed" ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}{" "}
                  Approve booking
                </button>
              </>
            ) : canCheckIn || canCheckOut ? (
              <button
                type="button"
                className={b.approve}
                disabled={Boolean(busy)}
                onClick={() => void act(canCheckIn ? "checkin" : "checkout")}
              >
                {busy === "checkin" || busy === "checkout" ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : canCheckIn ? (
                  <LogIn size={14} />
                ) : (
                  <LogOut size={14} />
                )}{" "}
                {canCheckIn ? "Check in guest" : "Check out guest"}
              </button>
            ) : (
              <button
                type="button"
                className={b.approve}
                disabled={Boolean(busy)}
                onClick={() => void act("completed")}
              >
                {busy === "completed" ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <CheckCheck size={14} />
                )}{" "}
                Mark as completed
              </button>
            )}
          </div>
        </div>
      ) : null}

      {canNoShow ? (
        <div className={b.actionBar}>
          <span>Waited at the pickup and the traveller didn’t come? You can mark a no-show once the waiting time has passed.</span>
          <div className={b.actions}>
            <button type="button" className={b.decline} disabled={Boolean(busy)} onClick={() => void act("noshow")}>
              {busy === "noshow" ? <LoaderCircle size={14} className="animate-spin" /> : <UserX size={14} />} Mark no-show
            </button>
          </div>
        </div>
      ) : null}

      {!pending && online && x.paymentId && x.status !== "cancelled" ? (
        // After confirming, the driver can still look back at what the traveller sent.
        <PaymentCheck paymentId={x.paymentId} method={x.paymentMethod} />
      ) : null}

      <div className={b.grid}>
        <Card icon={UserRound} title="Customer">
          <Row label="Name" value={x.customerName} />
          <Row label="Phone" value={x.customerPhone} />
          <Row label="Email" value={x.customerEmail} />
          <div className={b.contact}>
            {x.customerPhone ? (
              <a href={`tel:${x.customerPhone}`} className={b.mini}>
                <Phone size={13} /> Call
              </a>
            ) : null}
            <Link
              href={
                x.customerId
                  ? `/provider/messages?with=${x.customerId}&booking=${x.id}`
                  : "/provider/messages"
              }
              className={b.mini}
            >
              <MessageSquare size={13} /> Message
            </Link>
          </div>
        </Card>

        {stay ? (
          <>
            <Card icon={BedDouble} title="Stay">
              <Row label="Room" value={stay.roomName} />
              <Row label="Property" value={stay.hotelName} />
              <Row label="Check-in" value={stayDay(stay.checkIn)} />
              <Row label="Check-out" value={stayDay(stay.checkOut)} />
              <Row label="Nights" value={String(stay.nights || "")} />
              <Row label="Rooms" value={String(stay.rooms)} />
              <Row label="Guests" value={String(stay.guests)} />
              <Row label="Stay status" value={STAY_STATUS[stay.status] ?? stay.status} />
            </Card>
            <Card icon={Users} title="Guest">
              <ul className={b.passengers}>
                {x.passengers.map((p, index) => (
                  <li key={`${p.name}-${index}`}>
                    <span className={b.avatarSmall}>{(p.name || "?").charAt(0).toUpperCase()}</span>
                    <span>
                      <strong>{p.name || "Guest"}</strong>
                      {p.phone ? <small>{p.phone}</small> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {stay.specialRequests ? (
                <p className={b.muted}>Requests: {stay.specialRequests}</p>
              ) : null}
            </Card>
          </>
        ) : (
          <>
            <Card icon={Route} title="Trip">
              <Row label="From" value={x.origin} />
              <Row label="To" value={x.destination} />
              <Row
                label="Departure"
                value={tripWhen(x.tripDate, x.departureTime)}
              />
              <Row
                label="Arrival"
                value={x.arrivalDate ? tripWhen(x.arrivalDate, x.arrivalTime) : ""}
              />
              <Row
                label="Journey"
                value={
                  x.journeyType === "round_trip"
                    ? "Round trip"
                    : x.journeyType
                      ? "One way"
                      : ""
                }
              />
              <Row
                label="Booking mode"
                value={
                  x.bookingMode === "vehicle"
                    ? "Whole vehicle"
                    : x.bookingMode
                      ? "By seat"
                      : ""
                }
              />
              {x.tripId ? (
                <Link href={`/provider/trips/${x.tripId}`} className={b.mini}>
                  View trip
                </Link>
              ) : null}
            </Card>

            {ride ? (
              <Card icon={MapPin} title="Door-to-door">
                <Row label="Pickup" value={ride.pickupAddress} />
                <Row label="Drop-off" value={ride.dropoffAddress} />
                <Row label="Ride" value={ride.rideType === "shared_seat" ? "Shared seat" : "Full car"} />
                <Row label="Leg" value={ride.leg === "return" ? "Return" : ride.leg ? "Outbound" : ""} />
                <Row label="Passengers" value={ride.passengers ? String(ride.passengers) : ""} />
                <Row
                  label="Luggage"
                  value={`${ride.luggage.bags} ${ride.luggage.bags === 1 ? "bag" : "bags"}${ride.luggage.large ? `, ${ride.luggage.large} large` : ""}`}
                />
                {ride.notes ? <p className={b.muted}>Note: {ride.notes}</p> : null}
                <div className={b.contact}>
                  {ride.pickupLat != null && ride.pickupLng != null ? (
                    <a href={directionsUrl(ride.pickupLat, ride.pickupLng)} target="_blank" rel="noreferrer" className={b.mini}>
                      <Navigation size={13} /> Directions to pickup
                    </a>
                  ) : null}
                  {ride.dropoffLat != null && ride.dropoffLng != null ? (
                    <a href={directionsUrl(ride.dropoffLat, ride.dropoffLng)} target="_blank" rel="noreferrer" className={b.mini}>
                      <Navigation size={13} /> Directions to drop-off
                    </a>
                  ) : null}
                  {x.returnBookingId ? (
                    <Link href={`/provider/bookings/${x.returnBookingId}`} className={b.mini}>
                      Return booking
                    </Link>
                  ) : null}
                  {x.outboundBookingId ? (
                    <Link href={`/provider/bookings/${x.outboundBookingId}`} className={b.mini}>
                      Outbound booking
                    </Link>
                  ) : null}
                </div>
              </Card>
            ) : (
            <Card icon={MapPin} title="Pickup & drop-off">
              <Row label="Pickup" value={x.pickup} />
              <Row
                label="Pickup address"
                value={x.pickupAddress !== x.pickup ? x.pickupAddress : ""}
              />
              <Row label="Drop-off" value={x.dropoff} />
              <Row
                label="Drop-off address"
                value={x.dropoffAddress !== x.dropoff ? x.dropoffAddress : ""}
              />
              {!x.pickup && !x.dropoff ? (
                <p className={b.muted}>
                  The traveller didn’t choose a pickup or drop-off point.
                </p>
              ) : null}
            </Card>
            )}

            <Card icon={Users} title="Seats & passengers">
              {x.seats.length ? (
                <div className={b.seatChips}>
                  {x.seats.map((seat) => (
                    <span key={seat}>{seat}</span>
                  ))}
                </div>
              ) : null}
              <ul className={b.passengers}>
                {x.passengers.map((p, index) => (
                  <li key={`${p.name}-${index}`}>
                    <span className={b.avatarSmall}>
                      {(p.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <strong>{p.name || "Passenger"}</strong>
                      {p.phone ? <small>{p.phone}</small> : null}
                    </span>
                    {x.seats[index] ? <em>Seat {x.seats[index]}</em> : null}
                  </li>
                ))}
              </ul>
            </Card>

            <Card icon={CarFront} title="Vehicle">
              <Row label="Name" value={x.vehicleName} />
              <Row
                label="Type"
                value={VEHICLE_TYPE[x.vehicleType] ?? x.vehicleType}
              />
              <Row label="Plate" value={x.vehiclePlate} mono />
            </Card>

          </>
        )}

        <Card icon={CreditCard} title="Payment">
          <Row label="Status" value={paymentLabel(x.paymentStatus, "")} />
          <Row label="Method" value={methodLabel(x.paymentMethod)} />
          {cashDue ? (
            <div className={b.cashDue}>
              <p>
                {stay
                  ? `Collect ${rupees(x.amount)} from the guest at the property, then record it here.`
                  : `Collect ${rupees(x.amount)} in cash from the traveller, then record it here.`}
              </p>
              <button
                type="button"
                className={b.approve}
                disabled={Boolean(busy)}
                onClick={() => void act("cash")}
              >
                {busy === "cash" ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Banknote size={14} />
                )}{" "}
                {stay ? "Payment received" : "Cash received"}
              </button>
            </div>
          ) : null}
          {x.fareBreakdown?.lines.map((line) => (
            <Row key={line.code} label={line.label} value={rupees(line.amount)} />
          ))}
          <Row label="Subtotal" value={rupees(x.subtotal)} />
          <Row label="Tax" value={rupees(x.tax)} />
          <Row label="Service fee" value={rupees(x.serviceFee)} />
          {x.discount > 0 ? (
            <Row label="Discount" value={`− ${rupees(x.discount)}`} />
          ) : null}
          <div className={b.total}>
            <span>Total</span>
            <strong>{rupees(x.amount)}</strong>
          </div>
        </Card>

        <Card icon={FileText} title="Booking record">
          <Row label="Booking number" value={x.number} mono />
          <Row label="Status" value={status.label} />
          <Row label="Booked on" value={when(x.createdAt)} />
        </Card>
      </div>
    </div>
  );
}

/**
 * The app's "Verify payment": waits for the traveller's proof, then lets the
 * driver confirm the money arrived (which confirms the booking) or report an issue.
 */
function PaymentCheck({
  paymentId,
  method,
  onDecline,
  declining,
}: {
  paymentId: string;
  method: string;
  /** Left out once the booking is settled: the card becomes a read-only record. */
  onDecline?: () => void;
  declining?: boolean;
}) {
  const readOnly = !onDecline;
  const queryClient = useQueryClient();
  const payment = useQuery({
    queryKey: ["provider", "payment", paymentId],
    queryFn: () => getBookingPayment(paymentId),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string>(PAYMENT_ISSUES[0].value);
  const [note, setNote] = useState("");
  const [viewing, setViewing] = useState<number | null>(null);

  if (payment.isPending) {
    return (
      <div className={b.actionBar}>
        <span>
          <LoaderCircle size={14} className="animate-spin" /> Checking the
          payment…
        </span>
      </div>
    );
  }
  if (payment.isError || !payment.data) {
    return (
      <p className={b.error}>
        {payment.error?.message ?? "We couldn’t load this payment."}
      </p>
    );
  }
  const p = payment.data;
  const proofIn =
    ["proof_submitted", "under_review", "disputed"].includes(p.status) &&
    p.proof;
  const mismatch = Boolean(
    p.proof && Math.round(p.proof.paidAmount) !== Math.round(p.amount),
  );
  const deadline = p.expiresAt ? new Date(p.expiresAt) : null;

  const run = async (task: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await task();
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      setReporting(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={b.payCheck} aria-label="Payment check">
      <header>
        <span className={b.icon}>
          <Wallet size={16} />
        </span>
        <div>
          <h3>
            {readOnly
              ? "Payment"
              : proofIn
                ? "Check the payment"
                : "Waiting for the traveller’s payment"}
          </h3>
          <p>
            {readOnly
              ? `Paid by ${methodLabel(method)}. Here is what the traveller sent.`
              : proofIn
                ? `The traveller says they paid by ${methodLabel(method)}. Check your own ${methodLabel(method)} history for this reference and the exact amount before confirming.`
                : `They chose ${methodLabel(method)}. You can confirm the booking once their payment proof arrives${
                    deadline && !Number.isNaN(deadline.getTime())
                      ? ` (they have until ${deadline.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })})`
                      : ""
                  }.`}
          </p>
        </div>
      </header>

      <dl className={b.payGrid}>
        <div>
          <dt>Booking total</dt>
          <dd>{rupees(p.amount)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{paymentLabel(p.status, "")}</dd>
        </div>
        {p.proof ? (
          <>
            <div>
              <dt>Paid amount</dt>
              <dd className={mismatch ? b.bad : undefined}>
                {rupees(p.proof.paidAmount)}
              </dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd className={b.mono}>{p.proof.referenceNumber}</dd>
            </div>
            {p.proof.paidAt ? (
              <div>
                <dt>Paid on</dt>
                <dd>{when(p.proof.paidAt)}</dd>
              </div>
            ) : null}
            {p.proof.note ? (
              <div className={b.wide}>
                <dt>Traveller’s note</dt>
                <dd>{p.proof.note}</dd>
              </div>
            ) : null}
            <div className={b.wide}>
              <dt>Receipts</dt>
              <dd>
                {p.proof.receipts.length ? (
                  <span className={b.receipts}>
                    {p.proof.receipts.map((url, index) => (
                      <button
                        key={url}
                        type="button"
                        className={b.receiptThumb}
                        onClick={() => setViewing(index)}
                        aria-label={`View receipt ${index + 1}`}
                      >
                        <img src={url} alt="" loading="lazy" />
                      </button>
                    ))}
                  </span>
                ) : (
                  "None attached"
                )}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      {mismatch ? (
        <p className={b.warn}>
          The paid amount differs from the booking total. Report the issue and
          settle the difference before confirming.
        </p>
      ) : null}
      {error ? <p className={b.error}>{error}</p> : null}

      {readOnly ? null : reporting ? (
        <div className={b.report}>
          <label>
            <span>What’s wrong?</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {PAYMENT_ISSUES.map((issue) => (
                <option key={issue.value} value={issue.value}>
                  {issue.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Details {reason === "other" ? "*" : "(optional)"}</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What did you see in your account?"
            />
          </label>
          <div className={b.actions}>
            <button
              type="button"
              className={b.ghost}
              onClick={() => setReporting(false)}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className={b.decline}
              disabled={busy || (reason === "other" && !note.trim())}
              onClick={() =>
                void run(() => reportPaymentIssue(paymentId, reason, note))
              }
            >
              <Flag size={14} /> Send report
            </button>
          </div>
        </div>
      ) : (
        <div className={b.actions}>
          <button
            type="button"
            className={b.decline}
            disabled={busy || declining}
            onClick={onDecline}
          >
            {declining ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <X size={14} />
            )}{" "}
            Decline
          </button>
          {proofIn ? (
            <>
              <button
                type="button"
                className={b.ghost}
                disabled={busy}
                onClick={() => setReporting(true)}
              >
                <Flag size={14} /> Report issue
              </button>
              <button
                type="button"
                className={b.approve}
                disabled={busy || mismatch}
                onClick={() => void run(() => confirmBookingPayment(paymentId))}
              >
                {busy ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}{" "}
                Confirm payment received
              </button>
            </>
          ) : null}
        </div>
      )}
      {viewing !== null && p.proof?.receipts[viewing] ? (
        <ReceiptViewer
          urls={p.proof.receipts}
          index={viewing}
          onChange={setViewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </section>
  );
}

/** Full-screen receipt viewer: arrows / ← → to flip, Esc or the backdrop to close. */
function ReceiptViewer({
  urls,
  index,
  onChange,
  onClose,
}: {
  urls: string[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const many = urls.length > 1;
  const go = (step: number) =>
    onChange((index + step + urls.length) % urls.length);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (many && event.key === "ArrowRight")
        onChange((index + 1) % urls.length);
      else if (many && event.key === "ArrowLeft")
        onChange((index - 1 + urls.length) % urls.length);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, many, onChange, onClose, urls.length]);

  return (
    <div
      className={b.viewer}
      role="dialog"
      aria-modal="true"
      aria-label="Payment receipt"
      onClick={onClose}
    >
      <div className={b.viewerBar} onClick={(event) => event.stopPropagation()}>
        <span>
          Receipt {index + 1}
          {many ? ` of ${urls.length}` : ""}
        </span>
        <a
          href={urls[index]}
          target="_blank"
          rel="noreferrer"
          className={b.viewerBtn}
        >
          <ExternalLink size={14} /> Open original
        </a>
        <button
          type="button"
          className={b.viewerBtn}
          onClick={onClose}
          aria-label="Close"
          autoFocus
        >
          <X size={16} />
        </button>
      </div>
      {many ? (
        <button
          type="button"
          className={`${b.viewerNav} ${b.viewerPrev}`}
          onClick={(event) => {
            event.stopPropagation();
            go(-1);
          }}
          aria-label="Previous receipt"
        >
          <ChevronLeft size={22} />
        </button>
      ) : null}
      <img
        src={urls[index]}
        alt={`Payment receipt ${index + 1}`}
        className={b.viewerImg}
        onClick={(event) => event.stopPropagation()}
      />
      {many ? (
        <button
          type="button"
          className={`${b.viewerNav} ${b.viewerNext}`}
          onClick={(event) => {
            event.stopPropagation();
            go(1);
          }}
          aria-label="Next receipt"
        >
          <ChevronRight size={22} />
        </button>
      ) : null}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={b.detailCard} aria-label={title}>
      <h3>
        <span className={b.icon}>
          <Icon size={15} />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={b.row}>
      <span>{label}</span>
      <strong className={mono ? b.mono : undefined}>{value}</strong>
    </div>
  );
}
