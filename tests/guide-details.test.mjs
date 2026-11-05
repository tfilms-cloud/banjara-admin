import test from "node:test";
import assert from "node:assert/strict";
import { mapGuideProfile, mapGuideAvailability, mapGuideReviews, guideFee, guideEndTime, guidePlanError, guideGuestError, guideBookingPayload, readGuidePlan, suggestGuidePlan, guidePlanQuery } from "../src/lib/guide-details.ts";

const guide = mapGuideProfile({ _id: "guide-1", userId: { _id: "user-2" }, services: ["travelGuide"], verificationStatus: "approved", ownerName: "Guide", logo: "https://example.com/avatar.jpg", galleryImages: ["https://example.com/car.jpg"], guideDetails: { fullName: "Local guide", cnicNumber: "private", documents: [{ fileUrl: "private" }], profilePhoto: "https://example.com/guide photo.jpg", certifications: ["First aid"], languages: [{ language: "Shina", proficiency: "native" }], photos: [{ url: "https://example.com/mountain.jpg", category: "trekking" }], services: [{ id: "walk", name: "Valley walk", active: true, durationHours: 4, durationLabel: "4 hours", price: 4000, pricingType: "per_group", currency: "PKR", minGuests: 1, maxGuests: 6, included: ["Guiding"], excluded: ["Meals"], meetingPoint: "Town centre" }, { id: "old", active: false, price: 100 }] } });
const service = guide.services[0];
const availability = mapGuideAvailability({ weekly: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(day => ({ day, enabled: true, startTime: "08:00", endTime: "18:00" })), blockedDates: ["2026-11-05"], availableFrom: "2026-11-01", availableUntil: "2027-01-20", minBookingHours: 1, maxBookingHours: 10, advanceBookingHours: 2 });
const plan = { service: "walk", date: "2026-11-06", startTime: "09:00", hours: 4, guests: 2, meetingPoint: "Town centre", location: "Hunza" };
const now = Date.parse("2026-11-01T12:00:00+05:00");
const error = (patch = {}, schedule = availability, s = service) => guidePlanError(guide, s, { ...plan, ...patch }, schedule, "2026-11-01", now);

