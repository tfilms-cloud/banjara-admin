import {
  customerDel,
  customerGet,
  customerPost,
  customerPut,
} from "@/lib/customer-api";

type Row = Record<string, unknown>;
const text = (value: unknown) => (value == null ? "" : String(value));

export type SavedRoute = {
  id: string;
  from: string;
  to: string;
  /** Minutes; 0 when unknown. */
  durationMinutes: number;
  stops: string[];
};

export type TripFormData = {
  vehicle: {
    id: string;
    name: string;
    seats: number;
    active: boolean;
    status: string;
  } | null;
  routes: SavedRoute[];
  defaultFare: number;
  defaultBookingMode: "seat" | "vehicle";
  pickupSuggestions: string[];
  dropoffSuggestions: string[];
};

/** Strips the " · From → To" corridor suffix the app adds to saved stop names. */
const stopName = (raw: string) => raw.split(" · ")[0].trim();

/** Everything the trip form needs: the driver's vehicle, saved routes and usual fare. */
export async function getTripFormData(): Promise<TripFormData> {
  const [profile, vehicles, routes] = await Promise.all([
    customerGet<Row>("/providers/me"),
    customerGet<unknown>("/vehicles"),
    customerGet<unknown>("/routes").catch(() => []),
  ]);
  const transport = (profile.transportDetails ?? {}) as Row;
  const rows = (Array.isArray(vehicles) ? vehicles : []) as Row[];
  const plate = text(transport.registrationNumber).toUpperCase();
  const v =
    rows.find((row) => text(row.registrationNumber).toUpperCase() === plate) ??
    rows.find((row) => row.status !== "rejected");

  const saved: SavedRoute[] = (
    (Array.isArray(routes) ? routes : []) as Row[]
  ).map((route) => ({
    id: text(route._id ?? route.id),
    from: text((route.origin as Row | undefined)?.name ?? route.origin),
    to: text((route.destination as Row | undefined)?.name ?? route.destination),
    durationMinutes: Number(route.estimatedDuration) || 0,
    stops: Array.isArray(route.stops) ? route.stops.map(String) : [],
  }));
  // Routes from "You & your vehicle" (e.g. "Hunza → Gilgit") that aren't saved routes yet.
  for (const raw of Array.isArray(transport.operatingRoutes)
    ? (transport.operatingRoutes as unknown[])
    : []) {
    const [from, to] = String(raw).split(/\s*(?:→|->)\s*/);
    if (
      from &&
      to &&
      !saved.some(
        (r) =>
          r.from.toLowerCase() === from.toLowerCase() &&
          r.to.toLowerCase() === to.toLowerCase(),
      )
    ) {
      saved.push({
        id: "",
        from: from.trim(),
        to: to.trim(),
        durationMinutes: 0,
        stops: [],
      });
    }
  }

  return {
    vehicle: v
      ? {
          id: text(v._id ?? v.id),
          name: text(v.name),
          seats: Number(v.seatCount) || 0,
          status: text(v.status),
          active: v.status === "active",
        }
      : null,
    routes: saved,
    defaultFare: Number(transport.priceAmount) || 0,
    defaultBookingMode:
      transport.pricingMethod === "per_vehicle" ? "vehicle" : "seat",
    pickupSuggestions: [
      ...new Set(
        (Array.isArray(transport.pickupLocations)
          ? transport.pickupLocations
          : []
        ).map((x) => stopName(String(x))),
      ),
    ],
    dropoffSuggestions: [
      ...new Set(
        (Array.isArray(transport.dropoffLocations)
          ? transport.dropoffLocations
          : []
        ).map((x) => stopName(String(x))),
      ),
    ],
  };
}

export type TripInput = {
  vehicleId: string;
  routeId?: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate?: string;
  arrivalTime?: string;
  /** PickupPoint ids (pinned on the map) or plain place names. */
  pickupPoints: string[];
  dropoffPoints: string[];
  price: number;
  description?: string;
  journeyType: "one_way" | "round_trip";
  returnDate?: string;
  returnTime?: string;
  bookingMode: "seat" | "vehicle";
};

/** A pickup or drop-off: pinned on the map (has an id) or just a name. */
export type TripStop = {
  id?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

export type EditableTrip = Omit<
  TripInput,
  "vehicleId" | "pickupPoints" | "dropoffPoints"
> & {
  pickupPoints: TripStop[];
  dropoffPoints: TripStop[];
  id: string;
  status: string;
  bookedSeats: number;
  totalSeats: number;
};

/** One of the driver's trips, shaped for the edit form. */
export async function getTripForEdit(id: string): Promise<EditableTrip> {
  const t = await customerGet<Row>(`/trips/${id}`);
  const stops = (list: unknown): TripStop[] =>
    (Array.isArray(list) ? list : [])
      .map((p) => {
        if (!p || typeof p !== "object") return { name: text(p) };
        const r = p as Row;
        const lat = Number(r.latitude);
        const lng = Number(r.longitude);
        const pinned =
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          (lat !== 0 || lng !== 0);
        return {
          id: text(r._id ?? r.id) || undefined,
          name: text(r.name),
          address:
            text(r.address) !== text(r.name) ? text(r.address) : undefined,
          ...(pinned ? { latitude: lat, longitude: lng } : {}),
        };
      })
      .filter((s) => s.name);
  return {
    id: text(t._id ?? t.id),
    routeId: t.routeId ? text(t.routeId) : undefined,
    origin: text(t.origin),
    destination: text(t.destination),
    departureDate: text(t.departureDate).slice(0, 10),
    departureTime: text(t.departureTime),
    arrivalDate: t.arrivalDate ? text(t.arrivalDate).slice(0, 10) : undefined,
    arrivalTime: t.arrivalTime ? text(t.arrivalTime) : undefined,
    pickupPoints: stops(t.pickupPoints),
    dropoffPoints: stops(t.dropoffPoints),
    price: Number(t.price) || 0,
    description: text(t.description),
    journeyType: t.journeyType === "round_trip" ? "round_trip" : "one_way",
    returnDate: t.returnDate ? text(t.returnDate).slice(0, 10) : undefined,
    returnTime: t.returnTime ? text(t.returnTime) : undefined,
    bookingMode: t.bookingMode === "vehicle" ? "vehicle" : "seat",
    status: text(t.status),
    bookedSeats: Number(t.bookedSeats) || 0,
    totalSeats: Number(t.totalSeats) || 0,
  };
}

/** Saves a spot pinned on the map as one of the driver's pickup points (`POST /pickup-points`). */
export async function createPickupPoint(input: {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}) {
  const row = await customerPost<Row>("/pickup-points", input);
  return {
    id: text(row._id ?? row.id),
    name: text(row.name) || input.name,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
  } satisfies TripStop;
}

/** Publishes a trip (`POST /trips`), exactly like the app. */
export async function createTrip(input: TripInput) {
  return customerPost<Row>("/trips", input);
}

/** Updates a trip; the vehicle can't change after publishing. */
export async function updateTrip(
  id: string,
  input: Omit<TripInput, "vehicleId">,
) {
  return customerPut<Row>(`/trips/${id}`, input);
}

/** Cancels a trip (the backend marks it cancelled; it is not deleted). */
export async function cancelTrip(id: string) {
  return customerDel<Row>(`/trips/${id}`);
}
