import { firstText } from "@/lib/records";

function hotelTypeKey(hotel: unknown) {
  return firstText(hotel, ["hotelType", "type"], "")
    .replace(/[_-\s]/g, "")
    .toLowerCase();
}

export function isGuestStay(hotel: unknown) {
  const type = hotelTypeKey(hotel);
  return type === "guesthouse" || type === "lodge";
}

export function isHotelStay(hotel: unknown) {
  return !isGuestStay(hotel);
}

export function stayTypeLabel(hotel: unknown) {
  const type = hotelTypeKey(hotel);
  if (type === "guesthouse") return "Guest house";
  if (type === "lodge") return "Lodge";
  if (type === "resort") return "Resort";
  if (type === "hotel") return "Hotel";
  return firstText(hotel, ["hotelType", "type"], "Stay");
}
