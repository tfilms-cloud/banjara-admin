import type {
  ChatConversation,
  ChatFilter,
  ChatMessage,
} from "@/types/customer/chat";
type Raw = Record<string, unknown>;
const id = (value: unknown): string =>
  typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? String((value as Raw).id ?? (value as Raw)._id ?? "")
      : "";
const str = (value: unknown) => (value == null ? "" : String(value));
export const CHAT_FILTERS: { id: ChatFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "providers", label: "Providers" },
  { id: "guides", label: "Guides" },
];
export function mapConversation(raw: Raw): ChatConversation {
  const otherUserId = id(raw.otherUserId ?? raw.id);
  return {
    id: otherUserId,
    otherUserId,
    conversationId: str(raw.conversationId),
    name: str(raw.otherUserName) || "BANJARA traveler",
    role: str(raw.otherUserRole) || "customer",
    avatar: safeChatUrl(raw.otherUserAvatar),
    lastMessage: str(raw.lastMessage),
    bookingId: id(raw.bookingId),
    unread: Math.max(0, Number(raw.unreadCount) || 0),
    updatedAt: str(raw.updatedAt ?? raw.createdAt),
  };
}
export function mapChatMessage(raw: Raw): ChatMessage {
  const status = ["sent", "delivered", "read", "failed"].includes(
    str(raw.status),
  )
    ? (str(raw.status) as ChatMessage["status"])
    : raw.readAt
      ? "read"
      : raw.deliveredAt
        ? "delivered"
        : "sent";
  return {
    id: id(raw),
    conversationId: str(raw.conversationId),
    senderId: id(raw.senderId),
    receiverId: id(raw.receiverId),
    bookingId: id(raw.bookingId),
    text: str(raw.message ?? raw.text),
    type: (["text", "image", "file", "location", "trip"].includes(str(raw.type))
      ? raw.type
      : "text") as ChatMessage["type"],
    attachments: Array.isArray(raw.attachments)
      ? raw.attachments.map(safeChatUrl).filter(Boolean)
      : [],
    status,
    createdAt: str(raw.createdAt),
  };
}
/** Server content is never an executable link or an inline SVG/data document. */
export function safeChatUrl(value: unknown): string {
  try {
    const url = new URL(str(value));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function filterConversations(
  rows: ChatConversation[],
  filter: ChatFilter,
  search: string,
  guideIds: Set<string> = new Set(),
  bookingLabels: Record<string, string> = {},
) {
  const query = search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (filter === "all" ||
        (filter === "unread" && row.unread > 0) ||
        (filter === "providers" && row.role === "provider") ||
        (filter === "guides" && guideIds.has(row.otherUserId))) &&
      (!query ||
        [row.name, row.lastMessage, bookingLabels[row.bookingId]]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)),
  );
}
export function mergeChatMessages(pages: ChatMessage[][]): ChatMessage[] {
  const unique = new Map<string, ChatMessage>();
  for (const page of pages)
    for (const item of page)
      if (item.id && !unique.has(item.id)) unique.set(item.id, item);
  return [...unique.values()].sort(
    (a, b) =>
      (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) ||
      a.id.localeCompare(b.id),
  );
}
export function chatDay(value: string) {
  const date = Date.parse(value);
  return Number.isFinite(date)
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Karachi",
      }).format(date)
    : "Date unavailable";
}
export function chatTime(value: string) {
  const date = Date.parse(value);
  return Number.isFinite(date)
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Karachi",
      }).format(date)
    : "";
}
export function validateChatMessage(text: string) {
  if (!text.trim()) return "Write a message before sending.";
  if (text.trim().length > 4000)
    return "Messages can contain up to 4,000 characters.";
  return "";
}
