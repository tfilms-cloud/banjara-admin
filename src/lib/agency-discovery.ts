import type { Agency, TripWithDetails } from "../types/customer/trip";

export type TransportAgencyGroup = {
  agencyId: string;
  agency: Agency;
  tripCount: number;
  vehicleNames: string[];
  routes: string[];
  oneWayCount: number;
  roundTripCount: number;
  fares: { amount: number; currency: string; unit: "seat" | "vehicle" }[];
};

/** Match mobile Explore: one transporter card per business from matching live inventory. */
export function groupTransportAgencies(
  trips: TripWithDetails[],
): TransportAgencyGroup[] {
  const groups = new Map<string, TransportAgencyGroup>();
  const seen = new Set<string>();
  for (const trip of trips) {
    const agencyId = trip.agencyId || trip.agency.id;
    if (
      !agencyId ||
      seen.has(`${agencyId}:${trip.id}`) ||
      !Number.isFinite(trip.availableSeats) ||
      trip.availableSeats <= 0 ||
      !Number.isFinite(trip.price) ||
      trip.price < 0 ||
      [
        "cancelled",
        "canceled",
        "completed",
        "departed",
        "expired",
        "suspended",
        "rejected",
        "inactive",
        "draft",
      ].includes((trip.status || "").toLowerCase())
    )
      continue;
    seen.add(`${agencyId}:${trip.id}`);
    let group = groups.get(agencyId);
    if (!group) {
      group = {
        agencyId,
        agency: trip.agency,
        tripCount: 0,
        vehicleNames: [],
        routes: [],
        oneWayCount: 0,
        roundTripCount: 0,
        fares: [],
      };
      groups.set(agencyId, group);
    }
    group.tripCount++;
    if (trip.journeyType === "round_trip") group.roundTripCount++;
    else group.oneWayCount++;
    const route = `${trip.from} → ${trip.to}`;
    if (!group.routes.includes(route)) group.routes.push(route);
    if (trip.vehicleName && !group.vehicleNames.includes(trip.vehicleName))
      group.vehicleNames.push(trip.vehicleName);
    const unit = trip.bookingMode === "vehicle" ? "vehicle" : "seat";
    const currency = trip.currency || "PKR";
    const fare = group.fares.find(
      (f) => f.unit === unit && f.currency === currency,
    );
    if (fare) fare.amount = Math.min(fare.amount, trip.price);
    else group.fares.push({ amount: trip.price, currency, unit });
  }
  return [...groups.values()].sort(
    (a, b) =>
      (b.agency.rating || 0) - (a.agency.rating || 0) ||
      b.tripCount - a.tripCount ||
      a.agency.name.localeCompare(b.agency.name),
  );
}

export function transportAgencyHref(
  trip: Pick<TripWithDetails, "agencyId" | "agency" | "id">,
) {
  const id = trip.agencyId || trip.agency.id;
  return id
    ? `/agencies/${encodeURIComponent(id)}`
    : `/trips/${encodeURIComponent(trip.id)}`;
}
