# Website Messages & Direct Chat

Route: `/account/messages`. Design: [Figma 88:2133](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=88-2133).

This screen adapts the approved Messages & Direct Chat frame to real customer conversations. It keeps the original BANJARA logo, shared navigation/footer and white outer page background. Names, booking references, route details, photos, unread counts, receipt states and presence come from the existing mobile backend.

## UI alignment

- The page uses a 1280px maximum-width container with 32px desktop gutters. A breadcrumb and connection badge sit above a rounded, bordered workspace.
- Desktop layout has a 380px conversation list and a flexible chat column. The list contains its heading/new-chat action, search, All/Unread/Providers/Guides filters, independently scrolling conversations, and a booking reference note.
- The chat column places the counterpart's identity, presence and contact controls first. A pale booking strip shows the actual route/property, date, seats, status and booking/ticket link. It appears only when the selected counterpart is associated with that customer's booking.
- Message history scrolls separately from the composer. Date separators use Pakistan time. Incoming messages have white bubbles; outgoing messages use pale aqua and receipt icons. API photos stay in their message bubble; no Figma sample vehicle photograph is inserted into real conversations.
- The composer contains photo selection, camera/file selection, draft text, Send and draft-only quick replies. Photo previews appear before upload. Multiline drafts grow within a capped height. Enter sends; Shift+Enter inserts a newline; IME composition is respected.
- Below 1150px the list narrows and contact controls become compact. Below 800px the page shows either the list or selected chat with a Back button. Controls wrap, long provider names break safely, and the page remains within phone width.

## Components and data

`WebsiteMessages` gates customer authentication. `MessagesWorkspace` owns conversation selection, filters and new-chat contacts. `ChatPanel`, `MessageBubble` and `Avatar` render the shared conversation structure. Existing `HomeDialog` and `HomeState` handle focus-managed dialogs and loading/error/empty states. Presentation is scoped in `messages.module.css`.

`useCustomerChat` owns the authenticated Socket.IO connection, owner-scoped TanStack queries, message pagination, receipts, typing and presence. `customer-chat.ts` maps server records, combines filters, merges overlapping history pages and validates messages/media URLs. The shared itinerary model includes the provider's user ID for direct messaging; a provider profile ID is never used as a recipient user ID.

| Interaction       | Existing mobile API / event                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Conversation list | `GET /messages`                                                                             |
| History           | `GET /messages?withUserId=…&page=…&limit=40`; Load earlier messages fetches older pages     |
| Send              | Socket.IO `sendMessage` with server acknowledgment; disconnected mode uses `POST /messages` |
| Read receipts     | `POST /messages/read`, plus `messageRead` event for the displayed conversation              |
| Live updates      | `new_message`, `conversation_updated`, `message_read`, `message_delivered`                  |
| Typing            | `typing`, `stopTyping`, `user_typing`, `user_stopped_typing`                                |
| Presence          | `getPresence`, `user_status_changed`; selected counterpart is refreshed every 15 seconds    |
| Photo             | Existing `POST /uploads`, multipart `folder=chat`; JPEG/PNG/WebP/GIF up to 5 MB             |
| Booking context   | Existing owner-scoped itinerary queries and published provider contacts                     |
| Issued pass       | `GET /bookings/:id/ticket` for confirmed/completed bookings                                 |

REST queries also refresh every 15 seconds to recover missed events. Socket authentication reads the current customer token. Authentication rejection retries after REST session renewal; disconnect/unmount removes listeners and leaves the conversation. Queries include the owner ID, and changing the customer remounts the workspace to clear local drafts and previews.

The inbox is bounded by the existing backend to 100 conversations from its most recent 1000 messages. Guides filtering identifies counterparts through the customer's guide bookings; the API's generic provider role alone does not claim a guide specialty. Search includes provider/name, message preview and known booking references/routes.

## Actions and limits

- Header navigation, the account page and booking contact dialogs link to Messages. Selected user and optional booking IDs persist in `with` and `booking` URL parameters. Opening a booked provider's empty chat creates no message until Send is pressed.
- Quick replies populate the draft only. Photo selection creates a local preview; upload happens on Send. Uploaded URLs are retained for a retry of the same selected photo. Failed or uncertain sends retain the draft and show a refresh action. No automatic resend occurs after acknowledgment timeout, avoiding duplicate delivery.
- History preserves scroll position when older messages load and follows new messages only while the customer is near the bottom. Displayed incoming messages are marked read only while the document is visible. Inactive and guest accounts do not keep a chat socket running.
- Attachments and avatars accept HTTP/HTTPS URLs only. Message text is rendered as text, never injected HTML. Booking QR codes accept server-issued PNG data URLs only.
- Published phone/email links are available in provider details. No voice recording, live customer location sharing, driver identity feed, VHF dispatch, fabricated support number, escrow guarantee or offline chat archive is claimed. These Figma sample concepts require separate backend capabilities. The shared footer retains the website's existing factual navigation.
- Photo sending requires the existing upload service to be configured. The composer reports upload errors without sending an incomplete message.

## Verification

The connector account could not access this file. The authorized signed-in browser supplied the selected 1280×1190 frame's PNG reference. Its temporary export setting was removed afterward. The render is a visual reference only; all conversation media slots are dynamic API content, with existing Lucide icons and the original app logo.

- Six focused chat tests cover combined filters, sender/receipt mapping, deduplication, safe attachment links, Pakistan date boundaries and message limits. Together with existing booking/hotel/explore/home tests: 35 passing.
- `npm run typecheck`, targeted ESLint for the new/changed chat components, helpers, service, hook and page, and `npm run build`.
- Signed-in browser checks: real Travel history, connection/presence, booking context, provider details, search/no-match, Guides/Unread filtering, draft quick replies, local photo preview/removal, starting an empty chat from an actual booking and mobile Back navigation. Widths from 320px to 1920px were checked for horizontal overflow.
- No messages were sent and no customer photos uploaded during QA. Two-party send/receive, incoming typing/receipt transitions and actual media delivery remain dependent on a second active account and configured upload storage.

The pre-existing legacy menu-close effect in `site-header.tsx` triggers `react-hooks/set-state-in-effect` when linting that entire file. This task only adds the Messages route to the shared-header condition and preserves the unrelated effect.
