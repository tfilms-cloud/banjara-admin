import test from "node:test";
import assert from "node:assert/strict";
import { createLocationBuffer } from "../src/lib/location-buffer.ts";

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}
const point = (n) => ({ lat: 35 + n / 1000, lng: 74, at: new Date(Date.UTC(2026, 10, 7, 10, 0, n)).toISOString() });

test("points are drained oldest first and stay until acknowledged", () => {
  const buffer = createLocationBuffer({ storage: memoryStorage(), key: "k" });
  for (let i = 0; i < 5; i++) buffer.add(point(i));
  assert.deepEqual(buffer.drain(3), [point(0), point(1), point(2)]);
  assert.equal(buffer.size(), 5);
  buffer.ack(3);
  assert.equal(buffer.size(), 2);
  assert.deepEqual(buffer.drain(10), [point(3), point(4)]);
});

test("points survive a reload", () => {
  const storage = memoryStorage();
  const first = createLocationBuffer({ storage, key: "trip-1" });
  first.add(point(1));
  first.add(point(2));
  const second = createLocationBuffer({ storage, key: "trip-1" });
  assert.deepEqual(second.drain(), [point(1), point(2)]);
  second.ack(1);
  assert.deepEqual(createLocationBuffer({ storage, key: "trip-1" }).drain(), [point(2)]);
  assert.equal(createLocationBuffer({ storage, key: "trip-2" }).size(), 0);
});

test("the buffer is capped by dropping the oldest points", () => {
  const buffer = createLocationBuffer({ storage: memoryStorage(), key: "k", maxPoints: 3 });
  for (let i = 0; i < 5; i++) buffer.add(point(i));
  assert.deepEqual(buffer.drain(), [point(2), point(3), point(4)]);
});

test("points dropped while a batch is in flight are not acknowledged twice", () => {
  const buffer = createLocationBuffer({ storage: memoryStorage(), key: "k", maxPoints: 3 });
  for (let i = 0; i < 3; i++) buffer.add(point(i));
  const sent = buffer.drain();
  buffer.add(point(3)); // drops point 0, which was in the batch
  buffer.ack(sent.length);
  assert.deepEqual(buffer.drain(), [point(3)]);
});

test("storage that throws or holds junk never breaks the buffer", () => {
  const broken = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
  };
  const buffer = createLocationBuffer({ storage: broken, key: "k" });
  buffer.add(point(1));
  assert.equal(buffer.size(), 1);
  buffer.ack(1);
  assert.equal(buffer.size(), 0);

  const junk = memoryStorage();
  junk.setItem("a", "{not json");
  assert.equal(createLocationBuffer({ storage: junk, key: "a" }).size(), 0);
  junk.setItem("b", JSON.stringify([point(1), { lat: "x" }, null]));
  assert.deepEqual(createLocationBuffer({ storage: junk, key: "b" }).drain(), [point(1)]);
  assert.equal(createLocationBuffer({ storage: null, key: "c" }).size(), 0);
});
