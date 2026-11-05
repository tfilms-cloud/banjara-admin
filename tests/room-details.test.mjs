import test from "node:test";
import assert from "node:assert/strict";
import {
  groupRoomAmenities,
  roomAbout,
  roomAvailabilityError,
  roomDetailsHref,
  roomSelectionHref,
  roomSizeLabel,
} from "../src/lib/room-details.ts";

const room = {
  id: "room-1",
  hotelId: "hotel-1",
  name: "King Room",
  roomType: "deluxe",
  bedType: "King bed",
  capacity: 2,
  sizeSqm: 38,
  images: [],
  amenities: [],
  breakfastIncluded: true,
  freeCancellation: true,
  pricePerNight: 8500,
  availableRooms: 3,
  status: "active",
  description: "deluxe",
};
const stay = {
  checkIn: "2026-11-04",
  checkOut: "2026-11-07",
  adults: 2,
  children: 0,
  rooms: 1,
};

test("room links carry all stay details and select the correct property room", () => {
  const details = new URL(
    roomDetailsHref(room, { ...stay, children: 1 }),
    "http://localhost",
  );
  assert.equal(details.pathname, "/hotels/hotel-1/rooms/room-1");
  assert.equal(details.searchParams.get("checkOut"), stay.checkOut);
  assert.equal(details.searchParams.get("children"), "1");
  const selection = new URL(
    roomSelectionHref(room, { ...stay, rooms: 2 }),
    "http://localhost",
  );
  assert.equal(selection.searchParams.get("roomId"), room.id);
  assert.equal(selection.searchParams.get("rooms"), "2");
  assert.equal(selection.hash, "#available-hotel-rooms");
});
test("catalog inventory cannot stand in for date-specific availability or another room", () => {
  assert.match(roomAvailabilityError(room, stay), /unavailable/);
  assert.match(
    roomAvailabilityError(room, stay, { ...room, id: "room-2" }),
    /unavailable/,
  );
  assert.match(
    roomAvailabilityError(room, stay, { ...room, hotelId: "other-hotel" }),
    /unavailable/,
  );
  assert.equal(roomAvailabilityError(room, stay, room), "");
});
test("unavailable, inactive, invalid-price and over-capacity stays cannot be quoted", () => {
  assert.match(
    roomAvailabilityError({ ...room, status: "inactive" }, stay, room),
    /not accepting/,
  );
  assert.match(
    roomAvailabilityError(room, { ...stay, adults: 3 }, room),
    /fewer guests/,
  );
  assert.equal(
    roomAvailabilityError(room, { ...stay, adults: 4, rooms: 2 }, room),
    "",
  );
  assert.match(
    roomAvailabilityError(room, stay, { ...room, pricePerNight: NaN }),
    /rate/,
  );
  assert.match(
    roomAvailabilityError(room, stay, { ...room, availableRooms: 0 }),
    /Not enough/,
  );
  assert.match(
    roomAvailabilityError(room, stay, { ...room, availableRooms: NaN }),
    /Not enough/,
  );
});
test("amenities remain provider-supplied, categorized and case-insensitively deduplicated", () => {
  const groups = groupRoomAmenities([
    " Wi-Fi ",
    "wi-fi",
    "Bukhari heating",
    "Hot water",
    "Mountain view",
    "",
    "Luggage storage",
  ]);
  assert.deepEqual(
    groups.flatMap((group) => group.items),
    [
      "Wi-Fi",
      "Bukhari heating",
      "Hot water",
      "Mountain view",
      "Luggage storage",
    ],
  );
  assert.equal(
    groups.find((group) => group.name === "Bathroom & Grooming").items[0],
    "Hot water",
  );
  assert.equal(
    groups.find((group) => group.name === "Tech & Connectivity").items.length,
    1,
  );
});
test("room descriptions and dimensions use only published room facts", () => {
  assert.equal(
    roomAbout(room),
    "A room with King bed for up to 2 guests with 38 m² of space.",
  );
  assert.equal(
    roomAbout({ ...room, description: "A sunny room." }),
    "A sunny room.",
  );
  assert.equal(roomSizeLabel(room), "38 m² (409 sq ft)");
  assert.equal(roomSizeLabel({ ...room, sizeSqm: 0 }), "Size not published");
});
