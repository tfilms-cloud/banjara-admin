import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuoteBody,
  distanceLabel,
  nearbyMessage,
  shouldSuggestWiden,
  classLabel,
  formatPakistanTime,
  formatRupees,
  fromPakistanInputs,
  isLocationStale,
  lastSeenLabel,
  minDepartAt,
  normalizePhone,
  offerFloor,
  requestStatusLabel,
  toPakistanInputs,
  validateRideForm,
} from "../src/lib/intercity.ts";
import { safeNext } from "../src/lib/auth-redirect.ts";

const config = {
  classes: [
    { key: "car", seats: 4 },
    { key: "coaster", seats: 22 },
  ],
  minLeadMinutes: 60,
  minOfferPercent: 70,
};
const now = new Date("2026-11-07T10:02:00Z");
const pickup = { address: "Karimabad bazaar, Hunza", lat: 36.32, lng: 74.66 };
const dropoff = { address: "Gilgit bus stand", lat: 35.92, lng: 74.31 };
const valid = {
  pickup,
  dropoff,
  bookNow: false,
  departAt: new Date("2026-11-07T12:00:00Z"),
  vehicleClass: "car",
  rideType: "full_car",
  passengers: 3,
  journeyType: "one_way",
  returnAt: null,
  waitMode: "hourly",
  waitHours: 4,
  nights: 1,
  fareMode: "fixed",
  offerAmount: null,
  subtotal: 12000,
  passengerName: "Ayesha Khan",
  passengerPhone: "0300 1234567",
};

test("vehicle classes have rider-friendly labels", () => {
  assert.equal(classLabel("car"), "Car");
  assert.equal(classLabel("suv"), "SUV");
  assert.equal(classLabel("jeep"), "Jeep");
  assert.equal(classLabel("van"), "Van / Hiace");
  assert.equal(classLabel("coaster"), "Coaster");
  assert.equal(classLabel("bus"), "bus");
});

test("rupees are rounded and grouped like the rest of the site", () => {
  assert.equal(formatRupees(13400), "Rs 13,400");
  assert.equal(formatRupees(999.6), "Rs 1,000");
  assert.equal(formatRupees(Number.NaN), "Rs 0");
});

test("the earliest departure respects the lead time and rounds up to 5 minutes", () => {
  assert.equal(minDepartAt(now, 60).toISOString(), "2026-11-07T11:05:00.000Z");
  assert.equal(minDepartAt(new Date("2026-11-07T10:00:00Z"), 30).toISOString(), "2026-11-07T10:30:00.000Z");
  assert.equal(minDepartAt(now, -5).toISOString(), "2026-11-07T10:05:00.000Z");
});

test("date and time inputs are read and written in Pakistan time", () => {
  assert.deepEqual(toPakistanInputs(new Date("2026-11-07T20:30:00Z")), { date: "2026-11-08", time: "01:30" });
  assert.equal(fromPakistanInputs("2026-11-08", "01:30")?.toISOString(), "2026-11-07T20:30:00.000Z");
  assert.equal(fromPakistanInputs("", "01:30"), null);
  assert.equal(fromPakistanInputs("2026-11-08", "1pm"), null);
  assert.match(formatPakistanTime("2026-11-07T20:30:00Z"), /8 Nov/);
  assert.equal(formatPakistanTime("nope"), "");
});

test("the offer floor is a percentage of the fare, rounded up", () => {
  assert.equal(offerFloor(12000, 70), 8400);
  assert.equal(offerFloor(1001, 70), 701);
  assert.equal(offerFloor(0, 70), 0);
});

test("request statuses read naturally", () => {
  assert.equal(requestStatusLabel("open"), "Waiting for drivers");
  assert.equal(requestStatusLabel("matched"), "Booked");
  assert.equal(requestStatusLabel("expired"), "Expired");
  assert.equal(requestStatusLabel("cancelled"), "Cancelled");
});

test("phone numbers are sent as digits", () => {
  assert.equal(normalizePhone(" 0300-123 4567 "), "03001234567");
  assert.equal(normalizePhone("+92 300 1234567"), "+923001234567");
});

test("a complete form has no errors", () => {
  assert.deepEqual(validateRideForm(valid, config, now), {});
  assert.deepEqual(validateRideForm({ ...valid, bookNow: true, departAt: null }, config, now), {});
});

test("both points, a name and a phone are required", () => {
  const errors = validateRideForm(
    { ...valid, pickup: null, dropoff: null, passengerName: " ", passengerPhone: "123" },
    config,
    now,
  );
  assert.ok(errors.pickup && errors.dropoff && errors.passengerName && errors.passengerPhone);
});

test("a scheduled ride must leave after the lead time", () => {
  assert.ok(validateRideForm({ ...valid, departAt: null }, config, now).departAt);
  assert.ok(validateRideForm({ ...valid, departAt: new Date("2026-11-07T10:30:00Z") }, config, now).departAt);
  assert.equal(validateRideForm({ ...valid, departAt: new Date("2026-11-07T11:02:00Z") }, config, now).departAt, undefined);
});

test("passengers must fit the vehicle class", () => {
  assert.match(validateRideForm({ ...valid, passengers: 5 }, config, now).passengers, /up to 4/);
  assert.equal(validateRideForm({ ...valid, vehicleClass: "coaster", passengers: 5 }, config, now).passengers, undefined);
  assert.ok(validateRideForm({ ...valid, passengers: 0 }, config, now).passengers);
});