test("guide public mapping keeps service identity and excludes private documents and unrelated gallery content", () => {
  assert.equal(guide.id, "guide-1"); assert.equal(guide.userId, "user-2");
  assert.equal(guide.portrait, "https://example.com/guide%20photo.jpg");
  assert.equal(guide.services.length, 1); assert.equal(guide.services[0].id, "walk");
  assert.deepEqual(guide.certifications, ["First aid"]);
  assert.equal("cnicNumber" in guide, false); assert.equal("documents" in guide, false);
  assert.equal(guide.photos.some(p => p.url.includes("car")), false);
  assert.equal(mapGuideProfile({ services: ["transport"] }), null);
});
test("guide fees follow server billing for each pricing type rather than always multiplying guests and days", () => {
  assert.equal(guideFee(service, plan), 4000);
  assert.equal(guideFee({ ...service, pricingType: "per_person" }, plan), 8000);
  assert.equal(guideFee({ ...service, pricingType: "per_hour", price: 500 }, plan), 2000);
  assert.equal(guideFee({ ...service, pricingType: "per_hour", price: 500 }, { ...plan, hours: .5 }), 500);
  assert.equal(guideFee({ ...service, pricingType: "per_day" }, { ...plan, hours: 9 }), 8000);
  assert.equal(guideFee({ ...service, pricingType: "custom" }, plan), 4000);
  assert.equal(guideFee(service, { ...plan, guests: 7 }), 0);
});
test("working days, blocked dates, availability window, group sizes and fixed duration are enforced", () => {
  assert.equal(error(), "");
  for (const patch of [{ date: "2026-02-30" }, { date: "2026-10-31" }, { date: "2026-11-05" }, { date: "2026-11-08" }, { date: "2027-02-01" }, { guests: 7 }, { guests: 1.5 }, { hours: 1 }, { startTime: "17:00" }, { startTime: "24:00" }, { startTime: "07:59" }]) assert.ok(error(patch));
  assert.ok(guidePlanError(guide, service, plan, undefined, "2026-11-01", now));
  assert.ok(guidePlanError({ ...guide, verified: false }, service, plan, availability, "2026-11-01", now));
  assert.match(error({}, availability, { ...service, currency: "USD" }), /listed currency/);
});
test("lead-time validation uses Pakistan time independent of the execution host timezone", () => {
  const monday = Date.parse("2026-11-02T08:30:00+05:00");
  assert.match(guidePlanError(guide, service, { ...plan, date: "2026-11-02", startTime: "09:00" }, availability, "2026-11-02", monday), /advance notice/);
  assert.match(guidePlanError(guide, service, { ...plan, date: "2026-11-02", startTime: "08:00" }, availability, "2026-11-02", monday), /future start/);
});
test("single-day end time and duration limits cannot silently become a multi-day reservation", () => {
  assert.equal(guideEndTime(plan), "13:00");
  assert.equal(guideEndTime({ ...plan, startTime: "23:00", hours: 2 }), "");
  assert.match(error({ hours: 24 }, availability, { ...service, durationHours: 24 }), /multi-day/);
  assert.match(error({ hours: 4.1 }, availability, { ...service, durationHours: undefined, pricingType: "per_hour" }), /15-minute/);
  assert.match(error({ hours: 11 }, availability, { ...service, durationHours: 11 }), /working|time within|up to/);
});
test("initial plan respects service limits and suggests a future published working day", () => {
  const initial = readGuidePlan(new URLSearchParams("service=unknown&guests=99&hours=1"), guide, "2026-11-01");
  assert.equal(initial.service, "walk"); assert.equal(initial.guests, 2); assert.equal(initial.hours, 4);
  const suggested = suggestGuidePlan(guide, new URLSearchParams(), availability, "2026-11-01", now);
  assert.equal(suggested.date, "2026-11-02"); assert.equal(suggested.startTime, "08:00");
  assert.equal(suggestGuidePlan(guide, new URLSearchParams("date=2026-11-05"), availability, "2026-11-01", now).date, "2026-11-05");
  assert.equal(readGuidePlan(guidePlanQuery(plan), guide, "2026-11-01").date, plan.date);
});
test("booking payload uses provider id, selected service, full duration and guest contacts without client price fields", () => {
  const guest = { name: " Guest ", email: "guest@example.com", phone: "03001234567", specialRequests: " Vegetarians " };
  const payload = guideBookingPayload(guide, plan, guest, "cash");
  assert.equal(payload.bookingType, "guide"); assert.equal(payload.guideBooking.providerId, "guide-1");
  assert.equal(payload.guideBooking.serviceId, "walk"); assert.equal(payload.guideBooking.endTime, "13:00");
  assert.equal(payload.guideBooking.durationHours, 4); assert.equal(payload.guideBooking.guestDetails.name, "Guest");
  assert.equal("unitPrice" in payload.guideBooking, false); assert.equal("totalAmount" in payload, false);
});
test("daily hire fallback matches the existing mobile contract without creating a fictitious service id", () => {
  const fallback = mapGuideProfile({ _id: "daily", services: ["travelGuide"], guideDetails: { dailyHireRate: 8000 } });
  assert.equal(fallback.services[0].fallback, true);
  const payload = guideBookingPayload(fallback, { ...plan, service: "daily-hire", hours: 8 }, { name: "Guest", email: "guest@example.com", phone: "03001234567", specialRequests: "" }, "bankTransfer");
  assert.equal(payload.guideBooking.serviceId, undefined);
});
test("reviews remain specific to guiding and guest details are validated before a request can be created", () => {
  assert.deepEqual(mapGuideReviews([{ id: "hotel", serviceType: "hotel", rating: 5 }, { id: "guide", serviceType: "guide", rating: 4, serviceComment: "Great route" }]).map(r => r.id), ["guide"]);
  const guest = { name: "Guest", email: "guest@example.com", phone: "+923001234567", specialRequests: "" };
  assert.equal(guideGuestError(guest), "");
  for (const patch of [{ name: "A" }, { email: "bad" }, { phone: "123" }, { specialRequests: "x".repeat(1001) }]) assert.ok(guideGuestError({ ...guest, ...patch }));
});
