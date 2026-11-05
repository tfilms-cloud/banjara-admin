import test from "node:test";
import assert from "node:assert/strict";
import {
  mapTransportAgency,
  agencyDepartures,
  agencyDepartureTime,
  agencyRouteKey,
  filterAgencyDepartures,
  agencyImage,
} from "../src/lib/agency-profile.ts";
const trip = (patch = {}) => ({
  id: "t1",
  agencyId: "p1",
  vehicleId: "v1",
  vehicleName: "Hiace",
  vehicleType: "van",
  vehiclePlate: "GLT-1",
  vehicleCapacity: 14,
  vehicleImages: ["https://example.com/van.jpg"],
  amenities: ["AC"],
  date: "2026-11-02",
  departureTime: "05:00",
  availableSeats: 4,
  price: 6500,
  status: "scheduled",
  from: "Islamabad",
  to: "Hunza",
  ...patch,
});
test("departures use Pakistan time and exclude unavailable inventory and invalid fares", () => {
  assert.equal(agencyDepartureTime(trip()), Date.parse("2026-11-02T00:00:00Z"));
  const rows = [
    trip(),
    trip({ id: "late", departureTime: "06:00" }),
    trip({ id: "past", date: "2026-11-01" }),
    trip({ status: "departed" }),
    trip({ status: "completed" }),
    trip({ status: "cancelled" }),
    trip({ availableSeats: 0 }),
    trip({ price: NaN }),
    trip({ price: -1 }),
    trip({ date: "bad" }),
  ];
  assert.deepEqual(
    agencyDepartures(rows, Date.parse("2026-11-01T23:00:00Z")).map((t) => t.id),
    ["t1", "late"],
  );
  assert.equal(
    agencyDepartures([trip()], Date.parse("2026-11-02T00:01:00Z")).length,
    0,
  );
});
test("reservation filters preserve route direction and exact departure date", () => {
  const rows = [
    trip(),
    trip({ id: "reverse", from: "Hunza", to: "Islamabad" }),
    trip({ id: "next", date: "2026-11-03" }),
  ];
  const now = Date.parse("2026-11-01T00:00:00Z");
  assert.deepEqual(
    filterAgencyDepartures(rows, agencyRouteKey(trip()), "2026-11-03", now).map(
      (t) => t.id,
    ),
    ["next"],
  );
  assert.equal(
    filterAgencyDepartures(rows, agencyRouteKey(trip()), "2026-11-05", now)
      .length,
    0,
  );
});
test("a driver profile shows only the registered vehicle, without data from other vehicles", () => {
  const raw = {
    _id: "p1",
    businessName: "Carrier",
    transportDetails: {
      registrationNumber: "GLT 2",
      vehicleModel: "Prado",
      vehicleImageFront: "https://example.com/prado.jpg",
      driverPhoto: "https://example.com/driver.jpg",
    },
    fleetVehicles: [
      {
        id: "v1",
        name: "Hiace",
        registrationNumber: "GLT-1",
        images: [
          "https://example.com/driver.jpg",
          "https://example.com/van.jpg",
        ],
      },
    ],
  };
  const agency = mapTransportAgency(raw, [
    trip(),
    trip({ agencyId: "other", vehicleId: "foreign" }),
  ]);
  // One driver, one vehicle: an older account's extra vehicle is not shown.
  assert.equal(agency.fleet.length, 1);
  assert.equal(agency.fleet[0].name, "Prado");
  assert.equal(agency.fleet[0].capacity, undefined);
  assert.deepEqual(agency.fleet[0].amenities, []);
  assert.deepEqual(agency.fleet[0].photos, ["https://example.com/prado.jpg"]);
});
test("a transport profile is named after its driver, not the business", () => {
  const named = (raw) => mapTransportAgency({ _id: "p1", ...raw }, []).name;
  assert.equal(
    named({ businessName: "Old Travels", ownerName: "Owner", transportDetails: { driverName: "Ali Khan" } }),
    "Ali Khan",
  );
  assert.equal(named({ businessName: "Old Travels", ownerName: "Sara Baig" }), "Sara Baig");
  assert.equal(named({ businessName: "Old Travels" }), "Old Travels");
});
test("matching primary plates merge images once without duplicating the registered vehicle", () => {
  const agency = mapTransportAgency(
    {
      _id: "p1",
      transportDetails: {
        registrationNumber: "glt 1",
        vehicleImageFront: "https://example.com/front.jpg",
      },
      fleetVehicles: [
        {
          id: "v1",
          registrationNumber: "GLT-1",
          images: ["https://example.com/van.jpg"],
        },
      ],
    },
    [trip()],
  );
  assert.equal(agency.fleet.length, 1);
  assert.deepEqual(agency.fleet[0].photos, [
    "https://example.com/front.jpg",
    "https://example.com/van.jpg",
  ]);
});

test("an explicit vehicle photo remains valid when the provider also uses it as their logo", () => {
  const photo = "https://example.com/van.jpg";
  const agency = mapTransportAgency(
    {
      _id: "p1",
      logo: photo,
      fleetVehicles: [{ id: "v1", name: "Hiace", images: [photo] }],
    },
    [trip()],
  );
  assert.deepEqual(agency.fleet[0].photos, [photo]);
});
test("missing public details stay absent and media rejects executable schemes", () => {
  const agency = mapTransportAgency({ _id: "p1" }, []);
  assert.deepEqual(agency.fleet, []);
  assert.equal(agency.verified, false);
  assert.equal(agency.rating, 0);
  assert.equal(agency.driver, undefined);
  for (const value of [
    "javascript:alert(1)",
    "data:image/svg+xml,test",
    "//example.com/x",
  ])
    assert.equal(agencyImage(value), "");
  assert.equal(
    agencyImage("https://example.com/photo.jpg"),
    "https://example.com/photo.jpg",
  );
});
