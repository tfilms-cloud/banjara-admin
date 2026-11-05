import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPLORE_DESTINATIONS,
  readExploreFilters,
  filterDestinations,
  destinationMatches,
  destinationInventory,
} from "../src/lib/explore-destinations.ts";
const defaults = () => readExploreFilters(new URLSearchParams());
const trips = [
  {
    id: "hunza-vehicle",
    to: "Karimabad, Hunza",
    price: 24000,
    bookingMode: "vehicle",
    agency: { verified: true },
  },
  {
    id: "hunza-seat",
    to: "Aliabad",
    price: 5000,
    bookingMode: "seat",
    agency: { verified: false },
  },
  {
    id: "skardu",
    to: "Skardu",
    price: 8000,
    bookingMode: "seat",
    agency: { verified: true },
  },
];
test("unknown URL filters and invalid limits fall back safely", () => {
  const filters = readExploreFilters(
    new URLSearchParams("region=unknown&altitude=-1&price=bad&sort=unsafe"),
  );
  assert.equal(filters.region, "all");
  assert.equal(filters.maxAltitude, 5000);
  assert.equal(filters.maxPrice, Infinity);
  assert.equal(filters.sort, "featured");
});
test("region and search filters combine across valley names and tags", () => {
  assert.deepEqual(
    filterDestinations({ ...defaults(), region: "hunza" }, trips).map(
      (p) => p.id,
    ),
    ["hunza", "khunjerab"],
  );
  assert.deepEqual(
    filterDestinations({ ...defaults(), query: "NANGA PARBAT" }, trips).map(
      (p) => p.id,
    ),
    ["fairy"],
  );
  assert.equal(
    filterDestinations({ ...defaults(), region: "chitral" }, trips).length,
    0,
  );
});
test("inventory retains actual fare units and chooses the cheapest matching departure", () => {
  const inventory = destinationInventory(EXPLORE_DESTINATIONS[0], trips);
  assert.equal(inventory.trips.length, 2);
  assert.equal(inventory.cheapest.id, "hunza-seat");
  assert.equal(inventory.cheapest.bookingMode, "seat");
  assert.equal(inventory.verified, true);
  assert.equal(destinationMatches(EXPLORE_DESTINATIONS[0], "SKARDU"), false);
});
test("transport, price and verification filters depend on published inventory", () => {
  assert.deepEqual(
    filterDestinations(
      { ...defaults(), transport: true, maxPrice: 6000 },
      trips,
    ).map((p) => p.id),
    ["hunza"],
  );
  assert.deepEqual(
    filterDestinations({ ...defaults(), verified: true }, [], ["Kalam"]).map(
      (p) => p.id,
    ),
    ["swat"],
  );
  assert.equal(
    filterDestinations({ ...defaults(), maxPrice: 6000 }, []).length,
    0,
  );
});
test("family, camping and altitude filters combine without inventing live road status", () => {
  assert.deepEqual(
    filterDestinations(
      { ...defaults(), family: true, camp: true, maxAltitude: 3000 },
      trips,
    ).map((p) => p.id),
    ["kumrat"],
  );
});
test("fare sorting puts unquoted destinations after actual prices", () => {
  const sorted = filterDestinations({ ...defaults(), sort: "price" }, trips);
  assert.deepEqual(
    sorted.slice(0, 2).map((p) => p.id),
    ["hunza", "skardu"],
  );
  assert.equal(sorted.length, 6);
});
