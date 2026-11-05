"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@/lib/live-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { HomeState } from "@/components/site/home/home-primitives";
import { pakistanDate } from "@/lib/home-discovery";
import {
  readTourPlan,
  tourBaseFare,
  tourBookingHref,
  tourEndDate,
  tourGuestError,
  tourTravelerLimit,
  validateTourPlan,
} from "@/lib/tour-details";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createTourBooking,
  getPublishedTour,
} from "@/services/customer/tour.service";
import type { AuthUser } from "@/types/auth";
import type { TourItinerary, TourPlan } from "@/types/customer/tour";
import base from "@/components/site/hotels/hotel-details.module.css";
import styles from "./tour-details.module.css";

export function WebsiteTourBooking({
  id,
  initialQuery,
}: {
  id: string;
  initialQuery: string;
}) {
  const auth = useCustomerAuth();
  const query = useQuery({
    queryKey: ["customer", "tour-details", id],
    queryFn: () => getPublishedTour(id),
    staleTime: 0,
  });
  return (
    <div className={`${base.page} ${styles.page}`}>
      <div className={styles.bookingContainer}>
        <Link href={`/tours/${id}?${initialQuery}`} className={styles.back}>
          <ArrowLeft size={14} />
          Back to expedition
        </Link>
        {auth.loading || query.isPending ? (
          <HomeState
            loading
            title="Loading reservation…"
            description="Checking the current package."
          />
        ) : !query.data ? (
          <HomeState
            title="Package unavailable"
            description={
              query.error?.message || "Try loading the package again."
            }
            retry={() => void query.refetch()}
          />
        ) : (
          <TourBookingForm
            key={`${id}:${auth.user?.id || "guest"}:${initialQuery}`}
            tour={query.data}
            initialPlan={readTourPlan(
              new URLSearchParams(initialQuery),
              query.data,
              pakistanDate(),
            )}
            user={auth.user}
          />
        )}
      </div>
    </div>
  );
}

function TourBookingForm({
  tour,
  initialPlan,
  user,
}: {
  tour: TourItinerary;
  initialPlan: TourPlan;
  user: AuthUser | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [guest, setGuest] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    specialRequests: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<
    "bankTransfer" | "easypaisa" | "cash"
  >("bankTransfer");
  const [submitting, setSubmitting] = useState(false);
  const error = validateTourPlan(tour, plan, pakistanDate());
  const endDate = tourEndDate(tour, plan.startDate);
  const money = (value: number) => formatCurrency(value, tour.currency);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const validation = validateTourPlan(tour, plan, pakistanDate());
    if (validation) {
      toast.error(validation);
      return;
    }
    if (!user) {
      router.push(
        `/account?auth=signin&next=${encodeURIComponent(tourBookingHref(tour, plan))}`,
      );
      return;
    }
    const contactError = tourGuestError(guest);
    if (contactError) {
      toast.error(contactError);
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createTourBooking(
        tour.id,
        plan,
        guest,
        paymentMethod,
      );
      toast.success(
        "Booking created. Review your total and payment instructions.",
      );
      router.replace(
        `/account/bookings?status=upcoming&category=tour&q=${encodeURIComponent(booking.code || booking.id)}`,
      );
    } catch (failure) {
      toast.error(
        failure instanceof Error
          ? failure.message
          : "Booking could not be created. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <div className={styles.bookingHeading}>
        <p>PACKAGE RESERVATION</p>
        <h1>{tour.title}</h1>
        <p>
          {tour.destination} · {tour.durationDays} days ·{" "}
          {money(tour.pricePerPerson)} per person
        </p>
      </div>
      {!user && (
        <div className={styles.error}>
          Sign in to complete your booking.{" "}
          <Link
            href={`/account?auth=signin&next=${encodeURIComponent(tourBookingHref(tour, plan))}`}
          >
            Sign in
          </Link>
        </div>
      )}
      <form className={styles.bookingForm} onSubmit={submit}>
        <fieldset disabled={submitting}>
          <legend>Your expedition</legend>
          <div className={styles.formGrid}>
            <label>
              Requested start date
              <input
                type="date"
                required
                min={pakistanDate()}
                value={plan.startDate}
                onInput={(event) =>
                  setPlan({ ...plan, startDate: event.currentTarget.value })
                }
                onChange={(event) =>
                  setPlan({ ...plan, startDate: event.target.value })
                }
              />
            </label>
            <label>
              Travelers
              <input
                type="number"
                required
                min={1}
                max={tourTravelerLimit(tour)}
                value={plan.travelers}
                onChange={(event) =>
                  setPlan({ ...plan, travelers: Number(event.target.value) })
                }
              />
            </label>
          </div>
          {endDate && (
            <p className={styles.muted}>
              Expected end date: {formatDate(endDate)}. Confirm departure
              arrangements with your operator.
            </p>
          )}
        </fieldset>
        <fieldset disabled={submitting}>
          <legend>Lead traveler details</legend>
          <label>
            Full name
            <input
              autoComplete="name"
              value={guest.name}
              required
              minLength={2}
              maxLength={120}
              onChange={(event) =>
                setGuest({ ...guest, name: event.target.value })
              }
            />
          </label>
          <div className={styles.formGrid}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={guest.email}
                maxLength={254}
                onChange={(event) =>
                  setGuest({ ...guest, email: event.target.value })
                }
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                autoComplete="tel"
                required
                minLength={10}
                maxLength={25}
                value={guest.phone}
                onChange={(event) =>
                  setGuest({ ...guest, phone: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Special requests (optional)
            <textarea
              maxLength={1500}
              value={guest.specialRequests}
              onChange={(event) =>
                setGuest({ ...guest, specialRequests: event.target.value })
              }
            />
          </label>
        </fieldset>
        <label>
          Payment method
          <select
            aria-label="Payment method"
            value={paymentMethod}
            disabled={submitting}
            onChange={(event) =>
              setPaymentMethod(event.target.value as typeof paymentMethod)
            }
          >
            <option value="bankTransfer">Bank transfer</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="cash">Cash</option>
          </select>
        </label>
        <div className={styles.breakdown}>
          <div>
            <span>Package fare ({plan.travelers} travelers)</span>
            <strong>{money(tourBaseFare(tour, plan.travelers))}</strong>
          </div>
          <div>
            <span>Taxes & service fees</span>
            <span>Calculated by the booking service</span>
          </div>
          <div className={styles.total}>
            <strong>Base fare subtotal</strong>
            <strong>{money(tourBaseFare(tour, plan.travelers))}</strong>
          </div>
        </div>
        <p className={styles.muted}>
          Creating this booking does not take payment. Review the final total,
          taxes, service fees and payment instructions on your booking before
          paying.
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {user ? (
          <button
            type="submit"
            className={styles.primary}
            disabled={submitting || !!error}
          >
            {submitting ? "Creating booking…" : "Create booking"}
            <ArrowRight size={17} />
          </button>
        ) : (
          <Link
            className={styles.primary}
            href={`/account?auth=signin&next=${encodeURIComponent(tourBookingHref(tour, plan))}`}
          >
            Sign in to continue <ArrowRight size={17} />
          </Link>
        )}
      </form>
    </>
  );
}
