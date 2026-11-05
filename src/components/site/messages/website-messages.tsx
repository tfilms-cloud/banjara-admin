"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@/lib/live-query";
import {
  ArrowLeft,
  BusFront,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  Hotel,
  Info,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MessageCircle,
  MessagesSquare,
  MoreVertical,
  Mountain,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { HomeDialog, HomeState } from "@/components/site/home/home-primitives";
import { useCustomerChat } from "@/hooks/use-customer-chat";
import {
  CHAT_FILTERS,
  chatDay,
  chatTime,
  filterConversations,
  safeChatUrl,
  validateChatMessage,
} from "@/lib/customer-chat";
import {
  bookingDate,
  bookingStatusLabel,
  bookingTab,
  bookingTime,
  canDownloadPass,
} from "@/lib/booking-itineraries";
import {
  getBookingItineraries,
  getItineraryPass,
} from "@/services/customer/itinerary.service";
import { uploadChatPhoto } from "@/services/customer/message.service";
import type {
  ChatConversation,
  ChatFilter,
  ChatMessage,
} from "@/types/customer/chat";
import type { ItineraryBooking } from "@/types/customer/itinerary-booking";
import styles from "./messages.module.css";

const validId = (value: string | null) =>
  value && /^[a-f\d]{24}$/i.test(value) ? value : "";
function Avatar({
  name,
  src,
  kind,
  small = false,
}: {
  name: string;
  src?: string;
  kind?: string;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const Icon =
    kind === "transport"
      ? BusFront
      : kind === "hotel"
        ? Hotel
        : kind === "tour"
          ? Mountain
          : UserRound;
  return (
    <span
      className={`${styles.avatar} ${small ? styles.smallAvatar : ""}`}
      aria-hidden="true"
    >
      {safeChatUrl(src) && !failed ? (
        <img src={safeChatUrl(src)} alt="" onError={() => setFailed(true)} />
      ) : kind ? (
        <Icon size={small ? 16 : 23} />
      ) : (
        <span>
          {name
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0])
            .join("")
            .toUpperCase()}
        </span>
      )}
    </span>
  );
}
function bookingLink(booking: ItineraryBooking) {
  return `/account/bookings?status=${bookingTab(booking.status)}&q=${encodeURIComponent(booking.code)}`;
}