test("round trips need a later return and a wait; shared seats are one-way", () => {
  const round = { ...valid, journeyType: "round_trip", returnAt: new Date("2026-11-07T18:00:00Z") };
  assert.deepEqual(validateRideForm(round, config, now), {});
  assert.ok(validateRideForm({ ...round, returnAt: null }, config, now).returnAt);
  assert.ok(validateRideForm({ ...round, returnAt: new Date("2026-11-07T11:00:00Z") }, config, now).returnAt);
  assert.ok(validateRideForm({ ...round, bookNow: true, returnAt: new Date("2026-11-07T09:00:00Z") }, config, now).returnAt);
  assert.ok(validateRideForm({ ...round, waitHours: 0 }, config, now).waitHours);
  assert.ok(validateRideForm({ ...round, waitMode: "overnight", nights: 0 }, config, now).nights);
  assert.ok(validateRideForm({ ...round, rideType: "shared_seat" }, config, now).rideType);
});

test("an offer must be a whole number at or above the floor", () => {
  const bid = { ...valid, fareMode: "bid" };
  assert.ok(validateRideForm({ ...bid, offerAmount: null }, config, now).offerAmount);
  assert.match(validateRideForm({ ...bid, offerAmount: 8000 }, config, now).offerAmount, /Rs 8,400/);
  assert.equal(validateRideForm({ ...bid, offerAmount: 8400 }, config, now).offerAmount, undefined);
  assert.ok(validateRideForm({ ...bid, offerAmount: 8400.5 }, config, now).offerAmount);
});

test("a quote is only asked for once the route is complete", () => {
  assert.equal(buildQuoteBody({ ...valid, dropoff: null }), null);
  assert.deepEqual(buildQuoteBody(valid), {
    pickup,
    dropoff,
    vehicleClass: "car",
    rideType: "full_car",
    passengers: 3,
    journeyType: "one_way",
  });
  assert.equal(buildQuoteBody({ ...valid, journeyType: "round_trip" }), null);
  const round = buildQuoteBody({ ...valid, journeyType: "round_trip", returnAt: new Date("2026-11-08T09:00:00Z"), waitMode: "overnight", nights: 2 });
  assert.deepEqual(round.returnTrip, { departAt: "2026-11-08T09:00:00.000Z", waitMode: "overnight", nights: 2 });
  assert.equal(buildQuoteBody({ ...valid, rideType: "shared_seat", journeyType: "round_trip" }).journeyType, "one_way");
});

test("an old driver position is shown as last seen, never as cancelled", () => {
  assert.equal(isLocationStale(null, now), true);
  assert.equal(isLocationStale("2026-11-07T10:01:00Z", now), false);
  assert.equal(isLocationStale("2026-11-07T09:56:00Z", now), true);
  assert.equal(lastSeenLabel("2026-11-07T10:01:40Z", now), "Last seen just now");
  assert.equal(lastSeenLabel("2026-11-07T09:56:00Z", now), "Last seen 6 min ago");
  assert.equal(lastSeenLabel("2026-11-07T07:00:00Z", now), "Last seen 3 h ago");
});

test("the ride pages are a safe place to return to after sign-in", () => {
  assert.equal(safeNext("/intercity"), "/intercity");
  assert.equal(safeNext("/intercity/abc123"), "/intercity/abc123");
  assert.equal(safeNext("/intercityevil"), null);
});

test("the nearby note explains a widened search and an empty widest search", () => {
  const base = { radiusKm: 10, steps: [10, 20, 30, 50], widened: false, nextRadiusKm: 20, found: 3 };
  assert.equal(nearbyMessage(base), null);
  assert.equal(nearbyMessage({ ...base, radiusKm: 30, widened: true, nextRadiusKm: 50 }), "No rides within 10 km — showing 30 km");
  assert.match(nearbyMessage({ ...base, radiusKm: 50, widened: true, nextRadiusKm: null, found: 0 }), /^No drivers or rides within 50 km yet\. You can still send a request/);
  assert.match(nearbyMessage({ ...base, found: 0 }), /within 10 km\. Try a wider search/);
});

test("distances read as approximate", () => {
  assert.equal(distanceLabel(3.4), "~3 km away");
  assert.equal(distanceLabel(0.42), "~0.4 km away");
  assert.equal(distanceLabel(0.01), "~0.1 km away");
});

test("widening is suggested after two quiet minutes, and never at the widest step", () => {
  const request = { status: "open", offers: [], createdAt: "2026-11-07T10:00:00Z", nextRadiusKm: 20 };
  assert.equal(shouldSuggestWiden(request, new Date("2026-11-07T10:01:30Z")), false);
  assert.equal(shouldSuggestWiden(request, new Date("2026-11-07T10:02:00Z")), true);
  assert.equal(shouldSuggestWiden({ ...request, offers: [{}] }, new Date("2026-11-07T10:05:00Z")), false);
  assert.equal(shouldSuggestWiden({ ...request, nextRadiusKm: null }, new Date("2026-11-07T10:05:00Z")), false);
  assert.equal(shouldSuggestWiden({ ...request, status: "matched" }, new Date("2026-11-07T10:05:00Z")), false);
});
