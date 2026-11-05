"use client";
/* eslint-disable @next/next/no-img-element -- chat photos are signed storage links */

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCheck,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  MessageSquare,
  Phone,
  Search,
  SendHorizontal,
  X,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useCustomerChat } from "@/hooks/use-customer-chat";
import { useQuery } from "@/lib/live-query";
import {
  chatDay,
  chatTime,
  safeChatUrl,
  validateChatMessage,
} from "@/lib/customer-chat";
import { uploadChatPhoto } from "@/services/customer/message.service";
import {
  getProviderBookingDetails,
  type BookingDetail,
} from "@/services/customer/provider-dashboard.service";
import type { ChatConversation, ChatMessage } from "@/types/customer/chat";
import { bookingStatus, tripWhen } from "../bookings/booking-format";
import m from "./messages.module.css";

const validId = (value: string | null) =>
  value && /^[a-f\d]{24}$/i.test(value) ? value : "";
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** Same idea as the app's quick replies, worded for drivers. */
const QUICK_REPLIES = [
  "I'm on my way.",
  "I've reached the pickup point.",
  "Running about 10 minutes late.",
  "Please share your exact pickup location.",
  "See you at departure time.",
];

/** /provider/messages — the driver's inbox, like the app's Messages screen. */
export function MessagesPage() {
  return (
    <Suspense fallback={<p className={m.loading}>Loading messages…</p>}>
      <Workspace />
    </Suspense>
  );
}

