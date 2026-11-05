import type { GuideAvailability, GuideGuest, GuidePlan, GuidePricing, GuideProfile, GuideReview, GuideService } from "../types/customer/guide";

type Data = Record<string, unknown>;
const record = (v: unknown): Data => v && typeof v === "object" && !Array.isArray(v) ? v as Data : {};
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const identity = (v: unknown) => typeof v === "string" ? v : text(record(v)._id ?? record(v).id);
const strings = (v: unknown) => Array.isArray(v) ? [...new Set(v.map(text).filter(Boolean))] : [];
const rows = (v: unknown) => Array.isArray(v) ? v.map(record) : [];
const media = (v: unknown) => /^(https?:\/\/|\/(?!\/))/i.test(text(v)) ? text(v).replace(/ /g, "%20") : "";
const number = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const PRICING = ["per_person", "per_group", "per_hour", "per_day", "custom"];

/** Public business fields only. Identity documents and private onboarding details never reach the view. */
export function mapGuideProfile(raw: Data): GuideProfile | null {
  if (!strings(raw.services).some(s => ["travelGuide", "guide", "tourGuide"].includes(s))) return null;
  const g = record(raw.guideDetails ?? raw.guide), legacy = record(raw.tourDetails);
  const legacyMode = !text(g.fullName) && !rows(g.languages).length;
  const services: GuideService[] = rows(g.services).filter(s => s.active !== false).map(s => ({
    id: text(s.id), name: text(s.name) || "Guide service", category: text(s.category), description: text(s.description),
    durationLabel: text(s.durationLabel), durationHours: number(s.durationHours) > 0 ? number(s.durationHours) : undefined,
    price: number(s.price), pricingType: (PRICING.includes(text(s.pricingType)) ? text(s.pricingType) : "") as GuidePricing,
    currency: /^[A-Z]{3}$/.test(text(s.currency).toUpperCase()) ? text(s.currency).toUpperCase() : "PKR",
    minGuests: number(s.minGuests, 1), maxGuests: Math.min(50, number(s.maxGuests, 20)),
    included: strings(s.included), excluded: strings(s.excluded), meetingPoint: text(s.meetingPoint),
    locations: strings(s.availableLocations), notes: text(s.notes),
  })).filter(s => !!s.id);
  const daily = number(g.dailyHireRate ?? (legacyMode ? legacy.dailyHireRate ?? legacy.price : undefined));
  // This fallback is the mobile app's existing daily hire contract; no service id is posted.
  if (!rows(g.services).some(s => s.active !== false) && daily > 0) services.push({
    id: "daily-hire", fallback: true, name: "Daily guide hire", category: "local", description: text(g.shortBio) || text(raw.description),
    durationLabel: "Daily hire", durationHours: 8, price: daily, pricingType: "per_day", currency: "PKR",
    minGuests: 1, maxGuests: 20, included: [], excluded: [], meetingPoint: "", locations: strings(g.areasCovered), notes: "",
  });
  const profilePhotos = rows(g.photos).map(p => ({ url: media(p.url), caption: text(p.caption), category: text(p.category) })).filter(p => p.url);
  const photos = profilePhotos.length || !legacyMode ? profilePhotos : strings(legacy.images).map(url => ({ url: media(url), caption: "", category: "other" })).filter(p => p.url);
  return {
    id: identity(raw), userId: identity(raw.userId), name: text(g.fullName) || text(raw.ownerName) || text(raw.businessName) || "Local guide",
    city: text(g.city) || text(raw.city), currentLocation: text(g.currentLocation),
    portrait: media(g.profilePhoto) || media(raw.logo), photos,
    bio: text(g.shortBio) || (legacyMode ? text(legacy.experienceHistory ?? legacy.description) : ""),
    description: text(g.detailedDescription) || text(g.shortBio) || text(raw.description), phone: text(g.phone) || text(raw.phone),
    verified: raw.verificationStatus === "approved", rating: Math.max(0, Math.min(5, number(raw.rating))),
    reviewCount: Math.max(0, Math.floor(number(raw.totalReviews))), yearsExperience: Math.max(0, number(g.yearsExperience ?? raw.yearsExperience)),
    guideTypes: strings(g.guideTypes), areas: strings(g.areasCovered ?? (legacyMode ? legacy.operatingAreas : [])),
    skills: strings(g.specialSkills ?? (legacyMode ? legacy.specialties : [])), certifications: strings(g.certifications ?? (legacyMode ? legacy.certifications : [])),
    training: strings(g.training), awards: strings(g.awards), expertise: strings(g.areasOfExpertise),
    languages: rows(g.languages).filter(l => text(l.language)).map(l => ({ language: text(l.language), proficiency: text(l.proficiency) })), services,
  };
}
export function mapGuideAvailability(raw: Data): GuideAvailability {
  return {
    weekly: rows(raw.weekly).map(d => ({ day: text(d.day), enabled: d.enabled === true, startTime: text(d.startTime), endTime: text(d.endTime) })),
    blockedDates: strings(raw.blockedDates), availableFrom: text(raw.availableFrom).slice(0, 10), availableUntil: text(raw.availableUntil).slice(0, 10),
    minBookingHours: number(raw.minBookingHours) > 0 ? number(raw.minBookingHours) : undefined,
    maxBookingHours: number(raw.maxBookingHours) > 0 ? number(raw.maxBookingHours) : undefined,
    advanceBookingHours: Math.max(0, number(raw.advanceBookingHours)),
  };
}
export function mapGuideReviews(raw: unknown): GuideReview[] {
  return rows(raw).filter(r => r.serviceType === "guide" && number(r.rating) >= 1 && number(r.rating) <= 5).map(r => ({
    id: identity(r), rating: number(r.rating), comment: text(r.serviceComment) || text(r.comment), createdAt: text(r.createdAt), reply: text(r.providerReply),
  })).filter(r => r.id);
}
export const guidePricingUnit = (type: GuidePricing) => ({ per_person: "per person", per_group: "per group", per_hour: "per hour", per_day: "per day", custom: "custom rate" })[type] || "Ask guide";
export const guideServiceBookable = (s: GuideService) => !!s.id && s.price > 0 && Number.isFinite(s.price) && PRICING.includes(s.pricingType) && Number.isInteger(s.minGuests) && Number.isInteger(s.maxGuests) && s.minGuests >= 1 && s.maxGuests >= s.minGuests;
export const validGuideDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
export function guideMinutes(time: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : NaN; }
export function guideEndTime(plan: GuidePlan) {
  const end = guideMinutes(plan.startTime) + plan.hours * 60;
  return Number.isInteger(end) && end > 0 && end < 1440 ? `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}` : "";
}
export function guideFee(s: GuideService, plan: GuidePlan) {
  if (!guideServiceBookable(s) || !Number.isFinite(plan.hours) || plan.hours <= 0 || !Number.isInteger(plan.guests) || plan.guests < s.minGuests || plan.guests > s.maxGuests) return 0;
  return s.price * (s.pricingType === "per_person" ? plan.guests : s.pricingType === "per_hour" ? Math.max(1, plan.hours) : s.pricingType === "per_day" ? Math.max(1, Math.ceil(plan.hours / 8)) : 1);
}
export function guideDay(availability: GuideAvailability, date: string) {
  if (!validGuideDate(date)) return undefined;
  const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(`${date}T12:00:00Z`).getUTCDay()];
  return availability.weekly.find(slot => slot.day === day);
}
export function readGuidePlan(params: URLSearchParams, guide: GuideProfile, today: string): GuidePlan {
  const s = guide.services.find(s => s.id === params.get("service")) || guide.services.find(guideServiceBookable) || guide.services[0];
  const hours = Number(params.get("hours"));
  const guests = Number(params.get("guests"));
  const date = params.get("date") || "";
  return {
    service: s?.id || "", date: validGuideDate(date) && date >= today ? date : today,
    startTime: Number.isFinite(guideMinutes(params.get("time") || "")) ? params.get("time")! : "09:00",
    hours: s?.durationHours && s.pricingType !== "per_hour" ? s.durationHours : hours > 0 && hours <= 24 ? hours : s?.durationHours || 8,
    guests: s && Number.isInteger(guests) && guests >= s.minGuests && guests <= s.maxGuests ? guests : s ? Math.max(s.minGuests, Math.min(2, s.maxGuests)) : 1,
    meetingPoint: s?.meetingPoint || "", location: s?.locations[0] || guide.city,
  };
}
export function guidePlanQuery(plan: GuidePlan) { return new URLSearchParams({ service: plan.service, date: plan.date, time: plan.startTime, hours: String(plan.hours), guests: String(plan.guests) }); }
/** Suggest a published working slot, without claiming that existing bookings have been checked. */
export function suggestGuidePlan(guide: GuideProfile, params: URLSearchParams, availability: GuideAvailability | undefined, today: string, now = Date.now()) {
  const plan = readGuidePlan(params, guide, today);
  if (params.has("date") || !availability) return plan;
  const service = guide.services.find(s => s.id === plan.service);
  for (let offset = 0; offset < 90; offset++) {
    const date = new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
    const day = guideDay(availability, date);
    const candidate = { ...plan, date, startTime: day?.startTime || plan.startTime };
    if (!guidePlanError(guide, service, candidate, availability, today, now)) return candidate;
  }
  return plan;
}
export function guidePlanError(guide: GuideProfile, s: GuideService | undefined, plan: GuidePlan, availability: GuideAvailability | undefined, today: string, now = Date.now()) {
  if (!guide.verified || !s || !guideServiceBookable(s) || s.id !== plan.service) return "Choose an available guide service.";
  if (s.currency !== "PKR") return "Contact the guide to arrange this service in its listed currency.";
  if (!validGuideDate(plan.date) || plan.date < today) return "Choose today or a later date.";
  if (!Number.isInteger(plan.guests) || plan.guests < s.minGuests || plan.guests > s.maxGuests) return `Choose ${s.minGuests}–${s.maxGuests} guests for this service.`;
  if (!Number.isFinite(plan.hours) || plan.hours <= 0 || !Number.isInteger(plan.hours * 4)) return "Choose a valid duration in 15-minute increments.";
  if (s.durationHours && s.pricingType !== "per_hour" && plan.hours !== s.durationHours) return "Use the service’s published duration.";
  if (plan.hours >= 24 || (s.durationHours && s.durationHours >= 24)) return "Contact this guide to arrange a multi-day itinerary.";
  if (!Number.isFinite(guideMinutes(plan.startTime)) || !guideEndTime(plan)) return "Choose a start time that finishes on the same day.";
  if (!availability) return "Load the guide’s availability before requesting a booking.";
  if (availability.blockedDates.includes(plan.date) || (availability.availableFrom && plan.date < availability.availableFrom) || (availability.availableUntil && plan.date > availability.availableUntil)) return "The guide is not available on this date.";
  const day = guideDay(availability, plan.date);
  if (!day?.enabled) return "The guide is not available on this day of the week.";
  if (!Number.isFinite(guideMinutes(day.startTime)) || !Number.isFinite(guideMinutes(day.endTime))) return "Ask the guide to confirm their working hours.";
  if (guideMinutes(plan.startTime) < guideMinutes(day.startTime) || guideMinutes(guideEndTime(plan)) > guideMinutes(day.endTime)) return `Choose a time within ${day.startTime}–${day.endTime} (Pakistan time).`;
  if (availability.minBookingHours && plan.hours < availability.minBookingHours) return `Book at least ${availability.minBookingHours} hours.`;
  if (availability.maxBookingHours && plan.hours > availability.maxBookingHours) return `This guide accepts up to ${availability.maxBookingHours} hours per booking.`;
  const when = Date.parse(`${plan.date}T${plan.startTime}:00+05:00`);
  if (when < now) return "Choose a future start time.";
  if (when - now < availability.advanceBookingHours * 3600000) return `This guide needs ${availability.advanceBookingHours} hours’ advance notice.`;
  if (plan.meetingPoint.trim().length > 300 || plan.location.trim().length > 150) return "Shorten your meeting point or location.";
  return "";
}
export function guideGuestError(guest: GuideGuest) {
  if (guest.name.trim().length < 2 || guest.name.trim().length > 120) return "Enter the lead traveller’s full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim()) || guest.email.length > 254) return "Enter a valid email address.";
  if (!/^\+?[\d\s().-]{10,25}$/.test(guest.phone.trim()) || guest.phone.replace(/\D/g, "").length < 10) return "Enter a valid phone number.";
  if (guest.specialRequests.length > 1000) return "Keep special requests within 1,000 characters.";
  return "";
}
export function guideBookingPayload(guide: GuideProfile, plan: GuidePlan, guest: GuideGuest, paymentMethod: "bankTransfer" | "easypaisa" | "cash") {
  return { bookingType: "guide", paymentMethod, guideBooking: {
    providerId: guide.id, serviceId: guide.services.find(s => s.id === plan.service)?.fallback ? undefined : plan.service,
    date: plan.date, startTime: plan.startTime, endTime: guideEndTime(plan), durationHours: plan.hours, guests: plan.guests,
    meetingPoint: plan.meetingPoint.trim() || undefined, availableLocation: plan.location.trim() || undefined,
    specialRequest: guest.specialRequests.trim() || undefined,
    guestDetails: { name: guest.name.trim(), email: guest.email.trim(), phone: guest.phone.trim(), specialRequests: guest.specialRequests.trim() || undefined },
  } };
}
