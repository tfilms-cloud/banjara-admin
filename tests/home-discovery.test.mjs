import test from "node:test";
import assert from "node:assert/strict";
import {
  bookableTrips,
  pakistanDate,
  rideSearchHref,
  vehicleCategory,
  timeLabel,
} from "../src/lib/home-discovery.ts";

test("Pakistan departure dates cross midnight before UTC", () => {
  assert.equal(pakistanDate(new Date("2026-10-31T20:30:00Z")), "2026-11-01");
});

test("only future, bookable inventory survives; departures sort chronologically", () => {
  const base = {
    date: "2026-11-04",
    departureTime: "08:00",
    status: "scheduled",
    availableSeats: 2,
    price: 5000,
  };
  const trips = [
    { ...base, id: "later", departureTime: "10:00" },
    { ...base, id: "sold-out", availableSeats: 0 },
    { ...base, id: "cancelled", status: "cancelled" },
    { ...base, id: "departed", date: "2026-11-03" },
    { ...base, id: "invalid-price", price: NaN },
    { ...base, id: "invalid-date", date: "bad-date" },
    { ...base, id: "first" },
  ];
  assert.deepEqual(
    bookableTrips(trips, new Date("2026-11-04T02:00:00Z")).map(
      (trip) => trip.id,
    ),
    ["first", "later"],
  );
  assert.equal(
    bookableTrips([{ ...base }], new Date("2026-11-04T03:00:00Z")).length,
    0,
  );
});

test("provider vehicle classes take precedence over legacy model inference", () => {
  assert.equal(
    vehicleCategory({
      vehicleClass: "executive_coaster",
      vehicleName: "Prado",
      vehicleType: "van",
    }),
    "executive coaster",
  );
  assert.equal(
    vehicleCategory({ vehicleName: "Toyota Hiace", vehicleType: "van" }),
    "Hiace",
  );
  assert.equal(
    vehicleCategory({ vehicleName: "Prado TX", vehicleType: "car" }),
    "4×4 Jeep",
  );
});

test("search URLs retain return dates, vehicle and booking mode and escape destinations", () => {
  const url = new URL(
    rideSearchHref({
      from: " Islamabad ",
      to: "Swat & Kalam",
      date: "2026-11-04",
      passengers: 3,
      roundTrip: true,
      returnDate: "2026-11-08",
      vehicle: "4×4 Jeep",
      bookingMode: "vehicle",
    }),
    "https://banjara.test",
  );
  assert.equal(url.pathname, "/explore");
  assert.equal(url.searchParams.get("service"), "transport");
  for (const [key, value] of Object.entries({
    from: "Islamabad",
    to: "Swat & Kalam",
    passengers: "3",
    journeyType: "round_trip",
    returnDate: "2026-11-08",
    vehicle: "4×4 Jeep",
    bookingMode: "vehicle",
  }))
    assert.equal(url.searchParams.get(key), value);
  assert.equal(
    new URL(
      rideSearchHref({
        from: "A",
        to: "B",
        date: "2026-11-04",
        passengers: 1,
        returnDate: "2026-11-08",
      }),
      "https://banjara.test",
    ).searchParams.has("returnDate"),
    false,
  );
});

test("departure labels handle midnight, noon and missing times", () => {
  assert.equal(timeLabel("00:00"), "12:00 AM");
  assert.equal(timeLabel("12:30"), "12:30 PM");
  assert.equal(timeLabel(""), "Time pending");
});
