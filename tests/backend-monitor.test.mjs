import assert from "node:assert/strict";
import test from "node:test";
import { createBackendMonitor } from "../src/lib/backend-monitor.ts";

test("the first connect of a page load does not wipe queries already in flight", async () => {
  const monitor = createBackendMonitor(async () => true);
  let resets = 0;
  monitor.registerReset(() => {
    resets += 1;
  });
  await monitor.check();
  assert.equal(monitor.getSnapshot(), "online");
  assert.equal(resets, 0);
});

test("going offline and reconnecting still clears stale data", async () => {
  let ready = true;
  const monitor = createBackendMonitor(async () => ready);
  let resets = 0;
  monitor.registerReset(() => {
    resets += 1;
  });
  await monitor.check();
  monitor.reportFailure();
  assert.equal(monitor.getSnapshot(), "offline");
  assert.equal(resets, 1);
  ready = true;
  await monitor.check();
  assert.equal(monitor.getSnapshot(), "online");
  assert.equal(resets, 2);
});

test("a first check that finds the API down still resets", async () => {
  const monitor = createBackendMonitor(async () => false);
  let resets = 0;
  monitor.registerReset(() => {
    resets += 1;
  });
  await monitor.check();
  assert.equal(monitor.getSnapshot(), "offline");
  assert.equal(resets, 1);
});
