import test from "node:test";
import assert from "node:assert/strict";
import {
  readCatalogFilters,
  exploreVehicleClass,
  exploreVehicleOptions,
  exploreVehicles,
  residenceClass,
  catalogMatches,
} from "../src/lib/explore-catalog.ts";

test("service URLs reject unknown categories and keep mobile defaults", () => {
  assert.deepEqual(
    readCatalogFilters(
      new URLSearchParams(
        "service=invalid&vehicle=unsafe&gender=other&tourType=invalid",
      ),
    ),
    {
      service: "transport",
      vehicle: "all",
      residence: "hotel",
      tourType: "trek",
      gender: "male",
      city: "",
    },
  );
  assert.equal(
    readCatalogFilters(
      new URLSearchParams("service=restaurants&city=%20Hunza%20"),
    ).city,
    "Hunza",
  );
});
test("provider vehicle registration takes precedence over simplified transport type", () => {
  assert.equal(
    exploreVehicleClass({ vehicleCategory: "jeep", vehicleType: "private" }),
    "jeep",
  );
  assert.equal(exploreVehicleClass({ vehicleCategory: "minibus" }), "mini_bus");
  assert.equal(exploreVehicleClass({ vehicleType: "private" }), "car");
  assert.equal(exploreVehicleClass({ vehicleCategory: "unlisted" }), "other");
});
test("vehicle chips only show categories supplied by available provider inventory", () => {
  assert.deepEqual(
    exploreVehicleOptions([
      { vehicleCategory: "jeep" },
      { vehicleCategory: "suv" },
    ]).map((x) => x.id),
    ["all", "jeep", "suv"],
  );
  assert.deepEqual(
    exploreVehicleOptions([]).map((x) => x.id),
    ["all"],
  );
});
test("vehicle filtering deduplicates departures by provider and vehicle with its cheapest fare", () => {
  const trips = [
    {
      id: "later",
      agencyId: "a",
      vehicleId: "v",
      vehicleCategory: "jeep",
      price: 12000,
    },
    {
      id: "earlier",
      agencyId: "a",
      vehicleId: "v",
      vehicleCategory: "jeep",
      price: 9000,
    },
    {
      id: "other-provider",
      agencyId: "b",
      vehicleId: "v",
      vehicleCategory: "van",
      price: 5000,
    },
  ];
  assert.deepEqual(
    exploreVehicles(trips, "jeep").map((t) => t.id),
    ["earlier"],
  );
  assert.equal(exploreVehicles(trips, "all").length, 2);
});
test("lodging categories map guest houses, hostels and homestays like mobile", () => {
  assert.equal(residenceClass("guest_house"), "guest_house");
  assert.equal(residenceClass("hostel"), "lodge");
  assert.equal(residenceClass("homestay"), "lodge");
  assert.equal(residenceClass("resort"), "hotel");
});
test("catalog search matches providers, destinations and cuisine case-insensitively", () => {
  assert.equal(catalogMatches("  HUNZA  ", "Local guide", "Hunza"), true);
  assert.equal(catalogMatches("trout", "Mountain cafe", "Grilled trout"), true);
  assert.equal(catalogMatches("Skardu", "Hunza"), false);
});
