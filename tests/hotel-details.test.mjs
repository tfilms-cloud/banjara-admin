import test from "node:test";
import assert from "node:assert/strict";
import {
  validStayDate,
  stayNights,
  nextStayDate,
  readHotelStay,
  validateHotelStay,
  hotelPhotos,
  hotelMapLinks,
  publicWebsite,
} from "../src/lib/hotel-details.ts";

test("stay dates reject impossible days and calculate nights across leap/month boundaries", () => {
  assert.equal(validStayDate("2026-02-30"), false);
  assert.equal(validStayDate("not-a-date"), false);
  assert.equal(stayNights("2028-02-28", "2028-03-01"), 2);
  assert.equal(nextStayDate("2026-12-31"), "2027-01-01");
});
test("incoming past dates and invalid guest counts fall back to a valid stay", () => {
  assert.deepEqual(
    readHotelStay(
      new URLSearchParams(
        "checkIn=2025-01-01&checkOut=bad&adults=-2&rooms=999&children=2.5",
      ),
      "2026-10-31",
    ),
    {
      checkIn: "2026-10-31",
      checkOut: "2026-11-02",
      adults: 2,
      children: 0,
      rooms: 1,
    },
  );
  const stay = readHotelStay(
    new URLSearchParams(
      "checkIn=2026-11-04&checkOut=2026-11-07&adults=4&children=2&rooms=2",
    ),
    "2026-10-31",
  );
  assert.equal(stayNights(stay.checkIn, stay.checkOut), 3);
  assert.equal(stay.adults + stay.children, 6);
  assert.equal(validateHotelStay(stay, "2026-10-31"), "");
});
test("invalid date ranges and occupancy cannot be quoted", () => {
  const stay = {
    checkIn: "2026-11-04",
    checkOut: "2026-11-06",
    adults: 2,
    children: 0,
    rooms: 1,
  };
  assert.match(
    validateHotelStay({ ...stay, checkOut: stay.checkIn }, "2026-10-31"),
    /1–90/,
  );
  assert.match(
    validateHotelStay({ ...stay, checkIn: "2026-10-30" }, "2026-10-31"),
    /today/,
  );
  assert.match(
    validateHotelStay({ ...stay, rooms: 0 }, "2026-10-31"),
    /guests and rooms/,
  );
  assert.match(
    validateHotelStay({ ...stay, adults: NaN }, "2026-10-31"),
    /guests and rooms/,
  );
});
test("gallery preserves API photo order and deduplicates room imagery", () => {
  assert.deepEqual(
    hotelPhotos({ images: ["hotel.jpg", "room.jpg", ""] }, [
      { images: ["room.jpg", "family.jpg"] },
    ]),
    ["hotel.jpg", "room.jpg", "family.jpg"],
  );
});
test("maps use the actual property coordinates and fall back to its address", () => {
  const hotel = {
    name: "Hunza stay",
    location: {
      latitude: 36.3167,
      longitude: 74.65,
      address: "Karimabad",
      city: "Hunza",
    },
  };
  assert.match(hotelMapLinks(hotel).embed, /marker=36.3167,74.65/);
  const missing = hotelMapLinks({
    ...hotel,
    location: { ...hotel.location, latitude: 0, longitude: 0 },
  });
  assert.equal(missing.embed, undefined);
  assert.match(
    decodeURIComponent(missing.external),
    /Hunza stay, Karimabad, Hunza/,
  );
});
test("property website links only accept web URLs", () => {
  assert.equal(publicWebsite("javascript:alert(1)"), undefined);
  assert.equal(publicWebsite("data:text/html,test"), undefined);
  assert.equal(publicWebsite("example.com/stay"), "https://example.com/stay");
  assert.equal(
    publicWebsite("https://example.com/stay"),
    "https://example.com/stay",
  );
});
