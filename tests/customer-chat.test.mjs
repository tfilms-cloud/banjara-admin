import test from "node:test";
import assert from "node:assert/strict";
import {
  mapConversation,
  mapChatMessage,
  filterConversations,
  mergeChatMessages,
  safeChatUrl,
  chatDay,
  chatTime,
  validateChatMessage,
} from "../src/lib/customer-chat.ts";

const thread = (id, unread = 0, role = "provider") =>
  mapConversation({
    otherUserId: id,
    conversationId: `customer:${id}`,
    otherUserName: id,
    lastMessage: "Pickup at the terminal",
    otherUserRole: role,
    unreadCount: unread,
    bookingId: `booking-${id}`,
    updatedAt: "2026-10-31T01:00:00Z",
  });
test("conversation filters combine unread, booked guides, provider role and booking search", () => {
  const rows = [
    thread("carrier", 2),
    thread("guide", 0),
    thread("traveler", 1, "customer"),
  ];
  assert.deepEqual(
    filterConversations(rows, "unread", "").map((c) => c.id),
    ["carrier", "traveler"],
  );
  assert.deepEqual(
    filterConversations(rows, "providers", "").map((c) => c.id),
    ["carrier", "guide"],
  );
  assert.deepEqual(
    filterConversations(rows, "guides", "", new Set(["guide"])).map(
      (c) => c.id,
    ),
    ["guide"],
  );
  assert.deepEqual(
    filterConversations(rows, "all", "HUNZA", new Set(), {
      "booking-carrier": "BJ-123 Islamabad to Hunza",
    }).map((c) => c.id),
    ["carrier"],
  );
  assert.deepEqual(filterConversations(rows, "all", "no-match"), []);
});
test("message mapping retains sender identity, dates and receipt status without inventing content", () => {
  const mapped = mapChatMessage({
    _id: "msg",
    senderId: { _id: "sender" },
    receiverId: "receiver",
    text: "Hello",
    readAt: "2026-10-31T01:00:00Z",
  });
  assert.equal(mapped.id, "msg");
  assert.equal(mapped.senderId, "sender");
  assert.equal(mapped.status, "read");
  assert.equal(mapped.text, "Hello");
  assert.equal(mapped.createdAt, "");
});
test("chat history merges overlapping pages once and preserves the newest receipt", () => {
  const message = (id, date, status = "sent") =>
    mapChatMessage({ _id: id, createdAt: date, status });
  const merged = mergeChatMessages([
    [message("b", "2026-10-31T02:00:00Z", "read")],
    [
      message("a", "2026-10-31T01:00:00Z"),
      message("b", "2026-10-31T02:00:00Z"),
    ],
  ]);
  assert.deepEqual(
    merged.map((m) => m.id),
    ["a", "b"],
  );
  assert.equal(merged[1].status, "read");
});
test("attachment and avatar URLs reject executable and inline documents", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "file:///secret",
    "/relative.png",
  ])
    assert.equal(safeChatUrl(value), "");
  assert.equal(
    safeChatUrl("https://example.com/photo.jpg"),
    "https://example.com/photo.jpg",
  );
  const mapped = mapChatMessage({
    _id: "safe",
    attachments: ["javascript:alert(1)", "https://example.com/image.png"],
  });
  assert.deepEqual(mapped.attachments, ["https://example.com/image.png"]);
});
test("chat dates use Pakistan day boundaries and empty dates stay unknown", () => {
  assert.equal(chatDay("2026-10-30T20:00:00Z"), "31 Oct 2026");
  assert.match(chatTime("2026-10-30T20:00:00Z"), /01:00 am/i);
  assert.equal(chatDay(""), "Date unavailable");
  assert.equal(chatTime(""), "");
});
test("composer validation matches the backend's nonempty 4000-character limit", () => {
  assert.ok(validateChatMessage("   "));
  assert.equal(validateChatMessage(" hello "), "");
  assert.equal(validateChatMessage("a".repeat(4000)), "");
  assert.ok(validateChatMessage("a".repeat(4001)));
});
