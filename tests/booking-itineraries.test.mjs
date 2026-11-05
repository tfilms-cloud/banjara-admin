import test from "node:test";
import assert from "node:assert/strict";
import {
  mapItineraryBooking,
  readBookingFilters,
  filterBookingItineraries,
  bookingTab,
  bookingTimestamp,
  hasPaymentDue,
  canDownloadPass,
  canCancelItinerary,
  offlineItineraryHtml,
} from "../src/lib/booking-itineraries.ts";

const raw = (type, id, status = "confirmed") => ({
  _id: id,
  bookingType: type,
  bookingNumber: `BJ-${id}`,
  providerId: "provider",
  bookingStatus: status,
  paymentStatus: "paid",
  totalAmount: 12000,
  subtotal: 11000,
  tax: 800,
  serviceFee: 200,
  currency: "PKR",
});
const transport = mapItineraryBooking(
  {
    ...raw("transport", "transport"),
    transportBooking: { tripId: "trip", seats: ["A1", "A2"] },
  },
  {
    trip: {
      date: "2026-11-04",
      departureTime: "05:00",
      arrivalTime: "19:00",
      from: "Islamabad",
      to: "Hunza",
      agency: { name: "Mountain carrier", phone: "", email: "" },
      vehicleName: "Hiace",
      vehicleImages: [],
      pickupLocations: [],
      amenities: ["AC"],
      durationMinutes: 840,
    },
  },
);
const hotel = mapItineraryBooking(
  {
    ...raw("hotel", "hotel"),
    hotelBooking: {
      checkIn: "2026-11-06",
      checkOut: "2026-11-09",
      guests: 2,
      rooms: 1,
      nights: 3,
    },
  },
  {
    hotel: {
      name: "Mountain Lodge",
      images: ["hotel.jpg"],
      location: { address: "Karimabad" },
    },
    room: {
      name: "Deluxe Suite",
      images: ["room.jpg"],
      amenities: ["Heating"],
      breakfastIncluded: true,
    },
    provider: { businessName: "Lodge provider" },
  },
);
const tour = mapItineraryBooking(
  {
    ...raw("package", "tour"),
    packageBooking: {
      title: "Glacier expedition",
      destination: "Skardu",
      startDate: "2026-11-10",
      durationDays: 5,
      travelers: 4,
    },
  },
  { provider: { businessName: "Trek operator" } },
);
const guide = mapItineraryBooking(
  {
    ...raw("guide", "guide", "pending"),
    paymentStatus: "unpaid",
    guideBooking: {
      serviceName: "Heritage walk",
      date: "2026-11-15",
      startTime: "09:00",
      guests: 2,
      meetingPoint: "Altit Fort",
    },
  },
  { provider: { businessName: "Local guide" } },
);
const bookings = [transport, hotel, tour, guide];

test("all four booking types retain their service identity and published details", () => {
  assert.deepEqual(
    bookings.map((b) => b.kind),
    ["transport", "hotel", "tour", "guide"],
  );
  assert.equal(hotel.title, "Mountain Lodge");
  assert.equal(hotel.image, "room.jpg");
  assert.equal(tour.endDate, "2026-11-14");
  assert.equal(guide.serviceName, "Heritage walk");
  assert.equal(transport.guests, 2);
  assert.equal(transport.from, "Islamabad");
  assert.equal(
    mapItineraryBooking({
      ...raw("hotel", "dates"),
      hotelBooking: { checkIn: "2026-11-06", checkOut: "2026-11-09" },
    }).nights,
    3,
  );
  assert.equal(
    mapItineraryBooking({
      ...raw("transport", "private"),
      tripBookingMode: "vehicle",
    }).bookingMode,
    "vehicle",
  );
  assert.equal(mapItineraryBooking(raw("unknown", "invalid")), null);
});
test("status groups include approval, payment verification and terminal booking states", () => {
  assert.equal(bookingTab("pending"), "upcoming");
  assert.equal(bookingTab("payment_verification"), "upcoming");
  assert.equal(bookingTab("completed"), "completed");
  assert.equal(bookingTab("refunded"), "cancelled");
  assert.equal(bookingTab("expired"), "cancelled");
  assert.equal(canDownloadPass(guide), false);
  assert.equal(canDownloadPass(transport), true);
  assert.equal(canCancelItinerary({ ...hotel, status: "completed" }), false);
});
test("category, status, travel month and provider/route searches combine", () => {
  const filters = readBookingFilters(
    new URLSearchParams("category=transport&q=hunza&month=2026-11"),
  );
  assert.deepEqual(
    filterBookingItineraries(bookings, filters).map((b) => b.id),
    ["transport"],
  );
  assert.deepEqual(
    filterBookingItineraries(bookings, { ...filters, query: "not-found" }),
    [],
  );
  assert.deepEqual(
    filterBookingItineraries(bookings, {
      ...readBookingFilters(new URLSearchParams()),
      category: "guide",
    }).map((b) => b.id),
    ["guide"],
  );
  assert.deepEqual(
    filterBookingItineraries(bookings, { ...filters, month: "2027-01" }),
    [],
  );
});
test("invalid URL choices fall back and unknown dates do not become invented departures", () => {
  assert.deepEqual(
    readBookingFilters(
      new URLSearchParams("status=bad&category=bad&month=2026-99"),
    ),
    { status: "upcoming", category: "all", query: "", month: "all" },
  );
  const empty = mapItineraryBooking(raw("transport", "empty"));
  assert.equal(empty.date, "");
  assert.equal(empty.detailsUnavailable, true);
  assert.equal(bookingTimestamp(empty), Infinity);
  const known = { ...transport, status: "expired" },
    unknown = { ...empty, status: "expired" };
  assert.deepEqual(
    filterBookingItineraries(
      [unknown, known],
      readBookingFilters(new URLSearchParams("status=cancelled")),
    ).map((b) => b.id),
    ["transport", "empty"],
  );
});
test("journeys sort by Pakistan departure time and unpaid indicators exclude completed bookings", () => {
  const early = { ...transport, id: "early", time: "01:00" },
    later = { ...transport, id: "later", time: "05:00" };
  assert.deepEqual(
    filterBookingItineraries(
      [later, early],
      readBookingFilters(new URLSearchParams()),
    ).map((b) => b.id),
    ["early", "later"],
  );
  assert.equal(hasPaymentDue(guide), true);
  assert.equal(hasPaymentDue({ ...guide, status: "completed" }), false);
  assert.equal(
    hasPaymentDue({ ...guide, paymentStatus: "under_review" }),
    false,
  );
  assert.equal(hasPaymentDue({ ...guide, total: 0 }), false);
});
test("offline exports escape provider text and only embed server-issued PNG QR data", () => {
  const unsafe = {
    ...hotel,
    title: '<script>alert("bad")</script>',
    code: "BJ-<unsafe>",
  };
  const html = offlineItineraryHtml(
    [unsafe],
    { [unsafe.id]: { qrCode: "javascript:alert(1)" } },
    "2026-10-31T12:00:00Z",
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('src="javascript:'));
  assert.ok(html.includes("17:00:00 PKT"));
  const pass = offlineItineraryHtml([transport], {
    [transport.id]: { qrCode: "data:image/png;base64,aGVsbG8=" },
  });
  assert.ok(pass.includes('src="data:image/png;base64,aGVsbG8="'));
  assert.ok(pass.includes("snapshot"));
  assert.ok(!pass.includes("<script"));
});
