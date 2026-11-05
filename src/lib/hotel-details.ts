import type { Hotel, HotelRoom, HotelStay } from "@/types/customer/hotel";

export function validStayDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function stayNights(checkIn: string, checkOut: string) {
  return validStayDate(checkIn) && validStayDate(checkOut)
    ? Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000)
    : 0;
}
export function nextStayDate(date: string, days = 1) {
  return new Date(Date.parse(date) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function readHotelStay(
  params: URLSearchParams,
  today: string,
): HotelStay {
  const incoming = params.get("checkIn") ?? "";
  const checkIn =
    validStayDate(incoming) && incoming >= today ? incoming : today;
  const outgoing = params.get("checkOut") ?? "";
  const checkOut =
    validStayDate(outgoing) &&
    outgoing > checkIn &&
    stayNights(checkIn, outgoing) <= 90
      ? outgoing
      : nextStayDate(checkIn, 2);
  const count = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(params.get(key));
    return params.has(key) &&
      Number.isInteger(value) &&
      value >= min &&
      value <= max
      ? value
      : fallback;
  };
  return {
    checkIn,
    checkOut,
    adults: count("adults", 2, 1, 30),
    children: count("children", 0, 0, 20),
    rooms: count("rooms", 1, 1, 10),
  };
}
export function validateHotelStay(stay: HotelStay, today: string) {
  if (!validStayDate(stay.checkIn) || !validStayDate(stay.checkOut))
    return "Choose valid check-in and check-out dates.";
  if (stay.checkIn < today) return "Check-in must be today or later.";
  const nights = stayNights(stay.checkIn, stay.checkOut);
  if (nights < 1 || nights > 90) return "Choose a stay of 1–90 nights.";
  if (
    !Number.isInteger(stay.adults) ||
    stay.adults < 1 ||
    stay.adults > 30 ||
    !Number.isInteger(stay.children) ||
    stay.children < 0 ||
    stay.children > 20 ||
    !Number.isInteger(stay.rooms) ||
    stay.rooms < 1 ||
    stay.rooms > 10
  )
    return "Choose a valid number of guests and rooms.";
  return "";
}
export function hotelPhotos(hotel: Hotel, rooms: HotelRoom[]) {
  return [
    ...new Set(
      [...hotel.images, ...rooms.flatMap((room) => room.images)].filter(
        Boolean,
      ),
    ),
  ];
}
export function publicWebsite(value?: string) {
  if (!value?.trim()) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value))
    return undefined;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    return ["https:", "http:"].includes(url.protocol)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
export function hotelMapLinks(hotel: Hotel) {
  const { latitude: lat, longitude: lng } = hotel.location;
  const hasCoordinates =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0);
  return {
    external: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hasCoordinates ? `${lat},${lng}` : `${hotel.name}, ${hotel.location.address}, ${hotel.location.city}`)}`,
    embed: hasCoordinates
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${[lng - 0.035, lat - 0.02, lng + 0.035, lat + 0.02].join(",")}&layer=mapnik&marker=${lat},${lng}`
      : undefined,
  };
}
