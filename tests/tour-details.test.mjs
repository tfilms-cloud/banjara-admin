import test from "node:test";
import assert from "node:assert/strict";
import {
  mapTourItinerary,
  mapTourOperator,
  tourPhotos,
  tourCanReserve,
  tourTravelerLimit,
  validTourDate,
  readTourPlan,
  validateTourPlan,
  tourEndDate,
  tourBookingHref,
  tourBaseFare,
  tourGuestError,
  packageBookingPayload,
} from "../src/lib/tour-details.ts";

const tour = mapTourItinerary({
  _id: "tour-1",
  providerId: "operator-1",
  title: "Mountain trek",
  tourType: "trek",
  durationDays: 14,
  durationNights: 13,
  maxParticipants: 12,
  pricePerPerson: 185000,
  currency: "PKR",
  status: "published",
  coverImage: "https://example.com/cover.jpg",
  images: [
    "https://example.com/cover.jpg",
    "https://example.com/second image.jpg",
  ],
  days: [
    { dayNumber: 2, title: "Camp", description: "A published day" },
    { dayNumber: 1, title: "Arrival" },
    { dayNumber: -1, title: "Invalid" },
  ],
  included: ["Meals", "Meals"],
  excluded: ["Flights"],
});

test("tour mapping preserves provider identity, published itinerary and real inclusions", () => {
  assert.equal(tour.providerId, "operator-1");
  assert.deepEqual(
    tour.days.map((day) => day.dayNumber),
    [1, 2],
  );
  assert.deepEqual(tour.included, ["Meals"]);
  assert.deepEqual(tourPhotos(tour), [
    "https://example.com/cover.jpg",
    "https://example.com/second%20image.jpg",
  ]);
  assert.equal(
    mapTourItinerary({ ...tour, providerId: { _id: "nested-provider" } })
      .providerId,
    "nested-provider",
  );
});
test("public operator mapping resolves messaging to the user identity", () => {
  const operator = mapTourOperator({
    _id: "operator-1",
    userId: { _id: "user-1" },
    businessName: "Operator",
    verificationStatus: "approved",
    rating: 4.8,
    totalReviews: 12,
  });
  assert.equal(operator.userId, "user-1");
  assert.equal(operator.verified, true);
  assert.equal(operator.reviewCount, 12);
  assert.equal(mapTourOperator({ _id: "operator-2" }).userId, "");
});
test("invalid dates, unpublished tours and participant limits block reservation", () => {
  assert.equal(validTourDate("2026-02-30"), false);
  assert.equal(tourCanReserve(tour), true);
  assert.equal(tourCanReserve({ ...tour, status: "draft" }), false);
  assert.equal(tourCanReserve({ ...tour, pricePerPerson: NaN }), false);
  assert.equal(tourCanReserve({ ...tour, currency: "USD" }), false);
  assert.equal(tourTravelerLimit({ ...tour, maxParticipants: 300 }), 200);
  assert.match(
    validateTourPlan(
      tour,
      { startDate: "2026-10-31", travelers: 1 },
      "2026-11-01",
    ),
    /today or later/,
  );
  assert.match(
    validateTourPlan(
      tour,
      { startDate: "2026-11-04", travelers: 13 },
      "2026-11-01",
    ),
    /1 and 12/,
  );
  assert.match(
    validateTourPlan(
      tour,
      { startDate: "2026-11-04", travelers: 1.5 },
      "2026-11-01",
    ),
    /travelers/,
  );
});
test("booking handoff preserves dates and quantity, with an inclusive end date", () => {
  const plan = readTourPlan(
    new URLSearchParams("startDate=2026-11-04&travelers=2"),
    tour,
    "2026-11-01",
  );
  assert.deepEqual(plan, { startDate: "2026-11-04", travelers: 2 });
  assert.equal(tourEndDate(tour, plan.startDate), "2026-11-17");
  assert.equal(
    tourEndDate({ ...tour, durationDays: 1 }, "2026-12-31"),
    "2026-12-31",
  );
  assert.equal(
    tourEndDate({ ...tour, durationDays: 3 }, "2026-12-31"),
    "2027-01-02",
  );
  assert.equal(
    tourBookingHref(tour, plan),
    "/tours/tour-1/book?startDate=2026-11-04&travelers=2",
  );
  assert.equal(tourBaseFare(tour, 2), 370000);
  assert.equal(
    readTourPlan(
      new URLSearchParams("startDate=bad&travelers=999"),
      tour,
      "2026-11-01",
    ).travelers,
    12,
  );
});
test("guest validation and booking payload match the mobile package API without client totals", () => {
  const guest = {
    name: " Traveler ",
    email: "traveler@example.com",
    phone: "03000000000",
    specialRequests: " Window pickup ",
  };
  assert.equal(tourGuestError(guest), "");
  assert.match(tourGuestError({ ...guest, phone: "abcdefghijk" }), /phone/);
  assert.match(tourGuestError({ ...guest, email: "invalid" }), /email/);
  const payload = packageBookingPayload(
    tour.id,
    { startDate: "2026-11-04", travelers: 2 },
    guest,
    "easypaisa",
  );
  assert.equal(payload.bookingType, "package");
  assert.equal(payload.packageBooking.itineraryId, tour.id);
  assert.equal(payload.packageBooking.guestDetails.name, "Traveler");
  assert.equal(
    payload.packageBooking.guestDetails.specialRequests,
    "Window pickup",
  );
  assert.equal(payload.paymentMethod, "easypaisa");
  assert.equal("totalAmount" in payload, false);
});
