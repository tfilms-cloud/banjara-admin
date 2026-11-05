import type { AuthUser } from "@/types/auth";
export type CustomerProfile = AuthUser & {
  preferences: Record<string, unknown>;
};
export type ProfileFields = {
  name: string;
  email: string;
  phone: string;
  baseCity: string;
};
export type SavedItem = {
  id: string;
  targetId: string;
  kind: "trip" | "hotel" | "provider";
};
export type SavedListing = SavedItem & {
  name: string;
  detail: string;
  href: string;
  unavailable?: boolean;
};
export type NotificationPreferences = {
  pushEnabled: boolean;
  bookings: boolean;
  payments: boolean;
  messages: boolean;
  trips: boolean;
  offers: boolean;
  reviews: boolean;
  system: boolean;
};
