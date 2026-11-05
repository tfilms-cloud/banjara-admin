export type ChatFilter = "all" | "unread" | "providers" | "guides";
export type ChatMessageType = "text" | "image" | "file" | "location" | "trip";
export interface ChatConversation {
  id: string;
  conversationId: string;
  otherUserId: string;
  name: string;
  role: string;
  avatar: string;
  lastMessage: string;
  bookingId: string;
  unread: number;
  updatedAt: string;
}
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  bookingId: string;
  text: string;
  type: ChatMessageType;
  attachments: string[];
  status: "sent" | "delivered" | "read" | "failed";
  createdAt: string;
}
export interface ChatPage {
  items: ChatMessage[];
  page: number;
  totalPages: number;
}
export interface ChatPresence {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
}