export function WebsiteMessages() {
  const auth = useCustomerAuth();
  return (
    <section className={styles.page}>
      <div className={styles.container}>
        {auth.loading ? (
          <HomeState
            title="Loading your messages…"
            description="Restoring your customer session."
            loading
          />
        ) : !auth.isAuthenticated ? (
          <div className={styles.guest}>
            <MessagesSquare size={35} />
            <h1>Your travel conversations</h1>
            <p>
              Sign in to message your providers and keep booking arrangements
              together.
            </p>
            <Link
              className={styles.primary}
              href="/account?auth=signin&next=%2Faccount%2Fmessages"
            >
              Sign in to view messages
            </Link>
          </div>
        ) : (
          <MessagesWorkspace key={auth.user!.id} ownerId={auth.user!.id} />
        )}
      </div>
    </section>
  );
}
function MessagesWorkspace({ ownerId }: { ownerId: string }) {
  const params = useSearchParams(),
    router = useRouter();
  const candidate = validId(params.get("with"));
  const peerId = candidate !== ownerId ? candidate : "";
  const conversationId = peerId ? [ownerId, peerId].sort().join(":") : "";
  const chat = useCustomerChat(ownerId, peerId, conversationId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [newChat, setNewChat] = useState(false);
  const bookingsQuery = useQuery({
    queryKey: ["customer", "itineraries", ownerId],
    queryFn: getBookingItineraries,
    staleTime: 20000,
  });
  const bookings = bookingsQuery.data ?? [];
  const threads = chat.inbox.data ?? [];
  const selected = threads.find((c) => c.otherUserId === peerId);
  const requestedBooking = bookings.find(
    (b) => b.id === params.get("booking") && b.providerUserId === peerId,
  );
  const context =
    requestedBooking ??
    bookings.find(
      (b) => b.id === selected?.bookingId && b.providerUserId === peerId,
    ) ??
    bookings.find((b) => b.providerUserId === peerId);
  const selectedThread: ChatConversation | undefined =
    selected ??
    (peerId
      ? {
          id: peerId,
          otherUserId: peerId,
          conversationId,
          name: context?.providerName || "Conversation",
          role: "provider",
          avatar: "",
          lastMessage: "",
          bookingId: context?.id || "",
          unread: 0,
          updatedAt: "",
        }
      : undefined);
  const guideIds = new Set(
    bookings.filter((b) => b.kind === "guide").map((b) => b.providerUserId),
  );
  const labels = Object.fromEntries(
    bookings.map((b) => [b.id, [b.code, b.from, b.to, b.title].join(" ")]),
  );
  const filtered = filterConversations(
    threads,
    filter,
    search,
    guideIds,
    labels,
  );
  const unread = threads.reduce((sum, c) => sum + c.unread, 0);
  const open = (id: string, bookingId?: string) => {
    const next = new URLSearchParams({ with: id });
    if (bookingId) next.set("booking", bookingId);
    router.replace(`/account/messages?${next}`, { scroll: false });
    setNewChat(false);
  };
  const providers = [
    ...new Map(
      bookings
        .filter((b) => b.providerUserId && b.providerUserId !== ownerId)
        .map((b) => [b.providerUserId, b]),
    ).values(),
  ];
  return (
    <>
      <div className={styles.breadcrumb}>
        <span>
          <MessagesSquare size={16} /> Messages Hub
        </span>
        <i>/</i>
        <span>Travel plans & direct conversations</span>
        <span className={styles.connection}>
          <b /> {chat.connection}
        </span>
      </div>
      <div className={`${styles.workspace} ${peerId ? styles.hasChat : ""}`}>
        <aside className={styles.inbox} aria-label="Conversations">
          <div className={styles.inboxHeading}>
            <h1>Messages {unread > 0 && <span>{unread} new</span>}</h1>
            <button
              className={styles.iconButton}
              onClick={() => setNewChat(true)}
              aria-label="Start a conversation"
            >
              <Plus size={20} />
            </button>
          </div>
          <p className={styles.intro}>
            Your rides, stays & mountain adventures.
            <br />
            Keep every detail in one place.
          </p>
          <label className={styles.search}>
            <Search size={17} />
            <input
              aria-label="Search conversations"
              placeholder="Search chats, bookings, or guides…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className={styles.filters} aria-label="Conversation filters">
            {CHAT_FILTERS.map((item) => (
              <button
                key={item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {item.id === "all"
                  ? ` (${threads.length})`
                  : item.id === "unread"
                    ? ` (${threads.filter((t) => t.unread > 0).length})`
                    : ""}
              </button>
            ))}
          </div>
          <div className={styles.conversations}>
            {chat.inbox.isPending ? (
              <HomeState
                title="Loading conversations…"
                description="Fetching your latest messages."
                loading
              />
            ) : chat.inbox.isError ? (
              <HomeState
                title="Could not load conversations"
                description={chat.inbox.error.message}
                retry={() => void chat.inbox.refetch()}
              />
            ) : filtered.length ? (
              filtered.map((thread) => {
                const booking = bookings.find(
                  (b) =>
                    b.id === thread.bookingId &&
                    b.providerUserId === thread.otherUserId,
                );
                return (
                  <button
                    className={styles.conversation}
                    aria-current={
                      thread.otherUserId === peerId ? "true" : undefined
                    }
                    key={thread.id}
                    onClick={() => open(thread.otherUserId, thread.bookingId)}
                    aria-label={`Open conversation with ${thread.name}`}
                  >
                    <Avatar
                      name={thread.name}
                      src={thread.avatar}
                      kind={booking?.kind}
                    />
                    <span className={styles.conversationCopy}>
                      <span className={styles.conversationTitle}>
                        <strong>{thread.name}</strong>
                        <time>
                          {chatDay(thread.updatedAt) ===
                          chatDay(new Date().toISOString())
                            ? chatTime(thread.updatedAt)
                            : chatDay(thread.updatedAt)}
                        </time>
                      </span>
                      <span className={styles.bookingTag}>
                        {booking
                          ? `${booking.code} · ${booking.from && booking.to ? `${booking.from} → ${booking.to}` : booking.subtitle || booking.title}`
                          : thread.role === "provider"
                            ? "Service provider"
                            : "Fellow traveler"}
                      </span>
                      <span className={styles.preview}>
                        {thread.lastMessage || "Start planning your journey"}
                      </span>
                    </span>
                    {thread.unread > 0 && (
                      <span className={styles.unread}>{thread.unread}</span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className={styles.inboxEmpty}>
                <MessageCircle size={26} />
                <h2>
                  {search || filter !== "all"
                    ? "No matching conversations"
                    : "Start a conversation"}
                </h2>
                <p>
                  {search || filter !== "all"
                    ? "Try another name, booking, or filter."
                    : "Message a provider from your bookings to arrange your trip."}
                </p>
                <button
                  className={styles.softButton}
                  onClick={() =>
                    search || filter !== "all"
                      ? (setSearch(""), setFilter("all"))
                      : setNewChat(true)
                  }
                >
                  {search || filter !== "all"
                    ? "Clear filters"
                    : "Message a provider"}
                </button>
              </div>
            )}
          </div>
          <div className={styles.inboxNote}>
            <LockKeyhole size={21} />
            <div>
              <strong>Keep your journey connected</strong>
              <p>
                Use your booking reference when confirming pickup, check-in, and
                meeting details.
              </p>
            </div>
          </div>
        </aside>
        {selectedThread ? (
          <ChatPanel
            key={`${ownerId}:${peerId}`}
            ownerId={ownerId}
            thread={selectedThread}
            booking={context}
            chat={chat}
            onBack={() =>
              router.replace("/account/messages", { scroll: false })
            }
          />
        ) : (
          <div className={styles.selectChat}>
            <span>
              <MessagesSquare size={34} />
            </span>
            <h2>Every journey starts with a conversation</h2>
            <p>
              Choose a chat or connect with a booked provider.
              <br />
              Your travel details stay close at hand.
            </p>
            <button className={styles.primary} onClick={() => setNewChat(true)}>
              <Plus size={16} /> Start a conversation
            </button>
            <Link href="/account/bookings">View my bookings</Link>
          </div>
        )}
      </div>
      <div className={styles.pageFoot}>
        <ShieldCheck size={15} />
        <span>
          Messages sync with your BANJARA account. Review important arrangements
          with your provider before traveling.
        </span>
        <button
          onClick={() => {
            void chat.inbox.refetch();
            if (peerId) void chat.history.refetch();
          }}
        >
          <RefreshCw size={14} /> Refresh messages
        </button>
      </div>
      {newChat && (
        <HomeDialog
          title="Message a provider"
          onClose={() => setNewChat(false)}
        >
          <p className={styles.dialogIntro}>
            Choose a provider from your bookings. Opening a chat does not send a
            message.
          </p>
          {bookingsQuery.isPending ? (
            <HomeState
              title="Finding your providers…"
              description="Loading booking contacts."
              loading
            />
          ) : bookingsQuery.isError ? (
            <HomeState
              title="Could not load booking contacts"
              description={bookingsQuery.error.message}
              retry={() => void bookingsQuery.refetch()}
            />
          ) : providers.length ? (
            <div className={styles.providerList}>
              {providers.map((b) => (
                <button
                  key={b.providerUserId}
                  onClick={() => open(b.providerUserId, b.id)}
                >
                  <Avatar name={b.providerName || b.title} kind={b.kind} />
                  <span>
                    <strong>{b.providerName || b.title}</strong>
                    <small>
                      {b.code} · {bookingDate(b.date)}
                    </small>
                  </span>
                  <MessageCircle size={20} />
                </button>
              ))}
            </div>
          ) : (
            <HomeState
              title="No booking contacts yet"
              description="Book a ride, stay, tour, or guide to connect with your provider here."
            />
          )}
          <Link className={styles.softButton} href="/account/bookings">
            View my bookings
          </Link>
        </HomeDialog>
      )}
    </>
  );
}
type ChatState = ReturnType<typeof useCustomerChat>;
function ChatPanel({
  ownerId,
  thread,
  booking,
  chat,
  onBack,
}: {
  ownerId: string;
  thread: ChatConversation;
  booking?: ItineraryBooking;
  chat: ChatState;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [info, setInfo] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const photoInput = useRef<HTMLInputElement>(null),
    cameraInput = useRef<HTMLInputElement>(null),
    draftInput = useRef<HTMLTextAreaElement>(null);
  const keepBottom = useRef(true);
  const uploadedPhoto = useRef<{ file: File; url: string } | null>(null);
  const lastId = chat.messages.at(-1)?.id;
  useEffect(() => {
    if (keepBottom.current && scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [lastId, chat.typing]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const pending = uploading || chat.send.isPending;
  const passQuery = useQuery({
    queryKey: ["customer", "booking-pass", ownerId, booking?.id],
    queryFn: () => getItineraryPass(booking!.id),
    enabled: passOpen && !!booking && canDownloadPass(booking),
    retry: false,
    staleTime: 0,
  });
  const chooseFile = (picked: File | undefined) => {
    if (!picked) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        picked.type,
      ) ||
      picked.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPEG, PNG, WebP or GIF photo smaller than 5 MB.");
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setError("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const validation = validateChatMessage(
      file ? draft.trim() || "Photo" : draft,
    );
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    try {
      let attachment: string | undefined;
      if (file) {
        setUploading(true);
        attachment =
          uploadedPhoto.current?.file === file
            ? uploadedPhoto.current.url
            : (await uploadChatPhoto(file)).url;
        if (!safeChatUrl(attachment))
          throw new Error(
            "Photo upload did not return a valid image. Please try again.",
          );
        uploadedPhoto.current = { file, url: attachment };
      }
      await chat.send.mutateAsync({
        receiverId: thread.otherUserId,
        message: draft.trim() || (file ? "Photo" : ""),
        ...(booking ? { bookingId: booking.id } : {}),
        ...(attachment
          ? { type: "image", attachments: [attachment] }
          : { type: "text" }),
      });
      keepBottom.current = true;
      setDraft("");
      setFile(null);
      setPreview("");
      draftInput.current?.focus();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not send this message.",
      );
    } finally {
      setUploading(false);
    }
  };
  const quick = (value: string) => {
    setDraft(value);
    draftInput.current?.focus();
  };
  return (
    <div className={styles.chatPanel}>
      <header className={styles.chatHeader}>
        <button
          className={`${styles.iconButton} ${styles.back}`}
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} />
        </button>
        <div className={styles.selectedAvatar}>
          <Avatar name={thread.name} src={thread.avatar} kind={booking?.kind} />
          {chat.presence?.online && <b />}
        </div>
        <div className={styles.chatHeading}>
          <h2>
            {thread.name}
            {booking && (
              <span>
                {booking.kind === "guide" ? "Your guide" : "Booked provider"}
              </span>
            )}
          </h2>
          <p>
            {chat.typing ? (
              <strong>Typing…</strong>
            ) : chat.presence ? (
              <span className={chat.presence.online ? styles.online : ""}>
                {chat.presence.online
                  ? "● Online"
                  : chat.presence.lastSeenAt
                    ? `Last seen ${chatDay(chat.presence.lastSeenAt)} · ${chatTime(chat.presence.lastSeenAt)}`
                    : "Offline"}
              </span>
            ) : (
              <span>Direct conversation</span>
            )}
            {booking?.vehicle && (
              <span className={styles.headerVehicle}> · {booking.vehicle}</span>
            )}
          </p>
        </div>
        <div className={styles.chatActions}>
          {booking?.providerPhone && (
            <a
              className={styles.softButton}
              href={`tel:${booking.providerPhone}`}
            >
              <Phone size={15} /> <span>Call provider</span>
            </a>
          )}
          <button className={styles.softButton} onClick={() => setInfo(true)}>
            <Info size={16} />
            <span>Provider info</span>
          </button>
          <button
            className={styles.iconButton}
            onClick={() => setInfo(true)}
            aria-label="Conversation details"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </header>
      {booking && (
        <div className={styles.context}>
          <div>
            <MapPin size={16} />
            <strong>
              {booking.from && booking.to
                ? `${booking.from} → ${booking.to}`
                : booking.title}
            </strong>
            <i>•</i>
            <span>
              {bookingDate(booking.date)}
              {booking.time ? ` · ${bookingTime(booking.time)}` : ""}
            </span>
            {booking.seats.length > 0 && (
              <span className={styles.contextChip}>
                Seats {booking.seats.join(", ")}
              </span>
            )}
            <Link href={bookingLink(booking)}>#{booking.code}</Link>
          </div>
          <div>
            <span className={styles.contextChip}>
              <ShieldCheck size={13} />
              {bookingStatusLabel(booking.status)}
            </span>
            {canDownloadPass(booking) ? (
              <button
                className={styles.ticketButton}
                onClick={() => setPassOpen(true)}
              >
                <Ticket size={13} /> View{" "}
                {booking.kind === "hotel" ? "voucher" : "ticket"}
              </button>
            ) : (
              <Link className={styles.ticketButton} href={bookingLink(booking)}>
                <FileText size={13} /> View booking
              </Link>
            )}
          </div>
        </div>
      )}
      <div
        className={styles.messageHistory}
        ref={scroller}
        onScroll={() => {
          const el = scroller.current;
          if (el)
            keepBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        }}
        aria-label={`Messages with ${thread.name}`}
        tabIndex={0}
      >
        {chat.history.hasNextPage && (
          <button
            className={styles.loadEarlier}
            disabled={chat.history.isFetchingNextPage}
            onClick={() => {
              keepBottom.current = false;
              void chat.history.fetchNextPage();
            }}
          >
            {chat.history.isFetchingNextPage
              ? "Loading…"
              : "Load earlier messages"}
            <ChevronDown size={14} />
          </button>
        )}
        {chat.history.isPending ? (
          <HomeState
            title="Loading this conversation…"
            description="Fetching your latest messages."
            loading
          />
        ) : chat.history.isError ? (
          <HomeState
            title="Could not load messages"
            description={chat.history.error.message}
            retry={() => void chat.history.refetch()}
          />
        ) : !chat.messages.length ? (
          <div className={styles.chatEmpty}>
            <MessageCircle size={28} />
            <h3>Say hello to {thread.name}</h3>
            <p>
              Ask about pickup, availability, or your booking.
              <br />
              Your message will appear here after you send it.
            </p>
          </div>
        ) : (
          chat.messages.map((message, index) => {
            const day = chatDay(message.createdAt),
              previous = chat.messages[index - 1];
            return (
              <div key={message.id}>
                {(!previous || chatDay(previous.createdAt) !== day) && (
                  <div className={styles.dateDivider}>
                    <span>{day}</span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  mine={message.senderId === ownerId}
                  name={message.senderId === ownerId ? "You" : thread.name}
                  avatar={thread.avatar}
                  kind={booking?.kind}
                />
              </div>
            );
          })
        )}
        {chat.typing && (
          <p className={styles.typing} role="status">
            {thread.name} is typing…
          </p>
        )}
      </div>
      <div className={styles.composerArea}>
        <div className={styles.quick}>
          <span>QUICK:</span>
          {[
            "Please confirm the pickup point.",
            "What time should I arrive?",
            "Is there anything I should bring?",
          ].map((value, index) => (
            <button key={value} onClick={() => quick(value)} disabled={pending}>
              {
                ["Confirm pickup 📍", "Arrival time 🕘", "What to bring? 🎒"][
                  index
                ]
              }
            </button>
          ))}
        </div>
        {file && (
          <div className={styles.photoPreview}>
            {preview && <img src={preview} alt="Photo ready to send" />}
            <span>
              {file.name}
              <small>Sent only when you press Send</small>
            </span>
            <button
              className={styles.iconButton}
              onClick={() => {
                setFile(null);
                setPreview("");
              }}
              disabled={pending}
              aria-label="Remove selected photo"
            >
              <X size={17} />
            </button>
          </div>
        )}
        <form className={styles.composer} onSubmit={submit}>
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => {
              chooseFile(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              chooseFile(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            className={styles.iconButton}
            disabled={pending}
            onClick={() => photoInput.current?.click()}
            aria-label="Attach a photo"
          >
            <Plus size={21} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            disabled={pending}
            onClick={() => cameraInput.current?.click()}
            aria-label="Take or choose a photo"
          >
            <Camera size={20} />
          </button>
          <textarea
            ref={draftInput}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              chat.onTyping();
            }}
            onBlur={chat.stopTyping}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            aria-label={`Message ${thread.name}`}
            placeholder="Type a message…"
            maxLength={4000}
            rows={1}
            disabled={pending}
          />
          <button
            className={styles.primary}
            type="submit"
            aria-label="Send message"
            disabled={pending || (!draft.trim() && !file)}
          >
            {pending ? (
              <LoaderCircle size={16} className={styles.spin} />
            ) : (
              <>
                <span>Send</span>
                <Send size={16} />
              </>
            )}
          </button>
        </form>
        {error && (
          <div className={styles.sendError} role="alert">
            {error}
            <button onClick={() => void chat.history.refetch()}>
              Refresh conversation
            </button>
          </div>
        )}
        <div className={styles.composerNote}>
          <span>
            <ShieldCheck size={13} /> Confirm travel arrangements with your
            provider.
          </span>
          <span>Enter to send · Shift + Enter for a new line</span>
        </div>
      </div>
      {info && (
        <HomeDialog title="Conversation details" onClose={() => setInfo(false)}>
          <div className={styles.infoDetails}>
            <Avatar
              name={thread.name}
              src={thread.avatar}
              kind={booking?.kind}
            />
            <h3>{thread.name}</h3>
            <p>
              {booking
                ? `${bookingStatusLabel(booking.status)} · ${booking.code}`
                : "Your direct BANJARA conversation"}
            </p>
            {booking?.vehicle && <p>{booking.vehicle}</p>}
            {booking?.pickup && (
              <p>
                <MapPin size={16} /> {booking.pickup}
              </p>
            )}
            <div>
              {booking?.providerPhone && (
                <a
                  className={styles.softButton}
                  href={`tel:${booking.providerPhone}`}
                >
                  <Phone size={15} /> Call provider
                </a>
              )}
              {booking?.providerEmail && (
                <a
                  className={styles.softButton}
                  href={`mailto:${booking.providerEmail}`}
                >
                  Email provider
                </a>
              )}
              {booking && (
                <Link className={styles.primary} href={bookingLink(booking)}>
                  View booking
                </Link>
              )}
            </div>
            <button
              className={styles.softButton}
              onClick={() => {
                void chat.history.refetch();
                toast.success("Refreshing conversation");
              }}
            >
              <RefreshCw size={15} /> Refresh messages
            </button>
          </div>
        </HomeDialog>
      )}
      {passOpen && booking && (
        <HomeDialog
          title={
            booking.kind === "hotel" ? "Booking voucher" : "Booking ticket"
          }
          onClose={() => setPassOpen(false)}
        >
          {passQuery.isPending ? (
            <HomeState
              title="Loading your pass…"
              description="Retrieving your issued booking pass."
              loading
            />
          ) : passQuery.isError ? (
            <HomeState
              title="Could not load your pass"
              description={passQuery.error.message}
              retry={() => void passQuery.refetch()}
            />
          ) : (
            <div className={styles.pass}>
              <h3>{booking.title}</h3>
              <p>
                {booking.code} · {bookingDate(booking.date)}
              </p>
              {passQuery.data?.qrCode &&
                /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(
                  passQuery.data.qrCode,
                ) && (
                  <img
                    src={passQuery.data.qrCode}
                    alt="Server-issued booking QR code"
                  />
                )}
              <Link className={styles.primary} href={bookingLink(booking)}>
                Open booking & downloads
              </Link>
            </div>
          )}
        </HomeDialog>
      )}
    </div>
  );
}
function MessageBubble({
  message,
  mine,
  name,
  avatar,
  kind,
}: {
  message: ChatMessage;
  mine: boolean;
  name: string;
  avatar: string;
  kind?: string;
}) {
  return (
    <article
      className={`${styles.messageRow} ${mine ? styles.mine : ""}`}
      aria-label={`${name}, ${chatTime(message.createdAt)}`}
    >
      {!mine && <Avatar name={name} src={avatar} kind={kind} small />}
      <div className={styles.messageBody}>
        <div className={styles.messageMeta}>
          <strong>{name}</strong>
          <time dateTime={message.createdAt}>
            {chatTime(message.createdAt)}
          </time>
          {mine && (
            <span aria-label={message.status}>
              {message.status === "read" || message.status === "delivered" ? (
                <CheckCheck size={14} />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
        </div>
        <div className={styles.bubble}>
          {message.text &&
            !(message.type === "image" && message.text === "Photo") && (
              <p>{message.text}</p>
            )}
          {message.attachments.map((url, index) =>
            message.type === "image" ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                key={`${url}:${index}`}
              >
                <img src={url} alt={`Photo from ${name}`} loading="lazy" />
              </a>
            ) : (
              <a
                className={styles.attachment}
                href={url}
                target="_blank"
                rel="noreferrer"
                key={`${url}:${index}`}
              >
                <FileText size={18} /> Open attachment {index + 1}
              </a>
            ),
          )}
        </div>
      </div>
    </article>
  );
}
