# Website Trip Details

Route: `/trips/[id]`. Reference: [Figma 118:1474](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=118-1474).

The trip page replaces the earlier basic detail view with the approved fleet,
itinerary, pickup and reservation layout. It uses the original BANJARA logo,
shared header/footer and the requested white page background.

## Alignment and components

- The 1280px container has 48px desktop gutters. A compact provider/route strip
  sits above breadcrumbs, journey badges and the route heading. Departure,
  duration and fare facts align beside the heading.
- Desktop content uses a flexible main column, a 374px reservation column and
  a 32px gap. The fare panel stays below the fixed header while scrolling.
  Panels have subtle borders, 18px corners and 24px padding; inset itinerary,
  pickup, amenity and review cards use larger rounded corners.
- Fleet information, a cover image, optional thumbnails and actual amenity
  chips precede the route timeline. Pickup selection includes a map and radio
  cards. Agency contact/profile actions, reviews and travel preparation follow.
- Below 850px content stacks and a fixed bottom action takes travelers to the
  reservation panel. Below 600px panels use 20px padding, information stacks,
  and the gallery, timeline and fare fields fit narrow phones.
- `WebsiteTripDetails`, `TripWorkspace`, `Panel`, `TripPhoto`, `PickupMap` and
  `TripReviews` compose the screen. The existing `HomeDialog`, `HomeState`,
  favorites hook, agency reviews, formatting helpers and shared page shell
  are reused. CSS is scoped in `trip-details.module.css`.

## Data and existing APIs

| UI                            | Data / behavior                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Trip, vehicle, fare and seats | `GET /trips/:id`, refreshed every 30 seconds                                                                                     |
| Pickup/drop-off locations     | Published trip points, including address, description, landmark and coordinates                                                  |
| Map                           | Same Google Maps embed pattern as hotel details, using the selected public pickup location; external directions remain available |
| Gallery                       | Actual trip/vehicle images, deduplicated; no sample vehicle replaces missing photos                                              |
| Agency actions                | Existing `/agencies/:providerId`, provider telephone, `/account/messages?with=:providerUserId`                                   |
| Reviews                       | Existing `GET /reviews/provider/:id`, filtered to transport reviews; clearly labeled as agency feedback                          |
| Save/share                    | Existing trip favorites; copy the trip page URL                                                                                  |
| Continue                      | `/trips/:id/book?passengers=:count&pickupPoint=:publishedId`                                                                     |

Departure availability uses Pakistan time. Past, cancelled, departed, in-transit,
completed and invalid departures cannot continue into booking. Passenger count
is bounded by the published counter, available seat assignments and the API's
10-person limit. The selected pickup ID must belong to this trip.

Seat fares multiply by the selected passenger count. A vehicle fare remains one
booking unit and is not multiplied by vehicle capacity. Public data does not
provide a quote endpoint for transport taxes/fees, so the screen labels its
amount **Base fare subtotal** and states that the booking service determines the
final amount on creation. It does not display the Figma sample surcharge as an
actual charge.

## Passenger-details handoff

The existing `/trips/[id]/book` form now reads and validates passenger count and
pickup ID from the detail page. It uses published available seat IDs rather
than inventing `A1`, provides a passenger form for each selected seat, and sends
the same number of passenger records and seat IDs to `POST /bookings`.
The lead passenger is prefilled from the current signed-in account. Switching
accounts or trips clears the previous form workspace.

Vehicle bookings keep the existing backend's one-unit transport contract and
collect a lead passenger. Exclusive whole-vehicle inventory allocation remains
a backend concern; this screen does not change the booking API or its locking
rules. All actual booking writes remain an explicit customer action.

The transport payment adapter now sends the backend's accepted `bankTransfer`,
`easypaisa` or `cash` values. Previously it sent rejected `card`/`mobileWallet`
aliases. Successful creation is labeled “Booking created,” since provider
approval and payment remain separate states. The customer reviews the returned
booking and payment instructions before paying.

## Reference differences and limits

The shared header and footer supersede the sample Wilderness branding. Vehicle
photos, seats, plates, dates, fares, amenities and locations are supplied by the
selected trip. Intermediate stops appear only when published; origin and
destination always use the actual trip locations. Missing intermediate times,
altitudes, passenger names and reviews are not invented.

The APIs do not publish live satellite tracking, road/pass status, NTA/PTDC
certification, on-time percentages, medical equipment guarantees, escrow cover,
automatic weather refunds or border-entry requirements. Their visual areas use
factual provider/route information and practical booking preparation instead.

The connector account could not access the Figma file. The authorized browser
provided the 1280 × 3545 reference export; the temporary export setting was
removed. That reference is not used as an implementation image.

## Verification

Focused tests cover Pakistan-time availability, passenger limits, invalid seat
counters, real available seat IDs, vehicle versus seat subtotals, valid pickup
handoff, map coordinates/address fallback, gallery deduplication and published
timeline data. Browser QA covers gallery dismissal, pickup/map display,
passenger-details navigation, real provider links and responsive widths.

No booking, payment, message, favorite or account mutation is submitted during
verification.

Completed checks: all 57 website data tests pass, along with targeted ESLint,
typecheck and the optimized production build. Browser checks at 320px, 390px and
1280px show no page overflow. The photo dialog opens and dismisses with Escape;
the mobile booking shortcut reaches the fare panel. A live vehicle departure
passes its pickup ID and one-unit fare to passenger details. A two-passenger
seat handoff displays two passenger forms and the correct base subtotal; its
past departure remains blocked from submission. All rendered vehicle and agency
images load from the existing provider data.
