import {
  customerGet,
  customerPut,
  customerRequest,
} from "@/lib/customer-api";
import { mapCustomerUser } from "@/lib/customer-mappers";
import {
  getCustomerSessionSnapshot,
  setCustomerSessionUser,
} from "@/lib/customer-session-store";

/** Id of the signed-in site user, from the in-memory session. */
const sessionUserId = () => getCustomerSessionSnapshot().user?.id;
import { profilePatch, uniqueSavedItems } from "@/lib/customer-profile";
import { asArray, idOf } from "@/lib/utils";
import { getTripById } from "./trip.service";
import { getHotelById } from "./hotel.service";
import type {
  CustomerProfile,
  ProfileFields,
  SavedItem,
  SavedListing,
  NotificationPreferences,
} from "@/types/customer/profile";
type Raw = Record<string, unknown>;
function mapProfile(raw: Raw): CustomerProfile {
  return {
    ...mapCustomerUser(raw),
    preferences:
      raw.preferences &&
      typeof raw.preferences === "object" &&
      !Array.isArray(raw.preferences)
        ? (raw.preferences as Raw)
        : {},
  };
}
export async function getCustomerProfile() {
  return mapProfile(await customerGet<Raw>("/users/me"));
}
export function applyCustomerProfile(profile: CustomerProfile) {
  if (sessionUserId() !== profile.id) return;
  setCustomerSessionUser(mapCustomerUser(profile));
}
export async function saveCustomerProfile(
  fields: ProfileFields,
  ownerId: string,
) {
  const latest = await getCustomerProfile();
  if (
    latest.id !== ownerId ||
    sessionUserId() !== ownerId
  )
    throw new Error("Your account changed. Refresh this page before saving.");
  return mapProfile(
    await customerPut<Raw>("/users/me", profilePatch(latest, fields)),
  );
}
export async function saveCustomerAvatar(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
      file.type,
    ) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a JPEG, PNG, WebP or GIF photo smaller than 5 MB.");
  const form = new FormData();
  form.append("file", file);
  return mapProfile(
    await customerRequest<Raw>({
      url: "/users/me/avatar",
      method: "PUT",
      data: form,
      headers: { "Content-Type": undefined },
      timeout: 60000,
    }),
  );
}
export async function changeCustomerPassword(
  currentPassword: string,
  newPassword: string,
) {
  await customerPut("/users/me/password", { currentPassword, newPassword });
}
export async function getCustomerSavedItems(): Promise<SavedItem[]> {
  const rows = asArray<Raw>(await customerGet("/favorites"));
  return uniqueSavedItems(
    rows.map((r) => ({
      id: idOf(r),
      targetId: idOf(r.targetId),
      kind: r.targetType as SavedItem["kind"],
    })),
  );
}
export async function getSavedListing(item: SavedItem): Promise<SavedListing> {
  try {
    if (item.kind === "trip") {
      const trip = await getTripById(item.targetId);
      if (!trip) throw new Error("Unavailable");
      return {
        ...item,
        name: `${trip.from} → ${trip.to}`,
        detail: trip.agency.name,
        href: `/trips/${item.targetId}`,
      };
    }
    if (item.kind === "hotel") {
      const hotel = await getHotelById(item.targetId);
      if (!hotel) throw new Error("Unavailable");
      return {
        ...item,
        name: hotel.name,
        detail: hotel.location.address,
        href: `/hotels/${item.targetId}`,
      };
    }
    const provider = await customerGet<Raw>(
      `/providers/public/${item.targetId}`,
    );
    const name = String(provider.businessName || "Saved provider");
    return {
      ...item,
      name,
      detail: String(provider.city || "Service provider"),
      href:
        Array.isArray(provider.services) &&
        provider.services.some((s) => s === "transport" || s === "carRental")
          ? `/agencies/${item.targetId}`
          : Array.isArray(provider.services) && provider.services.includes("restaurant")
            ? `/restaurants/${item.targetId}`
            : Array.isArray(provider.services) && provider.services.includes("travelGuide")
              ? `/guides/${item.targetId}`
              : `/explore?q=${encodeURIComponent(name)}`,
    };
  } catch {
    return {
      ...item,
      name: `Saved ${item.kind}`,
      detail: "This listing is currently unavailable.",
      href: "/explore",
      unavailable: true,
    };
  }
}
export async function getCustomerNotificationPreferences() {
  return customerGet<NotificationPreferences>("/notifications/preferences");
}
export async function saveCustomerNotificationPreferences(
  value: NotificationPreferences,
) {
  return customerRequest<NotificationPreferences>({
    method: "PATCH",
    url: "/notifications/preferences",
    data: value,
  });
}