function Workspace() {
  const { user } = useCustomerAuth();
  const ownerId = user?.id ?? "";
  const params = useSearchParams();
  const router = useRouter();
  const candidate = validId(params.get("with"));
  const peerId = candidate !== ownerId ? candidate : "";
  const conversationId =
    peerId && ownerId ? [ownerId, peerId].sort().join(":") : "";
  const chat = useCustomerChat(ownerId || undefined, peerId, conversationId);
  const bookingsQuery = useQuery({
    queryKey: ["provider", "booking-details"],
    queryFn: () => getProviderBookingDetails(100),
  });
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const bookings = useMemo(
    () => bookingsQuery.data ?? [],
    [bookingsQuery.data],
  );
  const threads = useMemo(() => chat.inbox.data ?? [], [chat.inbox.data]);

  /** The booking a conversation is about: the one asked for, the one it was started from, else their latest. */
  const bookingFor = (customerId: string, preferred?: string) => {
    const theirs = bookings.filter((b) => b.customerId === customerId);
    return (
      theirs.find((b) => b.id === preferred) ??
      theirs.find((b) => ["pending", "confirmed"].includes(b.status)) ??
      theirs[0]
    );
  };

  const selected = threads.find((t) => t.otherUserId === peerId);
  const context = peerId
    ? bookingFor(peerId, params.get("booking") || selected?.bookingId)
    : undefined;
  const thread: ChatConversation | undefined =
    selected ??
    (peerId
      ? {
          id: peerId,
          otherUserId: peerId,
          conversationId,
          name: context?.customerName || "Traveller",
          role: "customer",
          avatar: "",
          lastMessage: "",
          bookingId: context?.id ?? "",
          unread: 0,
          updatedAt: "",
        }
      : undefined);

  const term = search.trim().toLowerCase();
  const shown = threads.filter((t) => {
    if (unreadOnly && !t.unread) return false;
    if (!term) return true;
    const b = bookingFor(t.otherUserId, t.bookingId);
    return [t.name, t.lastMessage, b?.number, b?.route]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
  const unreadTotal = threads.reduce((sum, t) => sum + t.unread, 0);

  // Travellers with an active booking you haven't talked to yet — one tap to start.
  const talked = new Set(threads.map((t) => t.otherUserId));
  const startable = [
    ...new Map(
      bookings
        .filter(
          (b) =>
            b.customerId &&
            !talked.has(b.customerId) &&
            ["pending", "confirmed"].includes(b.status),
        )
        .map((b) => [b.customerId, b]),
    ).values(),
  ].slice(0, 6);

  const open = (userId: string, bookingId?: string) => {
    const next = new URLSearchParams({ with: userId });
    if (bookingId) next.set("booking", bookingId);
    router.replace(`/provider/messages?${next}`, { scroll: false });
  };

  return (
    <div className={`${m.workspace} ${thread ? m.hasThread : ""}`}>
      <aside className={m.inbox} aria-label="Conversations">
        <div className={m.inboxHead}>
          <div>
            <h3>Conversations</h3>
            <p>{chat.connection}</p>
          </div>
          {unreadTotal ? (
            <span className={m.unreadPill}>{unreadTotal} unread</span>
          ) : null}
        </div>
        <label className={m.search}>
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, message or booking"
            aria-label="Search conversations"
          />
        </label>
        <div className={m.filters} role="tablist" aria-label="Filter">
          <button
            type="button"
            role="tab"
            aria-selected={!unreadOnly}
            className={!unreadOnly ? m.filterOn : ""}
            onClick={() => setUnreadOnly(false)}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={unreadOnly}
            className={unreadOnly ? m.filterOn : ""}
            onClick={() => setUnreadOnly(true)}
          >
            Unread
          </button>
        </div>

        <div className={m.threadList}>
          {chat.inbox.isPending ? (
            <p className={m.loading}>
              <LoaderCircle size={15} className="animate-spin" /> Loading
              conversations…
            </p>
          ) : chat.inbox.isError ? (
            <p className={m.error}>
              {chat.inbox.error.message}
              <button type="button" onClick={() => void chat.inbox.refetch()}>
                Try again
              </button>
            </p>
          ) : shown.length ? (
            shown.map((t) => {
              const b = bookingFor(t.otherUserId, t.bookingId);
              return (
                <button
                  key={t.otherUserId}
                  type="button"
                  className={`${m.row} ${t.otherUserId === peerId ? m.rowOn : ""} ${t.unread ? m.rowUnread : ""}`}
                  onClick={() => open(t.otherUserId, t.bookingId || b?.id)}
                  aria-label={`Conversation with ${t.name}${t.unread ? `, ${t.unread} unread` : ""}`}
                >
                  <Avatar name={t.name} src={t.avatar} />
                  <span className={m.rowMain}>
                    <span className={m.rowTop}>
                      <strong>{t.name}</strong>
                      <time>{listTime(t.updatedAt)}</time>
                    </span>
                    <span className={m.rowLast}>
                      {t.lastMessage || "Photo"}
                    </span>
                    {b ? (
                      <span className={m.rowBooking}>
                        <CalendarCheck size={11} /> {b.route} ·{" "}
                        {tripWhen(b.tripDate, b.departureTime)}
                      </span>
                    ) : null}
                  </span>
                  {t.unread ? (
                    <span className={m.badge}>
                      {t.unread > 9 ? "9+" : t.unread}
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className={m.empty}>
              {term || unreadOnly
                ? "No conversations match."
                : "No messages yet. Travellers who book with you can message you here."}
            </p>
          )}

          {startable.length && !term && !unreadOnly ? (
            <div className={m.startable}>
              <h4>Message a traveller</h4>
              {startable.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={m.row}
                  onClick={() => open(b.customerId, b.id)}
                >
                  <Avatar name={b.customerName} />
                  <span className={m.rowMain}>
                    <strong>{b.customerName}</strong>
                    <span className={m.rowBooking}>
                      <CalendarCheck size={11} /> {b.route} ·{" "}
                      {tripWhen(b.tripDate, b.departureTime)}
                    </span>
                  </span>
                  <ChevronRight size={15} className={m.chev} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </aside>

      {thread ? (
        <ChatPanel
          key={thread.otherUserId}
          ownerId={ownerId}
          thread={thread}
          booking={context}
          chat={chat}
          onBack={() => router.replace("/provider/messages", { scroll: false })}
        />
      ) : (
        <section className={m.placeholder}>
          <span className={m.placeholderIcon}>
            <MessageSquare size={26} />
          </span>
          <h3>Your conversations</h3>
          <p>
            Pick a conversation to reply. Talk to travellers about pickup
            points, timing, seats and luggage.
          </p>
        </section>
      )}
    </div>
  );
}

type Chat = ReturnType<typeof useCustomerChat>;

function ChatPanel({
  ownerId,
  thread,
  booking,
  chat,
  onBack,
}: {
  ownerId: string;
  thread: ChatConversation;
  booking?: BookingDetail;
  chat: Chat;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const keepBottom = useRef(true);
  const messages = chat.messages;
  const lastId = messages.at(-1)?.id ?? "";
  const pending = uploading || chat.send.isPending;
  const first = thread.name.split(" ")[0];

  useEffect(() => {
    const el = scroller.current;
    if (el && keepBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastId, chat.typing]);
  useEffect(
    () => () => void (preview && URL.revokeObjectURL(preview)),
    [preview],
  );

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    keepBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (
      el.scrollTop < 40 &&
      chat.history.hasNextPage &&
      !chat.history.isFetchingNextPage
    ) {
      const before = el.scrollHeight;
      void chat.history.fetchNextPage().then(() => {
        requestAnimationFrame(() => {
          if (scroller.current)
            scroller.current.scrollTop +=
              scroller.current.scrollHeight - before;
        });
      });
    }
  };

  const choose = (picked?: File) => {
    if (!picked) return;
    if (!PHOTO_TYPES.includes(picked.type) || picked.size > 5 * 1024 * 1024) {
      setError("Choose a JPEG, PNG, WebP or GIF photo smaller than 5 MB.");
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setError("");
  };

  const send = async (text = draft) => {
    if (pending) return;
    const problem = validateChatMessage(file ? text.trim() || "Photo" : text);
    if (problem) return setError(problem);
    setError("");
    try {
      let attachment = "";
      if (file) {
        setUploading(true);
        attachment = safeChatUrl((await uploadChatPhoto(file)).url);
        if (!attachment)
          throw new Error("The photo didn’t upload. Please try again.");
      }
      await chat.send.mutateAsync({
        receiverId: thread.otherUserId,
        message: text.trim() || "Photo",
        ...(booking ? { bookingId: booking.id } : {}),
        ...(attachment
          ? { type: "image" as const, attachments: [attachment] }
          : { type: "text" as const }),
      });
      keepBottom.current = true;
      setDraft("");
      setFile(null);
      setPreview("");
      input.current?.focus();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Couldn’t send this message.",
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void send();
    }
  };

  const status = chat.typing
    ? `${first} is typing…`
    : chat.presence?.online
      ? "Online"
      : chat.presence?.lastSeenAt
        ? `Last seen ${chatDay(chat.presence.lastSeenAt)}, ${chatTime(chat.presence.lastSeenAt)}`
        : "Traveller";
  const bStatus = booking ? bookingStatus(booking.status) : null;

  return (
    <section className={m.panel} aria-label={`Chat with ${thread.name}`}>
      <header className={m.panelHead}>
        <button
          type="button"
          className={m.back}
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft size={17} />
        </button>
        <Avatar
          name={thread.name}
          src={thread.avatar}
          online={chat.presence?.online}
        />
        <div className={m.panelTitle}>
          <h3>{thread.name}</h3>
          <p
            className={
              chat.typing || chat.presence?.online ? m.live : undefined
            }
          >
            {status}
          </p>
        </div>
        {booking?.customerPhone ? (
          <a href={`tel:${booking.customerPhone}`} className={m.headBtn}>
            <Phone size={14} /> Call
          </a>
        ) : null}
      </header>

      {booking ? (
        <Link
          href={`/provider/bookings/${booking.id}`}
          className={m.bookingBanner}
        >
          <CalendarCheck size={16} />
          <span>
            <strong>{booking.route || "Booking"}</strong>
            <small>
              #{booking.number} ·{" "}
              {tripWhen(booking.tripDate, booking.departureTime)}
              {booking.seats.length
                ? ` · Seat ${booking.seats.join(", ")}`
                : ""}
              {booking.pickup ? ` · Pickup ${booking.pickup}` : ""}
            </small>
          </span>
          {bStatus ? (
            <span className={`${m.status} ${m[bStatus.tone] ?? ""}`}>
              {bStatus.label}
            </span>
          ) : null}
          <ChevronRight size={15} />
        </Link>
      ) : null}

      <div
        className={m.messages}
        ref={scroller}
        onScroll={onScroll}
        aria-live="polite"
      >
        {chat.history.isFetchingNextPage ? (
          <p className={m.older}>
            <LoaderCircle size={13} className="animate-spin" /> Loading older
            messages…
          </p>
        ) : null}
        {chat.history.isPending && thread.conversationId ? (
          <p className={m.loading}>
            <LoaderCircle size={15} className="animate-spin" /> Loading
            messages…
          </p>
        ) : chat.history.isError ? (
          <p className={m.error}>{chat.history.error.message}</p>
        ) : messages.length ? (
          messages.map((msg, index) => {
            const day = chatDay(msg.createdAt);
            const showDay =
              index === 0 || chatDay(messages[index - 1].createdAt) !== day;
            return (
              <div key={msg.id}>
                {showDay ? <p className={m.day}>{day}</p> : null}
                <Bubble message={msg} mine={msg.senderId === ownerId} />
              </div>
            );
          })
        ) : (
          <div className={m.startHint}>
            <MessageSquare size={22} />
            <strong>Start the conversation</strong>
            <span>
              Confirm the pickup point, timing and luggage with {first}.
            </span>
          </div>
        )}
        {chat.typing ? (
          <p className={m.typing}>
            <span />
            <span />
            <span />
          </p>
        ) : null}
      </div>

      <div className={m.quick} aria-label="Quick replies">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply}
            type="button"
            onClick={() => void send(reply)}
            disabled={pending}
          >
            {reply}
          </button>
        ))}
      </div>

      {error ? <p className={m.composerError}>{error}</p> : null}
      {preview ? (
        <div className={m.preview}>
          <img src={preview} alt="Photo to send" />
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPreview("");
            }}
            aria-label="Remove photo"
          >
            <X size={13} />
          </button>
        </div>
      ) : null}

      <form className={m.composer} onSubmit={submit}>
        <input
          ref={picker}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          hidden
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className={m.attach}
          onClick={() => picker.current?.click()}
          aria-label="Add a photo"
          disabled={pending}
        >
          <ImagePlus size={18} />
        </button>
        <textarea
          ref={input}
          rows={1}
          value={draft}
          maxLength={4000}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value) chat.onTyping();
            else chat.stopTyping();
          }}
          onBlur={() => chat.stopTyping()}
          onKeyDown={onKey}
          placeholder={`Message ${first}…`}
          aria-label="Message"
        />
        <button
          type="submit"
          className={m.send}
          disabled={pending || (!draft.trim() && !file)}
          aria-label="Send"
        >
          {pending ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <SendHorizontal size={17} />
          )}
        </button>
      </form>
    </section>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const photoOnly = message.type === "image" && message.text === "Photo";
  return (
    <div className={`${m.msg} ${mine ? m.mine : ""}`}>
      <div className={m.bubble}>
        {message.attachments.map((url, i) =>
          message.type === "image" ? (
            <a
              key={`${url}${i}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className={m.photo}
            >
              <img src={url} alt="Photo" loading="lazy" />
            </a>
          ) : (
            <a
              key={`${url}${i}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className={m.file}
            >
              Open attachment {i + 1}
            </a>
          ),
        )}
        {message.text && !photoOnly ? <p>{message.text}</p> : null}
        <span className={m.meta}>
          {chatTime(message.createdAt)}
          {mine ? (
            message.status === "read" ? (
              <CheckCheck size={13} className={m.read} aria-label="Read" />
            ) : message.status === "delivered" ? (
              <CheckCheck size={13} aria-label="Delivered" />
            ) : (
              <Check size={13} aria-label="Sent" />
            )
          ) : null}
        </span>
      </div>
    </div>
  );
}

function Avatar({
  name,
  src,
  online,
}: {
  name: string;
  src?: string;
  online?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const url = safeChatUrl(src);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span className={m.avatar} aria-hidden="true">
      {url && !failed ? (
        <img src={url} alt="" onError={() => setFailed(true)} />
      ) : (
        initials || "T"
      )}
      {online ? <i className={m.dot} /> : null}
    </span>
  );
}

/** "10:42 am" today, "Mon" this week, else "3 Nov". */
function listTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return chatTime(iso);
  if (now.getTime() - date.getTime() < 6 * 86400000)
    return date.toLocaleDateString("en-GB", { weekday: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
