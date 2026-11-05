"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Clock3, Info, MapPin, Minus, Plus, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { HomeDialog } from "@/components/site/home/home-primitives";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useQueryClient } from "@/lib/live-query";
import { pakistanDate } from "@/lib/home-discovery";
import { guideEndTime, guideFee, guideGuestError, guidePlanError, guidePlanQuery, guidePricingUnit } from "@/lib/guide-details";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createGuideBooking, getGuideAvailability, getGuideById } from "@/services/customer/guide.service";
import type { GuideAvailability, GuideGuest, GuidePlan, GuideProfile, GuideService } from "@/types/customer/guide";
import styles from "./guide-details.module.css";

type Props = { guide: GuideProfile; service?: GuideService; plan: GuidePlan; availability?: GuideAvailability; availabilityLoading: boolean; availabilityError: boolean; retryAvailability: () => void; setPlan: (patch: Partial<GuidePlan>) => void; selectService: (id: string) => void; contactHref: string; onReview: () => void; error: string };
export function GuideReservation({ guide, service, plan, availability, availabilityLoading, availabilityError, retryAvailability, setPlan, selectService, contactHref, onReview, error }: Props) {
  const fixed = !!service?.durationHours && service.pricingType !== "per_hour";
  const fee = service ? guideFee(service, plan) : 0;
  function submit(event: FormEvent) { event.preventDefault(); onReview(); }
  return <aside className={styles.reservationColumn} aria-label="Guide reservation">
    <form id="guide-reservation" className={styles.reservation} noValidate onSubmit={submit}>
      <div className={styles.rateHeading}><div><p className={styles.eyebrow}>YOUR NEXT ADVENTURE</p><h2>{service ? formatCurrency(service.price, service.currency) : "Let’s make a plan"}</h2><span>{service ? guidePricingUnit(service.pricingType) : "Contact for rates"}</span></div><span className={styles.rateIcon}><CalendarDays size={24} /></span></div>
      <label className={styles.field}>Guide service<select aria-label="Guide service" value={plan.service} onChange={e => selectService(e.target.value)} disabled={!guide.services.length}><option value="" disabled>Choose a service</option>{guide.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      {service?.durationLabel && <p className={styles.serviceDuration}><Clock3 size={14} />{service.durationLabel}</p>}
      <div className={styles.formGrid}><label className={styles.field}>Start date<input aria-label="Guide date" type="date" value={plan.date} min={availability?.availableFrom && availability.availableFrom > pakistanDate() ? availability.availableFrom : pakistanDate()} max={availability?.availableUntil || undefined} onInput={e => setPlan({ date: e.currentTarget.value })} onChange={e => setPlan({ date: e.target.value })} /></label><label className={styles.field}>Start time<input aria-label="Guide start time" type="time" value={plan.startTime} onInput={e => setPlan({ startTime: e.currentTarget.value })} onChange={e => setPlan({ startTime: e.target.value })} /></label></div>
      <div className={styles.formGrid}><label className={styles.field}>Duration (hours)<input aria-label="Guide duration" type="number" min={availability?.minBookingHours || .25} max={availability?.maxBookingHours || 23.75} step="0.25" value={plan.hours || ""} readOnly={fixed} onChange={e => setPlan({ hours: Number(e.target.value) })} /></label><div className={styles.endTime}><span>Expected finish</span><strong>{guideEndTime(plan) || "Arrange with guide"}</strong></div></div>
      <p className={styles.footnote}>Pakistan time · {fixed ? "Published service duration." : "Single-day session."} For multi-day routes, message the guide.</p>
      <div className={styles.guestHeading}><span><Users size={15} />Group size</span><small>{service ? `${service.minGuests}–${service.maxGuests} guests` : "Ask guide"}</small></div><div className={styles.party}><span>Travellers</span><div className={styles.stepper}><button type="button" aria-label="Fewer travellers" disabled={!service || plan.guests <= service.minGuests} onClick={() => setPlan({ guests: plan.guests - 1 })}><Minus size={15} /></button><output aria-label="Traveller count" aria-live="polite">{plan.guests}</output><button type="button" aria-label="More travellers" disabled={!service || plan.guests >= service.maxGuests} onClick={() => setPlan({ guests: plan.guests + 1 })}><Plus size={15} /></button></div></div>
      <label className={styles.field}>Meeting point<input aria-label="Guide meeting point" value={plan.meetingPoint} maxLength={300} onChange={e => setPlan({ meetingPoint: e.target.value })} placeholder="Discuss a pickup point" /></label>
      {service?.locations.length ? <label className={styles.field}>Service location<select aria-label="Guide service location" value={plan.location} onChange={e => setPlan({ location: e.target.value })}>{service.locations.map(location => <option key={location}>{location}</option>)}</select></label> : <label className={styles.field}>Service location<input aria-label="Guide service location" maxLength={150} value={plan.location} onChange={e => setPlan({ location: e.target.value })} placeholder="Where you’d like to explore" /></label>}
      <div className={styles.feeSummary}><div><span>Guide fee{service?.pricingType === "per_person" ? ` · ${plan.guests} guests` : service?.pricingType === "per_hour" ? ` · ${Math.max(1, plan.hours)} billable hours` : service?.pricingType === "per_day" ? ` · ${Math.max(1, Math.ceil(plan.hours / 8))} billable days` : ""}</span><strong>{service && fee ? formatCurrency(fee, service.currency) : "—"}</strong></div><p>Estimated guide fee. The booking service adds applicable tax and service fees and returns the final total.</p></div>
      {availabilityLoading && <p className={styles.footnote} role="status">Loading published availability…</p>}
      {availabilityError && <div className={styles.error} role="alert">Availability could not be loaded. <button type="button" onClick={retryAvailability}>Try again</button></div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.primary} type="submit" disabled={!service || availabilityLoading || availabilityError}>Review booking request<ArrowRight size={16} /></button>
      {contactHref && <Link className={styles.directContact} href={contactHref}>Direct enquiry with {guide.name.split(" ")[0]}<ArrowRight size={14} /></Link>}
      <div className={styles.bookingNote}><ShieldCheck size={18} /><p>The guide confirms your request. Time conflicts are checked when you submit.</p></div>
    </form>
    <div className={styles.planningNote}><MapPin size={20} /><div><h3>A little planning goes a long way</h3><p>Discuss the route, meeting point, inclusions, and any permits with your guide before setting out.</p></div></div>
  </aside>;
}

export function GuideBookingReview({ guide, service, plan, onClose }: { guide: GuideProfile; service: GuideService; plan: GuidePlan; onClose: () => void }) {
  const auth = useCustomerAuth(), router = useRouter(), client = useQueryClient();
  const [guest, setGuest] = useState<GuideGuest>({ name: auth.user?.name || "", email: auth.user?.email || "", phone: auth.user?.phone || "", specialRequests: "" });
  const [method, setMethod] = useState<"bankTransfer" | "easypaisa" | "cash">("bankTransfer");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const next = `/guides/${guide.id}?${guidePlanQuery(plan)}`;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (!auth.user) { router.push(`/account?auth=signin&next=${encodeURIComponent(next)}`); return; }
    const invalid = guideGuestError(guest);
    if (invalid) { setError(invalid); return; }
    lock.current = true; setPending(true); setError("");
    try {
      const [current, availability] = await Promise.all([getGuideById(guide.id), getGuideAvailability(guide.id)]);
      const selected = current.services.find(s => s.id === plan.service);
      const invalidPlan = guidePlanError(current, selected, plan, availability, pakistanDate());
      if (invalidPlan) throw new Error(invalidPlan);
      if (!selected || selected.currency !== service.currency || guideFee(selected, plan) !== guideFee(service, plan)) {
        void client.invalidateQueries({ queryKey: ["customer", "guide-details", guide.id] });
        throw new Error("The guide’s fee has changed. Close this review and check the updated service before continuing.");
      }
      const booking = await createGuideBooking(current, plan, guest, method);
      void client.invalidateQueries({ queryKey: ["customer", "itineraries"] });
      toast.success("Booking request created. Review the final total and payment instructions in My bookings.");
      router.push(`/account/bookings?status=upcoming&category=guide&q=${encodeURIComponent(booking.code || booking.id)}`);
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The booking request could not be created. Try again."); }
    finally { lock.current = false; setPending(false); }
  }
  return <HomeDialog title="Review your guide request" preventClose={pending} onClose={onClose}><form className={styles.reviewForm} onSubmit={submit}>
    <div className={styles.reviewSummary}><p className={styles.eyebrow}>YOUR GUIDE & EXPERIENCE</p><h3>{guide.name}</h3><p>{service.name}</p><div><span>{formatDate(plan.date)} · {plan.startTime}–{guideEndTime(plan)} PKT</span><span>{plan.guests} {plan.guests === 1 ? "traveller" : "travellers"} · {plan.hours} hours</span></div><strong>Estimated guide fee: {formatCurrency(guideFee(service, plan), service.currency)}</strong></div>
    <div className={styles.bookingNote}><Info size={18} /><p>Tax and service fees are added by the booking service. Your request stays pending until the guide accepts. No payment is taken by this form.</p></div>
    {!auth.user ? <Link className={styles.primary} href={`/account?auth=signin&next=${encodeURIComponent(next)}`}>Sign in to request this guide<ArrowRight size={16} /></Link> : <>
      <fieldset disabled={pending}><legend>Lead traveller details</legend><label className={styles.field}>Full name<input aria-label="Lead traveller name" autoComplete="name" required minLength={2} maxLength={120} value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} /></label><div className={styles.formGrid}><label className={styles.field}>Email<input aria-label="Lead traveller email" type="email" autoComplete="email" required maxLength={254} value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} /></label><label className={styles.field}>Phone<input aria-label="Lead traveller phone" type="tel" autoComplete="tel" required minLength={10} maxLength={25} value={guest.phone} onChange={e => setGuest({ ...guest, phone: e.target.value })} /></label></div><label className={styles.field}>Special requests<textarea aria-label="Guide booking requests" rows={3} maxLength={1000} value={guest.specialRequests} onChange={e => setGuest({ ...guest, specialRequests: e.target.value })} placeholder="Dietary needs, access requirements, or a question for your guide" /></label><label className={styles.field}>Payment arrangement<select aria-label="Guide payment method" value={method} onChange={e => setMethod(e.target.value as typeof method)}><option value="bankTransfer">Bank transfer</option><option value="easypaisa">Easypaisa</option><option value="cash">Pay later / cash</option></select></label></fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.primary} type="submit" disabled={pending}>{pending ? "Creating request…" : "Create booking request"}<ArrowRight size={16} /></button>
    </>}
  </form></HomeDialog>;
}
