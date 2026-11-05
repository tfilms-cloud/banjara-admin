import test from "node:test";
import assert from "node:assert/strict";
import {
  tripBookingState,
  tripQuantity,
  tripBaseFare,
  tripBookingHref,
  availableTripSeats,
  tripPickup,
  tripPickupMap,
  tripPhotos,
  tripTimeline,
} from "../src/lib/trip-details.ts";
const trip = (patch = {}) => ({
  id: "t1",
  price: 5000,
  currency: "PKR",
  availableSeats: 4,
  totalSeats: 6,
  date: "2099-10-31",
  departureTime: "08:00",
  arrivalTime: "00:00",
  status: "scheduled",
  from: "Islamabad",
  to: "Hunza",
  bookingMode: "seat",
  pickupLocations: [
    { id: "p1", name: "Terminal", address: "Islamabad" },
    { id: "p2", name: "Interchange" },
  ],
  dropoffLocations: [{ id: "d1", name: "Aliabad" }],
  seatLayout: [
    { seatNumber: "A1", status: "booked" },
    { seatNumber: "A2", status: "available" },
    { seatNumber: "B1", status: "available" },
  ],
  ...patch,
});
test("booking availability excludes past, in-transit, sold-out and unpriced inventory", () => {
  const now = Date.parse("2099-10-31T02:00:00Z");
  assert.equal(tripBookingState(trip(), now).canBook, true);
  assert.equal(
    tripBookingState(trip(), Date.parse("2099-10-31T03:01:00Z")).canBook,
    false,
  );
  for (const t of [
    trip({ status: "inTransit" }),
    trip({ status: "cancelled" }),
    trip({ availableSeats: 0 }),
    trip({ price: NaN }),
    trip({ date: "invalid" }),
  ])
    assert.equal(tripBookingState(t, now).canBook, false);
  assert.equal(tripBookingState(trip(), now).maxPassengers, 2);
});
test("passenger count respects real seat availability and the API's ten-person limit", () => {
  assert.equal(tripQuantity(trip(), 99), 2);
  assert.equal(tripQuantity(trip(), -5), 1);
  assert.equal(tripQuantity(trip(), "invalid"), 1);
  assert.equal(
    tripBookingState(trip({ availableSeats: NaN })).maxPassengers,
    0,
  );
  assert.equal(
    tripBookingState(trip({ seatLayout: [], availableSeats: 22 }))
      .maxPassengers,
    10,
  );
  assert.deepEqual(availableTripSeats(trip()), ["A2", "B1"]);
});
test("fare subtotal uses passenger count for seats and one unit for a vehicle", () => {
  assert.equal(tripBaseFare(trip(), 2), 10000);
  const vehicle = trip({ bookingMode: "vehicle", price: 24000 });
  assert.equal(tripBaseFare(vehicle, 4), 24000);
  assert.equal(tripQuantity(vehicle, 4), 1);
});
test("booking links retain only valid pickup IDs and bounded passenger quantity", () => {
  assert.equal(
    tripBookingHref(trip(), 2, "p2"),
    "/trips/t1/book?passengers=2&pickupPoint=p2",
  );
  assert.equal(
    tripBookingHref(trip(), 55, "other"),
    "/trips/t1/book?passengers=2",
  );
  assert.equal(tripPickup(trip(), "missing").id, "p1");
});
test("pickup maps use published coordinates and fall back to the named address", () => {
  assert.match(
    tripPickupMap({ name: "Terminal", latitude: 33.6, longitude: 73.1 })
      .external,
    /33.6%2C73.1/,
  );
  assert.match(
    tripPickupMap({
      name: "Terminal",
      address: "Islamabad",
      latitude: 0,
      longitude: 0,
    }).external,
    /Islamabad/,
  );
  assert.match(
    tripPickupMap({ name: "<test>", latitude: 100, longitude: 100 }).external,
    /%3Ctest%3E/,
  );
});
test("gallery deduplicates actual images and itinerary retains only published stops and times", () => {
  assert.deepEqual(
    tripPhotos(
      trip({ image: "van.jpg", vehicleImages: ["van.jpg", "inside.jpg"] }),
    ),
    ["van.jpg", "inside.jpg"],
  );
  const timeline = tripTimeline(
    trip({ stops: [{ name: "Chilas", description: "Provider stop" }] }),
  );
  assert.deepEqual(
    timeline.map((s) => s.name),
    ["Terminal", "Chilas", "Aliabad"],
  );
  assert.equal(timeline[1].time, undefined);
  assert.equal(timeline[2].time, "00:00");
});
