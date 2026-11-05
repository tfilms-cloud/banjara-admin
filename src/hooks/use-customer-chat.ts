"use client";
import { useEffect, useRef, useState } from "react";
import { useBackendStatus } from '@/lib/live-query';
import { backendAvailability } from '@/lib/backend-availability';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@/lib/live-query";
import { io, type Socket } from "socket.io-client";
import { getCustomerAccessToken } from "@/lib/customer-api";
import { mapChatMessage, mergeChatMessages } from "@/lib/customer-chat";
import {
  getCustomerConversation,
  listCustomerConversations,
  readCustomerConversation,
  sendCustomerMessage,
} from "@/services/customer/message.service";
import type { ChatPresence } from "@/types/customer/chat";

export function useCustomerChat(
  ownerId: string | undefined,
  peerId: string,
  conversationId: string,
) {
  const online = useBackendStatus() === 'online' && !backendAvailability.hasDisconnected();
  const client = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connection, setConnection] = useState("Connecting");
  const [presence, setPresence] = useState<ChatPresence | null>(null);
  const [typingPeer, setTypingPeer] = useState("");
  const inbox = useQuery({
    queryKey: ["customer", "messages", ownerId],
    queryFn: listCustomerConversations,
    enabled: !!ownerId,
    refetchInterval: 15000,
  });
  const history = useInfiniteQuery({
    queryKey: ["customer", "chat", ownerId, peerId],
    queryFn: ({ pageParam }) => getCustomerConversation(peerId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    enabled: online && !!ownerId && !!peerId,
    refetchInterval: 15000,
  });
  const messages = mergeChatMessages(
    online ? history.data?.pages.map((page) => page.items) ?? [] : [],
  );
  useEffect(() => {
    if (!online || !ownerId) return;
    const socket = io(
      (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(
        /\/api\/?$/,
        "",
      ),
      {
        transports: ["websocket"],
        auth: (callback) => callback({ token: getCustomerAccessToken() }),
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
      },
    );
    socketRef.current = socket;
    let authRetry: ReturnType<typeof setTimeout>;
    const refresh = () => {
      void client.invalidateQueries({
        queryKey: ["customer", "messages", ownerId],
      });
      void client.invalidateQueries({
        queryKey: ["customer", "chat", ownerId],
      });
    };
    socket.on("connect", () => {
      clearTimeout(authRetry);
      setConnection("Connected");
      refresh();
    });
    socket.on("disconnect", () => setConnection("Reconnecting"));
    socket.on("connect_error", () => {
      setConnection("Syncing every 15 seconds");
      // An authentication rejection does not trigger Socket.IO's transport retry.
      // REST refreshes the session; the auth callback reads that renewed token.
      if (!socket.active) {
        clearTimeout(authRetry);
        authRetry = setTimeout(() => socket.connect(), 5000);
      }
    });
    socket.on("new_message", refresh);
    socket.on("conversation_updated", refresh);
    socket.on("message_read", refresh);
    socket.on("message_delivered", refresh);
    return () => {
      clearTimeout(authRetry);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [online, ownerId, client]);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !peerId || !conversationId) return;
    const join = () => {
      socket.emit("joinConversation", conversationId);
      socket.emit("getPresence", peerId);
    };
    const onPresence = (value: ChatPresence) => {
      if (value.userId === peerId) setPresence(value);
    };
    let timer: ReturnType<typeof setTimeout>;
    const onTyping = (value: { userId: string; conversationId: string }) => {
      if (value.userId === peerId && value.conversationId === conversationId) {
        setTypingPeer(peerId);
        clearTimeout(timer);
        timer = setTimeout(() => setTypingPeer(""), 4000);
      }
    };
    const onStop = () => setTypingPeer("");
    socket.on("connect", join);
    socket.on("user_status_changed", onPresence);
    socket.on("user_typing", onTyping);
    socket.on("user_stopped_typing", onStop);
    join();
    // Presence changes are scoped by the backend; refresh the selected counterpart only.
    const presenceTimer = setInterval(
      () => socket.emit("getPresence", peerId),
      15000,
    );
    return () => {
      clearInterval(presenceTimer);
      clearTimeout(timer);
      socket.emit("leaveConversation", conversationId);
      socket.emit("stopTyping", { conversationId });
      socket.off("connect", join);
      socket.off("user_status_changed", onPresence);
      socket.off("user_typing", onTyping);
      socket.off("user_stopped_typing", onStop);
    };
  }, [online, ownerId, peerId, conversationId]);
  const lastIncoming = messages
    .filter((m) => m.receiverId === ownerId && m.status !== "read")
    .map((m) => m.id)
    .join(",");
  useEffect(() => {
    if (!ownerId || !conversationId || !lastIncoming) return;
    const read = () => {
      if (document.visibilityState !== "visible") return;
      void readCustomerConversation(conversationId)
        .then(() => {
          socketRef.current?.emit("messageRead", { conversationId });
          void client.invalidateQueries({
            queryKey: ["customer", "messages", ownerId],
          });
          void client.invalidateQueries({
            queryKey: ["customer", "chat", ownerId, peerId],
          });
        })
        .catch(() => {});
    };
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, [ownerId, peerId, conversationId, lastIncoming, client]);
  const send = useMutation({
    mutationFn: async (input: Parameters<typeof sendCustomerMessage>[0]) => {
      if (!online) throw new Error('Messaging is temporarily unavailable.');
      const socket = socketRef.current;
      if (!socket?.connected) return sendCustomerMessage(input);
      return new Promise<ReturnType<typeof mapChatMessage>>(
        (resolve, reject) => {
          socket.timeout(20000).emit(
            "sendMessage",
            input,
            (
              timeout: Error | null,
              ack: {
                success?: boolean;
                message?: string;
                data?: Record<string, unknown>;
              },
            ) => {
              if (timeout) {
                reject(
                  new Error(
                    "Delivery is uncertain. Refresh this conversation before retrying to avoid sending twice.",
                  ),
                );
                return;
              }
              if (!ack?.success || !ack.data) {
                reject(new Error(ack?.message || "Message could not be sent."));
                return;
              }
              resolve(mapChatMessage(ack.data));
            },
          );
        },
      );
    },
    onSuccess: () => {
      socketRef.current?.emit("stopTyping", { conversationId });
      void client.invalidateQueries({
        queryKey: ["customer", "messages", ownerId],
      });
      void client.invalidateQueries({
        queryKey: ["customer", "chat", ownerId, peerId],
      });
    },
    retry: false,
  });
  return {
    inbox,
    history,
    messages,
    send,
    connection: online ? ownerId ? connection : "Sign in to connect" : 'Live messages unavailable',
    presence: online && presence?.userId === peerId ? presence : null,
    typing: online && typingPeer === peerId && !!peerId,
    onTyping: () => socketRef.current?.emit("typing", { conversationId }),
    stopTyping: () => socketRef.current?.emit("stopTyping", { conversationId }),
  };
}
