import { customerGet } from "@/lib/customer-api";
import { normalizeMediaUrl, type AnyRecord } from "@/lib/customer-mappers";
import { serverGet } from "@/lib/server-api";
import { asArray, idOf } from "@/lib/utils";
import type { DiscoveryListing } from "./discovery.service";
import { mapRestaurantDetails } from "@/lib/restaurant-details";

export async function getRestaurantById(id: string) {
  const path = `/providers/public/${encodeURIComponent(id)}`;
  const raw =
    typeof window === "undefined"
      ? await serverGet<AnyRecord>(path)
      : await customerGet<AnyRecord>(path);
  const restaurant = mapRestaurantDetails(raw);
  if (!restaurant || restaurant.id !== id)
    throw new Error("This restaurant is no longer available.");
  return restaurant;
}

export type RestaurantListing = DiscoveryListing & {
  cuisine: string[];
  offers: { title: string; type: string; discountPercent: number }[];
  visitScore: number;
};
export async function getExploreRestaurants(): Promise<RestaurantListing[]> {
  const params = { service: "restaurant", limit: 40 };
  const data =
    typeof window === "undefined"
      ? await serverGet<unknown>("/providers/catalog", params)
      : await customerGet<unknown>("/providers/catalog", { params });
  return asArray<AnyRecord>(data)
    .map((raw) => {
      const details = raw.restaurantDetails ?? raw.restaurant;
      const r = (
        details && typeof details === "object" ? details : {}
      ) as AnyRecord;
      const cuisine = Array.isArray(r.cuisineTypes)
        ? r.cuisineTypes.map(String)
        : [];
      const offers = asArray<AnyRecord>(r.offers)
        .filter((o) => o.active !== false && o.title)
        .map((o) => ({
          title: String(o.title),
          type: String(o.type ?? "offer"),
          discountPercent: Number(o.discountPercent ?? 0),
        }));
      const rating = Number(raw.rating ?? 0);
      const reviewCount = Number(raw.totalReviews ?? 0);
      const images = Array.isArray(r.images) ? r.images : [];
      return {
        id: idOf(raw),
        name: String(r.restaurantName || raw.businessName || "Restaurant"),
        destination: String(r.city || raw.city || ""),
        description: String(r.description || raw.description || ""),
        image: normalizeMediaUrl(String(images[0] || raw.logo || "")) ?? "",
        price: 0,
        priceUnit: "",
        verified: raw.verificationStatus === "approved",
        rating,
        reviewCount,
        phone: String(r.phone || raw.phone || "") || undefined,
        details: [
          ...cuisine,
          ...(r.hours ? [String(r.hours)] : []),
          ...offers.map((o) => o.title),
        ],
        cuisine,
        offers,
        visitScore:
          rating * 10 +
          reviewCount +
          (Array.isArray(r.menuVariety) ? r.menuVariety.length * 2 : 0) +
          offers.length,
      };
    })
    .filter((r) => r.id);
}
export function rankRestaurantOffers(list: RestaurantListing[]) {
  const score = (r: RestaurantListing) =>
    r.offers.reduce(
      (sum, o) =>
        sum +
        (o.type === "sale" ? 30 : o.type === "discount" ? 20 : 10) +
        o.discountPercent,
      0,
    );
  return [...list].sort(
    (a, b) =>
      score(b) - score(a) ||
      b.rating! - a.rating! ||
      b.visitScore - a.visitScore,
  );
}
