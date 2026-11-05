import type { PickupPoint, TripWithDetails } from "../types/customer/trip";

export function tripDeparture(trip: TripWithDetails) {
  return Date.parse(
    `${trip.date.slice(0, 10)}T${/^\d{2}:\d{2}/.test(trip.departureTime) ? trip.departureTime.slice(0, 5) : "invalid"}:00+05:00`,
  );
}
export function tripBookingState(trip: TripWithDetails, now = Date.now()) {
  const unavailable = [
    "cancelled",
    "canceled",
    "completed",
    "departed",
    "intransit",
    "expired",
    "suspended",
    "rejected",
    "inactive",
    "draft",
  ].includes((trip.status || "").toLowerCase());
  const seatCount = Number.isFinite(trip.availableSeats)
    ? Math.max(0, Math.floor(trip.availableSeats))
    : 0;
  const available = trip.seatLayout?.length
    ? Math.min(
        seatCount,
        trip.seatLayout.filter((s) => s.status === "available").length,
      )
    : seatCount;
  const past =
    !Number.isFinite(tripDeparture(trip)) || tripDeparture(trip) < now;
  const validPrice = Number.isFinite(trip.price) && trip.price >= 0;
  return {
    canBook: !unavailable && !past && available > 0 && validPrice,
    maxPassengers:
      trip.bookingMode === "vehicle"
        ? 1
        : Math.max(0, Math.min(10, Math.floor(available))),
    label:
      unavailable || past
        ? "Departure unavailable"
        : available <= 0
          ? "Sold out"
          : !validPrice
            ? "Fare unavailable"
            : "Available",
  };
}
export function tripQuantity(trip: TripWithDetails, value: unknown) {
  const max = tripBookingState(trip).maxPassengers;
  return Math.max(1, Math.min(max || 1, Math.floor(Number(value)) || 1));
}
export function tripBaseFare(trip: TripWithDetails, count: number) {
  return (
    trip.price *
    (trip.bookingMode === "vehicle" ? 1 : tripQuantity(trip, count))
  );
}
export function tripBookingHref(
  trip: TripWithDetails,
  count: number,
  pickupId?: string,
) {
  const params = new URLSearchParams({
    passengers: String(tripQuantity(trip, count)),
  });
  if (pickupId && trip.pickupLocations.some((p) => p.id === pickupId))
    params.set("pickupPoint", pickupId);
  return `/trips/${encodeURIComponent(trip.id)}/book?${params}`;
}
export function availableTripSeats(trip: TripWithDetails) {
  return [
    ...new Set(
      (trip.seatLayout || [])
        .filter((s) => s.status === "available")
        .map((s) => s.seatNumber),
    ),
  ];
}
export function tripPickup(trip: TripWithDetails, pickupId: string) {
  return (
    trip.pickupLocations.find((p) => p.id === pickupId) ||
    trip.pickupLocations[0]
  );
}
export function tripPickupMap(point: PickupPoint) {
  const valid =
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude!) <= 90 &&
    Math.abs(point.longitude!) <= 180 &&
    !(point.latitude === 0 && point.longitude === 0);
  const query = valid
    ? `${point.latitude},${point.longitude}`
    : point.address || point.name;
  return {
    embed: `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`,
    external: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
  };
}
export function tripPhotos(trip: TripWithDetails) {
  return [
    ...new Set([trip.image, ...(trip.vehicleImages || [])].filter(Boolean)),
  ];
}
export function tripTimeline(trip: TripWithDetails) {
  const origin = trip.pickupLocations[0],
    destination = trip.dropoffLocations?.[0];
  return [
    {
      name: origin?.name || trip.from,
      description: origin?.address || trip.from,
      time: trip.departureTime,
      kind: "Origin",
    },
    ...(trip.stops || []).map((p) => ({ ...p, kind: "Transit stop" })),
    {
      name: destination?.name || trip.to,
      description: destination?.address || trip.to,
      time: trip.arrivalTime,
      kind: "Destination",
    },
  ];
}
