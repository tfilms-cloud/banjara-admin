import type { TripSearchParams, TripWithDetails } from "@/types/customer/trip";
import type { HotelSearchParams } from "@/types/customer/hotel";

/** Keep Home search constraints when results are displayed by the Figma Explore page. */
export function readExploreSearch(params: URLSearchParams) {
  const text = (key: string) => (params.get(key) || "").trim().slice(0, 100);
  const count = (key: string, fallback: number, max: number) => {
    const value = Number(params.get(key));
    return Number.isInteger(value) && value >= fallback ? Math.min(value, max) : fallback;
  };
  const date = (key: string) => {
    const value = text(key);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
  };
  const trip: TripSearchParams = {
    from: text("from"), to: text("to"), date: date("date"), passengers: count("passengers", 1, 100),
    journeyType: params.get("journeyType") === "round_trip" ? "round_trip" : params.get("journeyType") === "one_way" ? "one_way" : undefined,
  };
  const hotel: HotelSearchParams = {
    destination: text("destination"), checkIn: date("checkIn"), checkOut: date("checkOut"),
    adults: count("adults", 1, 100), children: count("children", 0, 100), rooms: count("rooms", 1, 50),
  };
  const bookingMode = ["seat", "vehicle"].includes(params.get("bookingMode") || "") ? params.get("bookingMode")! : "";
  return {
    trip, hotel, bookingMode, vehicle: text("vehicle"),
    returnDate: date("returnDate"),
    hasTripSearch: Boolean(trip.from || trip.to || trip.date || bookingMode || params.has("passengers")),
    hasHotelSearch: Boolean(hotel.destination || hotel.checkIn || hotel.checkOut || params.has("adults")),
  };
}

export function matchesExploreJourney(trip: TripWithDetails, search: ReturnType<typeof readExploreSearch>, vehicleLabel: string) {
  const normalizeVehicle = (value: string) => value.toLowerCase().replace(/[_-]/g, " ");
  const matchesVehicle = [vehicleLabel, trip.vehicleClass, trip.vehicleCategory, trip.vehicleType]
    .some(value => value && normalizeVehicle(value) === normalizeVehicle(search.vehicle));
  return (!search.bookingMode || trip.bookingMode === search.bookingMode)
    && (!search.returnDate || trip.returnDate?.slice(0, 10) === search.returnDate)
    && (!search.vehicle || search.vehicle === "all" || matchesVehicle);
}
