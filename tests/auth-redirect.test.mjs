import test from "node:test";
import assert from "node:assert/strict";
import { authHref, homeAfterAuth, safeNext } from "../src/lib/auth-redirect.ts";

const traveller = { id: "u1", name: "Ayesha", email: "a@x.com", phone: "", role: "customer" };
const provider = { ...traveller, id: "u2", role: "provider" };

test("only same-site travel pages are accepted as a return page", () => {
  for (const ok of ["/", "/account", "/explore?service=transport", "/trips/abc#seats", "/trips/abc/book?passengers=2", "/agencies/p1", "/bookings"]) {
    assert.equal(safeNext(ok), ok, ok);
  }
  for (const bad of [
    "https://evil.example",
    "//evil.example/account",
    "/login",
    "/register/provider",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ]) {
    assert.equal(safeNext(bad), null, String(bad));
  }
});

test("providers land on their application; travellers return where they were", () => {
  // No application yet: choose a service first.
  assert.equal(homeAfterAuth(provider, "/explore"), "/provider-application");
  assert.equal(homeAfterAuth({ ...provider, providerId: "p1" }, "/explore"), "/provider");
  assert.equal(homeAfterAuth(traveller, "/trips/t1"), "/trips/t1");
  assert.equal(homeAfterAuth(traveller, "//evil.example"), "/account");
  assert.equal(homeAfterAuth(traveller), "/account");
});

test("auth links keep a safe return page and drop an unsafe one", () => {
  assert.equal(authHref("/login", "/trips/t1"), "/login?next=%2Ftrips%2Ft1");
  assert.equal(authHref("/login", "https://evil.example"), "/login");
  assert.equal(authHref("/register"), "/register");
});
