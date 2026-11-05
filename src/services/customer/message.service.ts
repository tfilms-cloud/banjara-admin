import { customerGet, customerPost, customerRequest } from "@/lib/customer-api";
import { mapChatMessage, mapConversation } from "@/lib/customer-chat";
import { asArray } from "@/lib/utils";
import type { ChatPage } from "@/types/customer/chat";
type Raw = Record<string, unknown>;
export async function listCustomerConversations() {
  return asArray<Raw>(await customerGet<unknown>("/messages"))
    .map(mapConversation)
    .filter((row) => row.id && row.conversationId);
}
export async function getCustomerConversation(
  withUserId: string,
  page = 1,
): Promise<ChatPage> {
  const data = await customerGet<{
    items: Raw[];
    pagination?: { page: number; totalPages: number };
  }>("/messages", { params: { withUserId, page, limit: 40 } });
  return {
    items: asArray<Raw>(data).map(mapChatMessage),
    page: data.pagination?.page ?? page,
    totalPages: data.pagination?.totalPages ?? 1,
  };
}
export async function sendCustomerMessage(input: {
  receiverId: string;
  message: string;
  bookingId?: string;
  attachments?: string[];
  type?: "text" | "image";
}) {
  return mapChatMessage(await customerPost<Raw>("/messages", input));
}
export async function readCustomerConversation(conversationId: string) {
  await customerPost("/messages/read", { conversationId });
}
export async function uploadChatPhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("Choose a JPEG, PNG, WebP or GIF photo.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 5 MB.");
  const form = new FormData();
  form.append("folder", "chat");
  form.append("file", file);
  return customerRequest<{ url: string }>({
    method: "POST",
    url: "/uploads",
    data: form,
    headers: { "Content-Type": undefined },
    timeout: 60000,
  });
}
