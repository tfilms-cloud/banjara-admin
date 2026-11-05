import test from "node:test";
import assert from "node:assert/strict";
import {
  mapRestaurantDetails,
  diningCategory,
  diningPlanError,
  diningEnquiry,
  restaurantMapLinks,
  restaurantPhone,
} from "../src/lib/restaurant-details.ts";

const restaurant = mapRestaurantDetails({
  _id: "provider-1",
  userId: { _id: "owner-2" },
  services: ["restaurant", "transport"],
  businessName: "Cafe",
  galleryImages: ["https://example.com/vehicle.jpg"],
  restaurantDetails: {
    restaurantName: "Mountain Kitchen",
    menuVariety: ["Chapshuro", "Walnut cake", "Herbal tea", "Chapshuro"],
    images: ["https://example.com/cafe photo.jpg", "javascript:alert(1)"],
    latitude: 36.3,
    longitude: 74.6,
    offers: [
      { id: "old", title: "Expired", active: false },
      { id: "live", title: "Lunch", active: true, discountPercent: 15 },
      { title: "Invalid discount", discountPercent: 200 },
    ],
  },
  bankDetails: { secret: "omit" },
});
const plan = {
  date: "2026-11-06",
  time: "13:00",
  guests: 2,
  seating: "outdoor",
  interests: ["Walnut cake"],
  notes: "Vegetarian option, please.",
};

test("public restaurant mapping isolates dining photos and retains correct messaging identity", () => {
  assert.equal(restaurant.id, "provider-1");
  assert.equal(restaurant.userId, "owner-2");
  assert.equal(restaurant.name, "Mountain Kitchen");
  assert.deepEqual(restaurant.images, ["https://example.com/cafe%20photo.jpg"]);
  assert.deepEqual(restaurant.menu, ["Chapshuro", "Walnut cake", "Herbal tea"]);
  assert.equal("bankDetails" in restaurant, false);
  assert.equal(mapRestaurantDetails({ services: ["transport"] }), null);
  assert.deepEqual(
    restaurant.offers.map((o) => o.title),
    ["Lunch", "Invalid discount"],
  );
  assert.equal(restaurant.offers[1].discountPercent, undefined);
});
test("enquiry date, time, party size and notes are validated without treating party size as inventory", () => {
  assert.equal(diningPlanError(plan, "2026-11-01"), "");
  for (const patch of [
    { date: "2026-02-30" },
    { date: "2026-10-31" },
    { time: "24:01" },
    { guests: 0 },
    { guests: 21 },
    { guests: 1.5 },
    { seating: "invalid" },
    { notes: "x".repeat(501) },
  ])
    assert.ok(diningPlanError({ ...plan, ...patch }, "2026-11-01"));
});
test("enquiry includes only published menu interests and asks for confirmation instead of claiming a reservation", () => {
  const enquiry = diningEnquiry(restaurant, {
    ...plan,
    interests: ["Walnut cake", "Invented dish"],
  });
  assert.match(enquiry, /Mountain Kitchen/);
  assert.match(enquiry, /2026-11-06/);
  assert.match(enquiry, /13:00 \(Pakistan time\)/);
  assert.match(enquiry, /Outdoor, if available/);
  assert.match(enquiry, /Menu interests: Walnut cake/);
  assert.doesNotMatch(enquiry, /Invented dish|Rs|deposit|confirmed booking/);
  assert.match(enquiry, /Please confirm availability/);
});
test("directions use validated coordinates and never coerce missing coordinates to zero", () => {
  assert.match(restaurantMapLinks(restaurant).external, /36.3%2C74.6/);
  const missing = mapRestaurantDetails({
    services: ["restaurant"],
    businessName: "Cafe",
    city: "Hunza",
    restaurantDetails: {},
  });
  assert.equal(missing.latitude, undefined);
  assert.equal(restaurantMapLinks(missing).embed, undefined);
  assert.match(restaurantMapLinks(missing).external, /Cafe%2C%20Hunza/);
  assert.equal(
    restaurantMapLinks({ ...restaurant, latitude: 95 }).embed,
    undefined,
  );
});
test("menu filters classify published highlights and phone links reject malformed values", () => {
  assert.equal(diningCategory("Chapshuro"), "Dishes");
  assert.equal(diningCategory("Apricot dessert"), "Bakery & sweets");
  assert.equal(diningCategory("Herbal tea"), "Drinks");
  assert.equal(restaurantPhone("+92 (300) 123-4567"), "+923001234567");
  assert.equal(restaurantPhone("tel:javascript:test"), "");
});
