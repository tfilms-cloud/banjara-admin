"use client";
import {
  BedDouble,
  BusFront,
  CalendarDays,
  Check,
  Compass,
  Flag,
  Hourglass,
  Info,
  MapPin,
  Navigation,
  Phone,
  Route,
  Ticket,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { HomeImage } from "@/components/site/home/home-primitives";
import {
  bookingDate,
  bookingMoney,
  bookingStatusLabel,
  bookingTab,
  bookingTime,
  canCancelItinerary,
  canDownloadPass,
  hasPaymentDue,
  paymentStatusLabel,
} from "@/lib/booking-itineraries";
import type { ItineraryBooking } from "@/types/customer/itinerary-booking";
import styles from "./bookings.module.css";

export const BOOKING_ICONS: Record<ItineraryBooking["kind"], LucideIcon> = {
  transport: BusFront,
  hotel: BedDouble,
  tour: Compass,
  guide: Users,
};
export type BookingAction =
  "details" | "pass" | "payment" | "contact" | "location" | "cancel";
export function ItineraryBookingCard({
  booking: b,
  onAction,
}: {
  booking: ItineraryBooking;
  onAction: (booking: ItineraryBooking, action: BookingAction) => void;
}) {
  const Icon = BOOKING_ICONS[b.kind];
  const tag =
    b.kind === "transport"
      ? b.journey === "round_trip"
        ? "TWO WAY"
        : b.journey === "one_way"
          ? "ONE WAY"
          : "TRANSPORT"
      : b.kind === "hotel"
        ? b.nights > 0
          ? `${b.nights} NIGHT${b.nights === 1 ? "" : "S"} STAY`
          : "HOTEL STAY"
        : b.kind === "tour"
          ? b.duration || "EXPEDITION"
          : "PRIVATE GUIDE";
  return (
    <article
      className={styles.bookingCard}
      data-kind={b.kind}
      aria-label={`${b.title}, ${b.code || "Booking"}`}
    >
      <header className={styles.cardHeader}>
        <span className={styles.serviceIcon}>
          <Icon size={23} aria-hidden="true" />
        </span>
        <div>
          <h2>
            {b.title}
            <span className={styles.kindTag}>{tag}</span>
          </h2>
          <p>
            Booking ID: <strong>{b.code || b.id.slice(-8)}</strong>
          </p>
        </div>
        <span
          className={styles.status}
          data-tone={
            bookingTab(b.status) === "cancelled"
              ? "muted"
              : b.status === "pending" || b.status === "payment_verification"
                ? "pending"
                : "confirmed"
          }
        >
          <span />
          {bookingStatusLabel(b.status)}
        </span>
      </header>
      {b.kind === "transport" ? (
        <>
          <div className={styles.routeCapsule}>
            <div>
              <small>DEPARTURE</small>
              <strong>{b.from || "Departure to be confirmed"}</strong>
              <span>
                {bookingTime(b.time) || "Time to be confirmed"}
                {b.pickup ? ` · ${b.pickup}` : ""}
              </span>
            </div>
            <div className={styles.routeLine}>
              <small>{b.duration || "Scheduled journey"}</small>
              <span>
                <i />
                <span />
                <Navigation size={15} />
                <span />
                <i />
              </span>
              <small>
                {b.from && b.to ? `${b.from} → ${b.to}` : "Route details"}
              </small>
            </div>
            <div>
              <small>DESTINATION</small>
              <strong>{b.to || "Destination to be confirmed"}</strong>
              <span>
                {bookingTime(b.endTime)}
                {b.dropoff ? ` · ${b.dropoff}` : ""}
              </span>
            </div>
          </div>
          <div className={styles.facts}>
            <span>
              <CalendarDays size={15} />
              {bookingDate(b.date)}
            </span>
            <span>
              <Users size={15} />
              {b.bookingMode === "vehicle"
                ? "Private vehicle booking"
                : b.seats.length
                  ? `Seats ${b.seats.join(", ")}`
                  : `${b.guests} travelers`}
            </span>
            {b.vehicle && (
              <span>
                <BusFront size={15} />
                {b.vehicle}
              </span>
            )}
          </div>
        </>
      ) : b.kind === "hotel" ? (
        <div className={styles.stayCapsule}>
          {b.image && <HomeImage src={b.image} alt={b.roomName || b.title} />}
          <div>
            <h3>{b.roomName || "Your accommodation"}</h3>
            {b.amenities.length > 0 && (
              <p>{b.amenities.slice(0, 3).join(" · ")}</p>
            )}
            <div className={styles.stayFacts}>
              <div>
                <small>Dates</small>
                <strong>
                  {bookingDate(b.date)} – {bookingDate(b.endDate)}
                </strong>
              </div>
              <div>
                <small>Occupancy</small>
                <strong>
                  {b.guests} guests · {b.rooms}{" "}
                  {b.rooms === 1 ? "room" : "rooms"}
                </strong>
              </div>
            </div>
            <div className={styles.perks}>
              {b.checkInTime && (
                <span>
                  <Check size={14} />
                  Check-in: {bookingTime(b.checkInTime)}
                </span>
              )}
              {b.checkOutTime && (
                <span>
                  <Check size={14} />
                  Check-out: {bookingTime(b.checkOutTime)}
                </span>
              )}
              {b.cancellationPolicy && (
                <span>
                  <Info size={14} />
                  Cancellation policy in details
                </span>
              )}
            </div>
          </div>
        </div>
      ) : b.kind === "tour" ? (
        <div className={styles.tourCapsule}>
          <p>
            <Flag size={17} />
            <strong>
              Starts {bookingDate(b.date)}
              {b.location ? ` · ${b.location}` : ""}
            </strong>
            <span>{b.guests} travelers</span>
          </p>
          {b.duration && (
            <p>
              <CalendarDays size={15} />
              {b.duration}
              {b.endDate ? ` · Until ${bookingDate(b.endDate)}` : ""}
            </p>
          )}
          {b.amenities.length > 0 && (
            <div className={styles.perks}>
              {b.amenities.slice(0, 3).map((amenity, i) => (
                <span key={`${amenity}${i}`}>
                  <Check size={14} />
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={styles.guideCapsule}>
            {b.image ? (
              <HomeImage src={b.image} alt={b.title} />
            ) : (
              <span className={styles.guideAvatar}>{b.title.charAt(0)}</span>
            )}
            <div>
              <h3>{b.serviceName || "Private guiding service"}</h3>
              <p>
                Selected date: {bookingDate(b.date)}
                {b.time ? ` · ${bookingTime(b.time)}` : ""} · {b.guests} guests
              </p>
              {b.location && (
                <p>
                  <MapPin size={13} />
                  {b.location}
                </p>
              )}
            </div>
            {b.duration && <span>{b.duration}</span>}
          </div>
          {b.status === "pending" && (
            <div className={styles.guideNotice}>
              <Info size={18} />
              <p>
                Your guide request is awaiting provider approval. Check this
                page for updates.
              </p>
            </div>
          )}
        </>
      )}
      {hasPaymentDue(b) && (
        <div className={styles.paymentNotice}>
          <Hourglass size={21} />
          <div>
            <strong>{paymentStatusLabel(b.paymentStatus)}</strong>
            <p>Review the payment details for this booking.</p>
          </div>
          <button type="button" onClick={() => onAction(b, "payment")}>
            Payment details
          </button>
        </div>
      )}
      {b.detailsUnavailable && (
        <p className={styles.partialNotice}>
          Some provider details are temporarily unavailable.
        </p>
      )}
      <footer className={styles.cardFooter}>
        <div>
          <small>
            {b.kind === "hotel"
              ? "TOTAL ACCOMMODATIONS"
              : b.kind === "tour"
                ? "EXPEDITION TOTAL"
                : b.kind === "guide"
                  ? "GUIDE SERVICE TOTAL"
                  : "TOTAL FARE"}
          </small>
          <strong>{bookingMoney(b.total, b.currency)}</strong>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={
              canDownloadPass(b) && b.kind === "hotel"
                ? styles.primary
                : styles.softButton
            }
            onClick={() => onAction(b, canDownloadPass(b) ? "pass" : "details")}
          >
            <Ticket size={15} />
            {canDownloadPass(b)
              ? b.kind === "hotel"
                ? "View voucher"
                : b.kind === "tour"
                  ? "Expedition pass"
                  : b.kind === "guide"
                    ? "Guide pass"
                    : "View ticket & QR"
              : "View details"}
          </button>
          {(b.providerPhone || b.providerEmail) && (
            <button
              type="button"
              className={styles.softButton}
              onClick={() => onAction(b, "contact")}
            >
              <Phone size={14} />
              Contact{" "}
              {b.kind === "hotel"
                ? "host"
                : b.kind === "guide"
                  ? "guide"
                  : "provider"}
            </button>
          )}
          {(b.location || b.pickup || b.from) && (
            <button
              type="button"
              className={styles.softButton}
              onClick={() => onAction(b, "location")}
            >
              <Route size={14} />
              {b.kind === "hotel" ? "Directions" : "Meeting point"}
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => onAction(b, "details")}
            aria-label={`View booking details for ${b.code || b.title}`}
          >
            <Info size={17} />
          </button>
          {canCancelItinerary(b) && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => onAction(b, "cancel")}
            >
              <X size={14} />
              Cancel
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
