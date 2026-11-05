import test from "node:test";
import assert from "node:assert/strict";
import {
  profileFields,
  profilePatch,
  validateProfile,
  profileBookingSummary,
  uniqueSavedItems,
  validateNewPassword,
} from "../src/lib/customer-profile.ts";
const profile = {
  id: "customer",
  name: "Example Traveler",
  email: "traveler@example.com",
  phone: "03001234567",
  role: "customer",
  preferences: {
    notifications: { offers: false },
    websiteProfile: { baseCity: "Hunza", language: "en" },
    other: { retain: true },
  },
};
test("profile saves normalize contact fields and preserve unrelated latest preferences", () => {
  const patch = profilePatch(profile, {
    name: " Traveler Name ",
    email: " TRAVELER@EXAMPLE.COM ",
    phone: " 03001234567 ",
    baseCity: " Islamabad ",
  });
  assert.equal(patch.name, "Traveler Name");
  assert.equal(patch.email, "traveler@example.com");
  assert.equal(patch.preferences.websiteProfile.baseCity, "Islamabad");
  assert.equal(patch.preferences.websiteProfile.language, "en");
  assert.deepEqual(patch.preferences.notifications, { offers: false });
  assert.deepEqual(patch.preferences.other, { retain: true });
  assert.equal("role" in patch, false);
  assert.equal("id" in patch, false);
  assert.equal(profile.preferences.websiteProfile.baseCity, "Hunza");
});
test("unchanged city does not replace preferences and missing settings remain optional", () => {
  assert.equal(
    profilePatch(profile, profileFields(profile)).preferences,
    undefined,
  );
  assert.equal(profileFields({ ...profile, preferences: {} }).baseCity, "");
  assert.equal(
    profileFields({
      ...profile,
      preferences: { websiteProfile: { baseCity: { invalid: true } } },
    }).baseCity,
    "",
  );
});
test("profile validation catches malformed contact data and accepts international phone formatting", () => {
  assert.deepEqual(
    validateProfile({ ...profileFields(profile), phone: "+92 (300) 123-4567" }),
    {},
  );
  const invalid = validateProfile({
    name: "A",
    email: "invalid",
    phone: "letters",
    baseCity: "x".repeat(121),
  });
  assert.deepEqual(Object.keys(invalid), [
    "name",
    "email",
    "phone",
    "baseCity",
  ]);
});
test("journey summary separates completed and active states and never adds currencies together", () => {
  const booking = (
    id,
    status,
    paymentStatus = "paid",
    currency = "PKR",
    total = 100,
  ) => ({
    id,
    status,
    paymentStatus,
    currency,
    total,
    date: "2026-11-05",
    to: "Hunza",
  });
  const summary = profileBookingSummary([
    booking("finished", "completed"),
    booking("next", "confirmed"),
    booking("refund", "refunded"),
    booking("expired", "expired", "expired"),
    booking("euro", "completed", "paid", "EUR", 10),
    booking("unknown", "unknown", "unpaid"),
    { ...booking("earlier", "pending", "unpaid"), date: "2026-11-02" },
  ]);
  assert.equal(summary.completed.length, 2);
  assert.equal(summary.active.length, 2);
  assert.equal(summary.next.id, "earlier");
  assert.deepEqual(summary.destinations, ["Hunza"]);
  assert.deepEqual(summary.paid, [
    { currency: "PKR", total: 200 },
    { currency: "EUR", total: 10 },
  ]);
  assert.equal(
    profileBookingSummary([
      booking("pending-refund", "cancelled", "refund_pending"),
    ]).refundPending,
    1,
  );
});
test("saved count deduplicates each service target and excludes empty or unsupported records", () => {
  const rows = uniqueSavedItems([
    { id: "1", kind: "trip", targetId: "same" },
    { id: "2", kind: "trip", targetId: "same" },
    { id: "3", kind: "hotel", targetId: "same" },
    { id: "4", kind: "other", targetId: "x" },
    { id: "5", kind: "provider", targetId: "" },
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.kind),
    ["trip", "hotel"],
  );
});
test("password validation requires current password, length, confirmation and a different new value", () => {
  assert.ok(validateNewPassword("", "new-value", "new-value"));
  assert.ok(validateNewPassword("old-value", "short", "short"));
  assert.ok(validateNewPassword("old-value", "new-value", "mismatch"));
  assert.ok(validateNewPassword("same-value1", "same-value1", "same-value1"));
  assert.ok(validateNewPassword("old-value", "lettersonly", "lettersonly"));
  assert.ok(validateNewPassword("old-value", "12345678", "12345678"));
  assert.equal(validateNewPassword("old-value", "new-value1", "new-value1"), "");
});
