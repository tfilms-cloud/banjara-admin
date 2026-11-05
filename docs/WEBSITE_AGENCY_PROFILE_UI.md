# Website Transport Agency Profile

Route: `/agencies/[id]`. Reference: [Figma 108:3192](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=108-3192).

The screen uses the shared customer header, original BANJARA logo and white
page background. Agency-name links on ride cards and trip details open this
profile. Saved transport providers also link here. Explore stays selected in
the global header while viewing an agency.

## How travelers reach the agency (matched to mobile)

The mobile flow was checked in `Banjara/components/explore/ExploreDiscovery.tsx`,
`ExplorePanels.tsx`, `utils/groupTripsByAgency.ts` and the trip detail screen.
Popular vehicle cards and Top transporters open `/(customer)/agency/[id]`;
the trip-detail provider card opens the same agency. The website now provides
the corresponding flow:

1. Open **Explore → Ride**.
2. Click any **Popular vehicles** card, or an agency in **Top transporters**.
3. The agency profile opens at `/agencies/[providerId]`.
4. Choose a published departure on the profile to continue into the existing
   trip booking flow.

Each vehicle card is one semantic link, so its photo, text and action all open
the same provider without nested interactive controls. Top transporters contains
one clickable card per business, with its published vehicle names, routes,
departure count, rating/verification, one-way/round-trip counts and starting
fares. The shared `TransporterCards` component uses `groupTransportAgencies` to
deduplicate trips and preserve separate currencies and seat/vehicle fare units.
Groups sort by rating, then departure count. They use matching region/search
inventory; vehicle chips filter Popular vehicles, as in mobile Explore.

Homepage ride cards and search results also expose **View agency & all trips**.
The trip-details provider panel is clickable with the same explicit action.
These links do not create bookings or send messages.

Validation: four agency-discovery tests cover grouping, route/count deduplication,
mixed fare units/currencies, unavailable inventory and legacy provider IDs.
The discovery, catalog and profile test suites pass together (16 tests).
Browser checks confirm vehicle-card, transporter-card, homepage and trip-detail
navigation reaches the correct public agency profile.

## Alignment and reusable UI

- A 1280px container with 48px desktop gutters aligns breadcrumbs, agency
  identity and content. The identity row places the provider logo, name and
  verification badge on the left, with save/share/call/message actions on the
  right. Four rounded tiles show rating, upcoming departures, routes and fleet.
- The main layout uses a flexible content column, a 374px reservation column
  and a 32px gap. White bordered panels have 18px corners and 28px padding.
  Inset timetable, terminal, crew and review cards use larger rounded corners.
- Fleet selection sits beside the section heading. A rounded cover image is
  followed by thumbnails and published equipment chips. Selecting a vehicle
  updates its own photo, registration, capacity and features. Clicking an image
  opens the existing focus-managed `HomeDialog` gallery.
- The timetable, pickup points, crew, about/service area and traveler reviews
  stack in the main column. Reservations and carrier contact stay in the
  right column on desktop. Below 850px reservations move above the content;
  below 620px panels and fields use a single column with 20px gutters.
- `Panel`, `Metric`, `Photo`, `Fleet`, `Schedule`, `Reservations`, `Hubs` and
  `Reviews` compose `WebsiteAgency`. CSS is scoped in `agency.module.css`.
  Shared auth, React Query, formatting helpers, dialogs and state components
  are reused rather than adding another page shell.

## Existing mobile APIs

| Function            | Source / behavior                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Agency and fleet    | `GET /providers/public/:id`; public business, transport, fleet and driver fields                           |
| Departures          | `GET /trips/search?providerId=…&page=…&limit=100`; all pages, deduplicated and restricted to this provider |
| Reviews             | `GET /reviews/provider/:id`, filtered to transport reviews                                                 |
| Save agency         | Existing `GET /favorites`, `POST /favorites` with `targetType: provider`, and `DELETE /favorites/:id`      |
| Booking             | Existing `/trips/:id/book` flow for the exact selected departure; seat and vehicle fares remain distinct   |
| Direct message      | Existing `/account/messages?with=:providerUserId`; opening it does not send a message                      |
| Call / maps / share | Published telephone, map search for the published pickup address, copy the profile URL                     |

Reservations filter the provider's upcoming inventory by exact route direction
and departure date. Departure times are interpreted in Pakistan time, regardless
of the visitor's browser timezone. Past, departed, cancelled, completed, invalid
and sold-out departures are excluded. An unavailable date has an explicit empty
state; it does not silently replace the customer's chosen date.

Fleet capacity, photos and amenities are matched by vehicle ID or normalized
registration plate. A different registered primary vehicle does not inherit a
trip vehicle's specifications. Driver portraits are excluded from vehicle
galleries; the logo is not used as a fallback vehicle photo. All photos are
dynamic provider imagery, with a neutral
missing-image state; the Figma reference image is not an implementation asset.

Provider loading/errors, schedule errors and review errors have separate states
and retry actions. Saved favorites use the current customer's query cache and
invalidate the profile's saved-item summary after a successful mutation. Guests
are directed to sign in to save a provider.

## Data differences from the sample

The design's license number, carrier name, fleet photographs, driver biographies,
rating counts, routes, exact fares and testimonials are sample data. The screen
uses the selected provider's actual records. Public reviews do not expose author
names, so reviewer identity is labeled “BANJARA traveler.” Unpublished driver or
terminal details stay absent or show an explanatory state.

The API does not supply live road/pass status, on-time percentages, passenger
totals, accident records, terminal opening hours, medical equipment, rescue
availability, escrow guarantees or satellite telemetry. Their layout areas use
actual inventory metrics and practical travel information, without inventing
certifications or service promises.

The connector account could not access this file. The authorized browser
provided a 1280 × 4221 frame reference; its temporary PNG export setting was
removed after capture. The screen retains the user's requested shared header
and white background.

## Validation

Focused tests cover Pakistan-time departure boundaries, unavailable inventory,
route/date selection, separation of primary and trip vehicles, normalized plate
matches, missing public data and safe dynamic media URLs. Run:

```sh
node --experimental-strip-types --test tests/agency-profile.test.mjs
npm run typecheck
npm run build
```

Verification completed with the existing DEMO Hunza Valley Transfers provider:

- All 47 website data tests pass, including six agency tests. Typecheck,
  targeted ESLint and the production build pass.
- Browser checks at 320px, 390px, 768px and 1280px show no page overflow.
  Vehicle switching updates the correct images and capacity; the gallery opens
  and dismisses with Escape. All displayed provider photos load successfully.
- Choosing another date shows the empty-departure state. Reset restores the
  next actual departure and its exact vehicle-booking URL. The homepage agency
  link opens the new profile. Pickup names differing only in case are not
  duplicated between registered locations and published trip locations.
- QA does not create a booking, save a provider, send a message or change the
  customer's account settings.
