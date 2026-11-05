import type {
  DiningPlan,
  RestaurantDetails,
} from "../types/customer/restaurant";

type RecordData = Record<string, unknown>;
const record = (value: unknown): RecordData =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordData)
    : {};
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const identity = (value: unknown) =>
  typeof value === "string"
    ? value
    : text(record(value)._id ?? record(value).id);
const strings = (value: unknown) =>
  Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : [];
const coordinate = (value: unknown, limit: number) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Math.abs(Number(value)) <= limit
    ? Number(value)
    : undefined;

/** Whitelist public dining fields; do not expose provider onboarding documents. */
export function mapRestaurantDetails(
  raw: RecordData,
): RestaurantDetails | null {
  const r = record(raw.restaurantDetails ?? raw.restaurant);
  if (!strings(raw.services).includes("restaurant") && !Object.keys(r).length)
    return null;
  const coordinates = record(raw.location).coordinates;
  const point = Array.isArray(coordinates) ? coordinates : [];
  const imageSources = strings(r.images);
  const images = (imageSources.length ? imageSources : [text(raw.logo)])
    .filter((source) => /^(https?:\/\/|\/(?!\/))/i.test(source))
    .map((source) => source.replace(/ /g, "%20"));
  return {
    id: identity(raw),
    userId: identity(raw.userId),
    name: text(r.restaurantName) || text(raw.businessName) || "Restaurant",
    city: text(r.city) || text(raw.city),
    address: text(r.address) || text(raw.address),
    description: text(r.description) || text(raw.description),
    cuisine: strings(r.cuisineTypes),
    menu: strings(r.menuVariety),
    images: [...new Set(images)],
    hours: text(r.hours),
    phone: text(r.phone) || text(raw.phone),
    website: text(r.website) || text(raw.website),
    verified: raw.verificationStatus === "approved",
    rating: Math.min(5, Math.max(0, Number(raw.rating) || 0)),
    reviewCount: Math.max(0, Math.floor(Number(raw.totalReviews) || 0)),
    latitude: coordinate(r.latitude ?? point[1] ?? raw.latitude, 90),
    longitude: coordinate(r.longitude ?? point[0] ?? raw.longitude, 180),
    offers: (Array.isArray(r.offers) ? r.offers : [])
      .map(record)
      .filter((offer) => offer.active !== false && text(offer.title))
      .map((offer, index) => ({
        id: identity(offer) || `offer-${index}`,
        title: text(offer.title),
        description: text(offer.description),
        discountPercent:
          Number(offer.discountPercent) > 0 &&
          Number(offer.discountPercent) <= 100
            ? Number(offer.discountPercent)
            : undefined,
      })),
  };
}

export const DINING_CATEGORIES = [
  "All items",
  "Dishes",
  "Bakery & sweets",
  "Drinks",
] as const;
export function diningCategory(
  item: string,
): (typeof DINING_CATEGORIES)[number] {
  if (
    /\b(tea|coffee|espresso|cappuccino|latte|juice|drink|chocolate|shake)\b/i.test(
      item,
    )
  )
    return "Drinks";
  if (
    /\b(cake|pie|pastry|pastries|dessert|crumble|biscotti|cookie|crepe|bakery|sweet)\b/i.test(
      item,
    )
  )
    return "Bakery & sweets";
  return "Dishes";
}
export function validDiningDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function diningPlanError(plan: DiningPlan, today: string) {
  if (!validDiningDate(plan.date) || plan.date < today)
    return "Choose today or a later date.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(plan.time))
    return "Choose a valid preferred time.";
  if (!Number.isInteger(plan.guests) || plan.guests < 1 || plan.guests > 20)
    return "Choose 1–20 guests. Contact the restaurant for a larger group.";
  if (!["any", "indoor", "outdoor"].includes(plan.seating))
    return "Choose a seating preference.";
  if (plan.notes.length > 500) return "Keep your notes within 500 characters.";
  return "";
}
export function diningEnquiry(restaurant: RestaurantDetails, plan: DiningPlan) {
  const interests = plan.interests.filter((item) =>
    restaurant.menu.includes(item),
  );
  return [
    `Hello ${restaurant.name}, I would like to enquire about a visit.`,
    `Date: ${plan.date}\nPreferred time: ${plan.time} (Pakistan time)\nGuests: ${plan.guests}`,
    `Seating preference: ${plan.seating === "any" ? "No preference" : `${plan.seating === "outdoor" ? "Outdoor" : "Indoor"}, if available`}`,
    ...(interests.length ? [`Menu interests: ${interests.join(", ")}`] : []),
    ...(plan.notes.trim() ? [`Notes: ${plan.notes.trim()}`] : []),
    "Please confirm availability, menu prices, and any reservation arrangements. Thank you.",
  ].join("\n\n");
}
export function restaurantPhone(value: string) {
  const cleaned = value.replace(/[\s().-]/g, "");
  return /^\+?\d{7,15}$/.test(cleaned) ? cleaned : "";
}
export function restaurantMapLinks(r: RestaurantDetails) {
  const lat = r.latitude,
    lng = r.longitude;
  const valid =
    lat !== undefined &&
    lng !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0);
  return {
    external: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(valid ? `${lat},${lng}` : [r.name, r.address, r.city].filter(Boolean).join(", "))}`,
    embed: valid
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${[lng - 0.02, lat - 0.015, lng + 0.02, lat + 0.015].join(",")}&layer=mapnik&marker=${lat},${lng}`
      : undefined,
  };
}
