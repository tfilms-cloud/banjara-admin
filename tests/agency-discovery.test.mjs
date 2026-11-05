import test from "node:test";
import assert from "node:assert/strict";
import {
  groupTransportAgencies,
  transportAgencyHref,
} from "../src/lib/agency-discovery.ts";
const trip = (patch = {}) => ({
  id: "t1",
  agencyId: "p1",
  agency: { id: "p1", name: "Agency One", rating: 4.5 },
  vehicleName: "Hiace",
  from: "Islamabad",
  to: "Hunza",
  availableSeats: 5,
  price: 6500,
  currency: "PKR",
  bookingMode: "seat",
  journeyType: "one_way",
  status: "scheduled",
  ...patch,
});
test("mobile-style cards collapse duplicate trips by business and retain distinct routes and journey types", () => {
  const rows = [
    trip(),
    trip(),
    trip({ id: "t2", price: 5500 }),
    trip({
      id: "t3",
      from: "Hunza",
      to: "Islamabad",
      journeyType: "round_trip",
      vehicleName: "Coaster",
    }),
  ];
  const [group] = groupTransportAgencies(rows);
  assert.equal(group.tripCount, 3);
  assert.equal(group.oneWayCount, 2);
  assert.equal(group.roundTripCount, 1);
  assert.deepEqual(group.routes, ["Islamabad → Hunza", "Hunza → Islamabad"]);
  assert.deepEqual(group.vehicleNames, ["Hiace", "Coaster"]);
  assert.deepEqual(group.fares, [
    { amount: 5500, currency: "PKR", unit: "seat" },
  ]);
});
test("agency cards never combine a vehicle fare with a seat fare or another currency", () => {
  const [group] = groupTransportAgencies([
    trip(),
    trip({ id: "private", bookingMode: "vehicle", price: 24000 }),
    trip({ id: "usd", currency: "USD", price: 30 }),
    trip({ id: "cheaper", price: 6000 }),
  ]);
  assert.deepEqual(group.fares, [
    { amount: 6000, currency: "PKR", unit: "seat" },
    { amount: 24000, currency: "PKR", unit: "vehicle" },
    { amount: 30, currency: "USD", unit: "seat" },
  ]);
});
test("unavailable trips and missing providers do not create discovery cards", () => {
  assert.deepEqual(
    groupTransportAgencies([
      trip({ availableSeats: 0 }),
      trip({ status: "departed" }),
      trip({ status: "completed" }),
      trip({ status: "cancelled" }),
      trip({ price: NaN }),
      trip({ agencyId: "", agency: { id: "" } }),
    ]),
    [],
  );
});
test("provider identity survives legacy agency IDs and ranks businesses by rating then departure count", () => {
  const legacy = trip({
    agencyId: "",
    agency: { id: "legacy", name: "Legacy", rating: 4.9 },
  });
  const groups = groupTransportAgencies([
    trip(),
    legacy,
    trip({
      id: "other",
      agencyId: "other",
      agency: { id: "other", name: "Other", rating: 4.5 },
    }),
    trip({
      id: "other2",
      agencyId: "other",
      agency: { id: "other", name: "Other", rating: 4.5 },
    }),
  ]);
  assert.deepEqual(
    groups.map((g) => g.agencyId),
    ["legacy", "other", "p1"],
  );
  assert.equal(transportAgencyHref(legacy), "/agencies/legacy");
  assert.equal(transportAgencyHref(trip()), "/agencies/p1");
});
