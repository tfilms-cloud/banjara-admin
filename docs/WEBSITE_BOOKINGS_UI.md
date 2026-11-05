# Website Bookings & Itineraries

Route: `/account/bookings`. Design: [Figma 88:2602](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=88-2602).

The screen uses the original BANJARA logo and shared customer header/footer. It adapts the approved desktop layout to the signed-in customer's actual transport, hotel, tour and guide bookings from the existing mobile backend.

## Alignment and reusable components

- A white background surrounds a 1280px maximum-width container with 48px desktop gutters. Breadcrumbs, title and active-journey badge align to the left; the travel-month selector and itinerary export align to the right.
- A rounded white toolbar contains Upcoming, Completed and Cancelled controls alongside booking search. The following row contains service filters and payment/approval/confirmation counts.
- Desktop content uses a 2.1:1 split with a 32px gap. Booking cards occupy the left column; Journey Timeline, Booking Overview and Before You Travel occupy the right.
- `ItineraryBookingCard` renders transport, hotel, tour and guide variants from one shared model. Cards share rounded borders, status badges, factual service details, totals and context-sensitive actions. Transport uses a route capsule; hotels use room imagery and occupancy; tours use expedition dates and published inclusions; guides use their profile and requested service.
- Tablets and phones stack columns, wrap filters and card actions, and keep controls within the viewport. Breakpoints at 1150px, 800px and 520px adjust spacing and layout. CSS is scoped in `bookings.module.css`.
- `WebsiteBookings` owns authentication, queries, URL filters and dialogs. Shared `HomeDialog` and `HomeState` provide accessible dialogs and loading, error and empty states. `booking-itineraries.ts` contains independently testable mapping, filtering, status and offline-export helpers.

## APIs and behavior

| Function                  | Existing API / behavior                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer bookings         | `GET /bookings/my-bookings?page=…&limit=100`; reads all pages so totals include the full account history                                          |
| Published service details | Existing trip/hotel APIs plus `GET /providers/public/:id`, `/rooms/:id` and `/tour-itineraries/:id`; repeated lookups are cached within each load |
| Booking pass              | `GET /bookings/:id/ticket`; available for confirmed/completed bookings only                                                                       |
| Payment details           | `GET /payments/:id`; displays the recorded status, amount, method, transaction reference and payment window                                       |
| Cancellation              | `PUT /bookings/:id/cancel`, only after explicit confirmation in the booking dialog; terminal bookings hide cancellation                           |
| Provider contact          | Published provider phone/email links; no message is sent automatically                                                                            |
| Meeting point             | A directions link based on the actual pickup point or property/meeting address                                                                    |

The unified model preserves `guide` separately and maps the backend's `package` type to Tours & Treks. Missing public service details retain the booking snapshot and show an availability notice instead of invented information. Independent enrichment failures do not hide the customer's booking.

Upcoming includes pending, confirmed, payment-verification and review states. Completed contains completed bookings. Cancelled includes cancelled, refunded and expired bookings, while each card retains its precise status label. Counts come from account data, not the Figma examples. Positive unpaid balances on active bookings supply the payment-due indicator; zero-value and terminal bookings do not.

Filters persist in `status`, `category`, `month` and `q` URL parameters. Service counts reflect the selected status, month and search. Search matches booking codes, providers, routes, locations and seats. Dates sort using Pakistan departure time; unknown dates remain last. Clear filters restores Upcoming with all services and dates.

## Authentication, exports and limits

Bookings, payment and pass queries include the customer ID in their cache keys and run only while authenticated. Guests see a sign-in action that preserves the current route and filters. Booking data refreshes every minute and can also be refreshed manually.

Export Itinerary Dossier downloads the currently visible bookings as a standalone printable HTML document. Download Offline Passes retrieves only eligible visible bookings and embeds their server-issued PNG QR codes; partial download failures are reported. Exported customer/provider text is escaped, with no executable scripts or external assets. Generation time is labeled in PKT and statuses are clearly identified as a snapshot. The downloaded file can be opened without a network connection and printed to PDF by the customer.

The Figma escrow vault and live dispatch concepts are represented by factual payment/booking summaries and provider contacts. This screen does not invent escrow guarantees, GPS feeds, support numbers, payment deadlines or group chats. Payment details are read-only; payment initiation/proof submission and booking modification are outside this screen's current web flow.

## Reference and verification

The Figma connector account could not access this file. The authorized signed-in browser supplied the selected frame's PNG export; its temporary export setting was removed afterward. Icons use the existing Lucide dependency; service media comes from the API rather than sample Figma bookings.

- `node --experimental-strip-types --test tests/booking-itineraries.test.mjs tests/hotel-details.test.mjs tests/explore-catalog.test.mjs tests/explore-destinations.test.mjs tests/home-discovery.test.mjs` — 29 passing tests.
- `npm run typecheck` and targeted ESLint for the new booking page, components, types, service and helpers.
- Browser checks cover the signed-in account's real expired bookings, status/service/month/search filters, empty states, booking/payment dialogs and an actual itinerary download. Widths from 320px to 1920px have no horizontal page overflow. All four booking kinds and status/export rules are covered by synthetic unit fixtures; no bookings were created or cancelled for QA.
- Production build: `npm run build`.

The existing legacy menu-close effect in `src/components/site/site-header.tsx` triggers `react-hooks/set-state-in-effect` when linting that whole file. This task only adds the bookings route to the shared header condition; the unrelated effect is preserved.
