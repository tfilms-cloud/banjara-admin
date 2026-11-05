import type { HotelRoom, HotelStay } from "../types/customer/hotel";

export function roomStayQuery(stay: HotelStay) {
  return new URLSearchParams(
    Object.entries(stay).map(([key, value]) => [key, String(value)]),
  );
}

export function roomDetailsHref(room: HotelRoom, stay: HotelStay) {
  return `/hotels/${encodeURIComponent(room.hotelId)}/rooms/${encodeURIComponent(room.id)}?${roomStayQuery(stay)}`;
}

export function roomSelectionHref(room: HotelRoom, stay: HotelStay) {
  const query = roomStayQuery(stay);
  query.set("roomId", room.id);
  return `/hotels/${encodeURIComponent(room.hotelId)}?${query}#available-hotel-rooms`;
}

export function roomSizeLabel(room: HotelRoom) {
  return Number.isFinite(room.sizeSqm) && room.sizeSqm > 0
    ? `${room.sizeSqm} m² (${Math.round(room.sizeSqm * 10.76391)} sq ft)`
    : "Size not published";
}

export function roomAbout(room: HotelRoom) {
  const description = room.description.trim();
  if (description && description !== room.roomType) return description;
  return (
    [
      room.bedType ? `A room with ${room.bedType}` : "A guest room",
      room.capacity > 0 ? `for up to ${room.capacity} guests` : "",
      room.sizeSqm > 0 ? `with ${room.sizeSqm} m² of space` : "",
    ]
      .filter(Boolean)
      .join(" ") + "."
  );
}

/** A catalog room alone cannot establish availability for specific stay dates. */
export function roomAvailabilityError(
  room: HotelRoom,
  stay: HotelStay,
  availableRoom?: HotelRoom,
) {
  if (room.status && room.status !== "active")
    return "This room is not accepting reservations.";
  if (!Number.isFinite(room.capacity) || room.capacity < 1)
    return "Confirm room capacity with the property.";
  if (stay.adults + stay.children > room.capacity * stay.rooms)
    return "Choose more rooms or fewer guests for this room type.";
  if (
    !availableRoom ||
    availableRoom.id !== room.id ||
    availableRoom.hotelId !== room.hotelId
  )
    return "This room is unavailable for your selected dates and guests.";
  if (
    !Number.isFinite(availableRoom.pricePerNight) ||
    availableRoom.pricePerNight < 0
  )
    return "The nightly rate is unavailable. Please contact the property.";
  if (
    !Number.isFinite(availableRoom.availableRooms) ||
    availableRoom.availableRooms < stay.rooms
  )
    return "Not enough rooms are available for this stay.";
  return "";
}

const amenityGroups = [
  {
    name: "Sleeping & Comfort",
    pattern: /bed|pillow|linen|blanket|curtain|wardrobe|sofa|mattress/i,
  },
  {
    name: "Heating & Climate",
    pattern: /heat|bukhari|fire|air.?con|\bac\b|fan|insulat/i,
  },
  {
    name: "Bathroom & Grooming",
    pattern: /bath|shower|toilet|towel|soap|dryer|hot water/i,
  },
  {
    name: "Tech & Connectivity",
    pattern:
      /wi.?fi|internet|tv|television|power|electric|charging|desk|socket/i,
  },
  {
    name: "Dining & Refreshments",
    pattern: /coffee|tea\b|kettle|breakfast|dining|fridge|kitchen|meal|water/i,
  },
  {
    name: "Outdoor & Views",
    pattern: /balcony|terrace|view|garden|outdoor|mountain/i,
  },
];

export function groupRoomAmenities(amenities: string[]) {
  const groups = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const raw of amenities) {
    const value = raw.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    const name =
      amenityGroups.find((group) => group.pattern.test(value))?.name ??
      "Other Room Features";
    groups.set(name, [...(groups.get(name) ?? []), value]);
  }
  return [...groups].map(([name, items]) => ({ name, items }));
}
