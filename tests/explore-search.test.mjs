import test from "node:test";
import assert from "node:assert/strict";
import { readExploreSearch, matchesExploreJourney } from "../src/lib/explore-search.ts";

test("Home ride searches retain route, Pakistan date, passengers and return constraints in Explore", () => {
  const search = readExploreSearch(new URLSearchParams("from=Islamabad&to=Hunza&date=2026-11-04&passengers=3&journeyType=round_trip&returnDate=2026-11-08&bookingMode=vehicle"));
  assert.equal(search.hasTripSearch, true);
  assert.deepEqual(search.trip, { from: "Islamabad", to: "Hunza", date: "2026-11-04", passengers: 3, journeyType: "round_trip" });
  assert.equal(matchesExploreJourney({ bookingMode: "vehicle", returnDate: "2026-11-08" }, search, "Coaster"), true);
  assert.equal(matchesExploreJourney({ bookingMode: "seat", returnDate: "2026-11-08" }, search, "Coaster"), false);
  assert.equal(matchesExploreJourney({ bookingMode: "vehicle", returnDate: "2026-11-09" }, search, "Coaster"), false);
  const vehicleSearch = readExploreSearch(new URLSearchParams("vehicle=Coaster"));
  assert.equal(matchesExploreJourney({}, vehicleSearch, "coaster"), true);
  assert.equal(matchesExploreJourney({}, vehicleSearch, "Van"), false);
  assert.equal(matchesExploreJourney({ vehicleClass: "car" }, readExploreSearch(new URLSearchParams("vehicle=car")), "Sedan"), true);
  assert.equal(matchesExploreJourney({ vehicleClass: "mini_bus" }, readExploreSearch(new URLSearchParams("vehicle=mini_bus")), "Mini bus"), true);
});
test("stay searches keep dates and occupancy, and malformed dates or counts cannot become API constraints", () => {
  const search = readExploreSearch(new URLSearchParams("destination=Skardu&checkIn=2026-11-04&checkOut=2026-11-06&adults=2&children=1&rooms=2"));
  assert.equal(search.hasHotelSearch, true);
  assert.deepEqual(search.hotel, { destination: "Skardu", checkIn: "2026-11-04", checkOut: "2026-11-06", adults: 2, children: 1, rooms: 2 });
  const invalid = readExploreSearch(new URLSearchParams("date=2026-02-30&checkIn=invalid&passengers=-2&adults=2.5&rooms=9999&bookingMode=unsupported"));
  assert.equal(invalid.trip.date, "");
  assert.equal(invalid.hotel.checkIn, "");
  assert.equal(invalid.trip.passengers, 1);
  assert.equal(invalid.hotel.adults, 1);
  assert.equal(invalid.hotel.rooms, 50);
  assert.equal(invalid.bookingMode, "");
  assert.equal(readExploreSearch(new URLSearchParams()).hasTripSearch, false);
  assert.equal(readExploreSearch(new URLSearchParams()).hasHotelSearch, false);
});
