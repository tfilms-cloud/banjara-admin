import test from "node:test";
import assert from "node:assert/strict";
import {
  activeFilters,
  formatBox,
  parseBox,
  readExploreRefine,
  refineCards,
} from "../src/lib/explore-refine.ts";

const card = (id, price, rating, lat = 35.9, lng = 74.3) => ({
  id,
  service: "transport",
  title: id,
  subtitle: "",
  city: "Hunza",
  image: null,
  price,
  priceUnit: "per seat",
  rating,
  reviewCount: 0,
  verified: false,
  tags: [],
  target: { type: "trip", id },
  location: { lat, lng, address: "" },
});

test("reads browser-side filters from the URL and ignores junk", () => {
  const refine = readExploreRefine(
    new URLSearchParams("minPrice=30000&maxPrice=5000&rating=4.5&passengers=7&order=price_desc&only=verified,topRated&journeyType=one_way&view=drivers"),
  );
  // A reversed range is swapped rather than matching nothing.
  assert.equal(refine.minPrice, 5000);
  assert.equal(refine.maxPrice, 30000);
  assert.equal(refine.rating, 4.5);
  assert.equal(refine.seats, 7);
  assert.equal(refine.order, "price_desc");
  assert.equal(refine.verified, true);
  assert.equal(refine.journeyType, "one_way");
  assert.equal(refine.view, "drivers");

  const junk = readExploreRefine(new URLSearchParams("minPrice=abc&rating=3&passengers=1&order=newest&bookingMode=x&bbox=1,2"));
  assert.equal(junk.minPrice, null);
  assert.equal(junk.rating, null);
  assert.equal(junk.seats, null);
  assert.equal(junk.order, "recommended");
  assert.equal(junk.bookingMode, null);
  assert.equal(junk.bbox, null);
  assert.equal(junk.view, "vehicles");
});

test("price range, rating and map area narrow the cards; sorts are stable", () => {
  const cards = [card("a", 24000, 4.8), card("b", 3500, null), card("c", 30000, 4.2, 30, 70), card("d", null, 5)];
  const ids = (list) => list.map((c) => c.id);
  const base = readExploreRefine(new URLSearchParams());

  assert.deepEqual(ids(refineCards(cards, { ...base, minPrice: 4000, maxPrice: 26000 })), ["a"]);
  // An unpriced listing cannot satisfy a price filter.
  assert.deepEqual(ids(refineCards(cards, { ...base, maxPrice: 50000 })), ["a", "b", "c"]);
  assert.deepEqual(ids(refineCards(cards, { ...base, rating: 4.5 })), ["a", "d"]);
  const box = parseBox("74,35,75,36");
  assert.deepEqual(ids(refineCards(cards, { ...base, bbox: box })), ["a", "b", "d"]);
  assert.equal(formatBox(box), "74.0000,35.0000,75.0000,36.0000");

  assert.deepEqual(ids(refineCards(cards, { ...base, order: "price" })), ["b", "a", "c", "d"]);
  assert.deepEqual(ids(refineCards(cards, { ...base, order: "price_desc" })), ["c", "a", "b", "d"]);
  assert.deepEqual(ids(refineCards(cards, { ...base, order: "rating" })), ["d", "a", "c", "b"]);
  // Recommended keeps the API's order.
  assert.deepEqual(ids(refineCards(cards, base)), ["a", "b", "c", "d"]);
});

test("active filter chips describe and clear each filter", () => {
  const refine = readExploreRefine(new URLSearchParams("maxPrice=20000&only=verified,topRated&from=Gilgit"));
  const chips = activeFilters(refine, { query: "prado", vehicleLabel: "SUV", only: ["verified", "topRated"] });
  assert.deepEqual(
    chips.map((c) => c.label),
    ["“prado”", "SUV", "Up to PKR 20,000", "From Gilgit", "Verified only"],
  );
  // Removing "Verified" keeps the other quick toggles.
  assert.deepEqual(chips.find((c) => c.key === "verified").clear, { only: "topRated" });
  assert.deepEqual(chips.find((c) => c.key === "price").clear, { minPrice: null, maxPrice: null });
});
