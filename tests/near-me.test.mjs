import test from "node:test";
import assert from "node:assert/strict";
import { NEAR_DEFAULT_KM, NEAR_MAX_KM, nearBounds, nearMeHref, readNearMe } from "../src/lib/near-me.ts";

test("reads the visitor's position and clamps the radius to 1–20 km", () => {
  assert.deepEqual(readNearMe(new URLSearchParams("near=35.92,74.31")), { lat: 35.92, lng: 74.31, radiusKm: NEAR_DEFAULT_KM });
  assert.equal(readNearMe(new URLSearchParams("near=35.92,74.31&radius=15")).radiusKm, 15);
  assert.equal(readNearMe(new URLSearchParams("near=35.92,74.31&radius=500")).radiusKm, NEAR_MAX_KM);
  for (const bad of ["", "abc", "91,0", "1,2,3", "35.9"]) {
    assert.equal(readNearMe(new URLSearchParams(`near=${bad}`)), null, bad);
  }
});

test("the Ride choice opens the map for rides within 10 km", () => {
  const href = nearMeHref(35.921234, 74.308771);
  const url = new URL(href, "http://x");
  assert.equal(url.pathname, "/explore/map");
  assert.equal(url.searchParams.get("service"), "transport");
  assert.equal(url.searchParams.get("near"), "35.92123,74.30877");
  assert.equal(url.searchParams.get("radius"), "10");
});

test("the map frames the whole search circle", () => {
  const [[s, w], [n, e]] = nearBounds({ lat: 35.92, lng: 74.31, radiusKm: 10 });
  // About 0.09° of latitude per 10 km; longitude degrees are shorter this far north.
  assert.ok(Math.abs(n - s - 0.18) < 0.005);
  assert.ok(e - w > n - s);
});
