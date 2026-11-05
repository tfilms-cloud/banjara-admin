import type {
  CustomerProfile,
  ProfileFields,
  SavedItem,
} from "@/types/customer/profile";
import type { ItineraryBooking } from "@/types/customer/itinerary-booking";const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export function profileFields(profile: CustomerProfile): ProfileFields {
  const city = record(profile.preferences.websiteProfile).baseCity;
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    baseCity: typeof city === "string" ? city : "",
  };
}
export function validateProfile(fields: ProfileFields) {
  const errors: Partial<Record<keyof ProfileFields, string>> = {};
  if (fields.name.trim().length < 2 || fields.name.trim().length > 120)
    errors.name = "Enter a name between 2 and 120 characters.";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) ||
    fields.email.trim().length > 254
  )
    errors.email = "Enter a valid email address.";
  if (
    !/^[+\d\s().-]{6,30}$/.test(fields.phone.trim()) ||
    fields.phone.replace(/\D/g, "").length < 6
  )
    errors.phone = "Enter a valid phone number between 6 and 30 characters.";
  if (fields.baseCity.trim().length > 120)
    errors.baseCity = "Keep your base city within 120 characters.";
  return errors;
}
/** Retain the latest server preferences; never replace notification or other app settings. */
export function profilePatch(profile: CustomerProfile, fields: ProfileFields) {
  const patch: {
    name: string;
    email: string;
    phone: string;
    preferences?: Record<string, unknown>;
  } = {
    name: fields.name.trim(),
    email: fields.email.trim().toLowerCase(),
    phone: fields.phone.trim(),
  };
  if (fields.baseCity.trim() !== profileFields(profile).baseCity)
    patch.preferences = {
      ...profile.preferences,
      websiteProfile: {
        ...record(profile.preferences.websiteProfile),
        baseCity: fields.baseCity.trim(),
      },
    };
  return patch;
}
export function uniqueSavedItems(rows: SavedItem[]) {
  return [
    ...new Map(
      rows
        .filter(
          (r) =>
            r.id &&
            r.targetId &&
            ["trip", "hotel", "provider"].includes(r.kind),
        )
        .map((r) => [`${r.kind}:${r.targetId}`, r]),
    ).values(),
  ];
}
export function profileBookingSummary(bookings: ItineraryBooking[]) {
  const active = bookings.filter((b) =>
    ["pending", "confirmed", "payment_verification", "disputed"].includes(
      b.status,
    ),
  );
  const completed = bookings.filter((b) => b.status === "completed");
  const paid = new Map<string, number>();
  bookings
    .filter(
      (b) =>
        ["paid", "confirmed"].includes(b.paymentStatus) &&
        b.status !== "refunded",
    )
    .forEach((b) =>
      paid.set(b.currency, (paid.get(b.currency) ?? 0) + b.total),
    );
  const next = [...active].sort((a, b) => {
    const x = Date.parse(a.date),
      y = Date.parse(b.date);
    return (
      (Number.isFinite(x) ? x : Infinity) - (Number.isFinite(y) ? y : Infinity)
    );
  })[0];
  return {
    active,
    completed,
    next,
    paid: [...paid].map(([currency, total]) => ({ currency, total })),
    refundPending: bookings.filter((b) => b.paymentStatus === "refund_pending")
      .length,
    destinations: [
      ...new Set(
        completed.map((b) => b.to || b.location || b.subtitle).filter(Boolean),
      ),
    ].slice(0, 3),
  };
}
export function validateNewPassword(
  current: string,
  next: string,
  confirm: string,
) {
  if (!current) return "Enter your current password.";
  // Mirrors lib/password-rule.ts (kept inline so this file stays dependency-free for node tests).
  if (next.length < 8 || next.length > 72)
    return "Use a new password between 8 and 72 characters.";
  if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next))
    return "Include at least one letter and one number.";
  if (next !== confirm) return "The new passwords do not match.";
  if (next === current)
    return "Choose a password different from your current one.";
  return "";
}
