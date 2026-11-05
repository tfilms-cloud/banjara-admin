import type { TripWithDetails } from "@/types/customer/trip";

/** Departure dates in the marketplace are Pakistan dates, not browser/UTC dates. */
export function pakistanDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function bookableTrips(trips: TripWithDetails[], now = new Date()) {
  return trips
    .filter((trip) => {
      const departure = Date.parse(
        `${trip.date.slice(0, 10)}T${trip.departureTime}:00+05:00`,
      );
      return (
        ["scheduled", "active"].includes(trip.status ?? "") &&
        trip.availableSeats > 0 &&
        Number.isFinite(trip.price) &&
        trip.price > 0 &&
        Number.isFinite(departure) &&
        departure > now.getTime()
      );
    })
    .sort((a, b) =>
      `${a.date}${a.departureTime}`.localeCompare(
        `${b.date}${b.departureTime}`,
      ),
    );
}

/** Prefer the registered class; older provider records only have a name/model. */
export function vehicleCategory(trip: TripWithDetails) {
  if (trip.vehicleClass) {
    const known: Record<string, string> = {
      coaster: "Coaster",
      suv: "SUV",
      minibus: "Minibus",
      tourVehicle: "Tour vehicle",
      other: "Other vehicles",
    };
    return known[trip.vehicleClass] ?? trip.vehicleClass.replace(/[_-]/g, " ");
  }
  const registered = `${trip.vehicleName} ${trip.vehicleModel ?? ""}`;
  if (/coaster/i.test(registered)) return "Coaster";
  if (/prado|jeep|4\s*x\s*4/i.test(registered)) return "4×4 Jeep";
  if (/hiace|grand cabin/i.test(registered)) return "Hiace";
  return {
    bus: "Bus",
    car: "Sedan",
    van: "Van",
    private: "Private vehicle",
    tour: "Tour vehicle",
  }[trip.vehicleType];
}

export function rideSearchHref(values: {
  from: string;
  to: string;
  date: string;
  passengers: number;
  roundTrip?: boolean;
  returnDate?: string;
  vehicle?: string;
  bookingMode?: string;
}) {
  const query = new URLSearchParams({
    from: values.from.trim(),
    to: values.to.trim(),
    date: values.date,
    passengers: String(values.passengers),
    journeyType: values.roundTrip ? "round_trip" : "one_way",
  });
  if (values.roundTrip && values.returnDate)
    query.set("returnDate", values.returnDate);
  if (values.vehicle) query.set("vehicle", values.vehicle);
  if (values.bookingMode) query.set("bookingMode", values.bookingMode);
  return `/explore?service=transport&${query}`;
}

export function timeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute))
    return "Time pending";
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export const HOME_DESTINATIONS = [
  {
    name: "Hunza Valley",
    destination: "Hunza",
    image: "/home/hunza.jpg",
    caption: "Rakaposhi views & Baltit Fort heritage",
  },
  {
    name: "Skardu & Deosai",
    destination: "Skardu",
    image: "/home/skardu.jpg",
    caption: "Shangrila & the Deosai high plateau",
  },
  {
    name: "Fairy Meadows",
    destination: "Fairy Meadows",
    image: "/home/fairy-meadows.jpg",
    caption: "Mountain trails beneath Nanga Parbat",
  },
  {
    name: "Swat & Kalam",
    destination: "Swat",
    image: "/home/swat.jpg",
    caption: "Alpine lakes & pine-covered valleys",
  },
] as const;
