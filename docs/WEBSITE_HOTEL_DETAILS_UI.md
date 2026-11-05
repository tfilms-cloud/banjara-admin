# Website Hotel Details

Route: `/hotels/[id]`. Design: [Figma 88:1505](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=88-1505).

This screen adapts the Serena Eagle’s Nest Lodge website frame to the actual selected hotel. The original BANJARA logo, customer navigation and footer are reused. Hotel-specific photographs, names, rates, policies, contacts, verification, reviews and coordinates come from the existing mobile APIs.

## Alignment and reusable components

- The page has a 1280px maximum width and 48px desktop gutters. Breadcrumbs and share/wishlist actions occupy the first row; property badges, title and location sit above the gallery.
- The rounded 520px gallery uses a large left image and four smaller slots on the right. It adapts to the number of distinct API photographs without repeating an image to fill a slot. Phones use a full-width image above two thumbnails and retain the full-gallery button.
- Desktop content uses a 2.1:1 split with a 40px gap. The left column contains host information, four property highlights, description, amenities, room cards, policies, location and reviews. The right column contains a sticky rate/availability form and property contact card.
- On tablets and phones the booking form moves below the gallery and above property details. Cards and controls wrap or stack without horizontal page scrolling. Panels use 24px radii; room and highlight cards use 18–20px radii.
- `HotelGallery`, `HotelRoomCard` and `amenityIcon` in `hotel-primitives.tsx` are reusable. Shared `HomeImage`, `HomeDialog` and `HomeState` provide fallback media, modal focus management, and loading/error/empty states. The CSS module keeps presentation scoped to this screen.

## APIs and interactions

| Function           | API / behavior                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Property           | `GET /hotels/:id`, including manager, hospitality experience, registration and published contacts                                    |
| Rooms              | `GET /rooms/hotel/:id?checkIn=…&checkOut=…&guests=…&rooms=…`; inventory filters by stay dates, capacity and requested room count     |
| Availability quote | `POST /hotels/quote`, using exactly the mobile request fields; returns per-night rates and room subtotal                             |
| Reviews            | `GET /reviews/provider/:providerId`, limited to hotel reviews; absence of guest names produces an anonymous guest label              |
| Wishlist           | Guest saves persist on the device; signed-in saves use `/favorites` with `targetType: hotel`                                         |
| Location           | OpenStreetMap embed and Google Maps directions use the actual property coordinates; missing coordinates fall back to an address link |
| Share              | A dialog copies a property URL containing the selected dates, guests, room count and room type                                       |

The form validates real calendar dates, arrival from the current Pakistan date, 1–90 nights, and integer guest/room counts. Advancing check-in past check-out advances checkout by one day. Date inputs handle native input events and form submission reads the visible values. Valid selections are preserved in the URL for reloads and shared links. Selecting a room updates the sidebar; its detail dialog shows published room photos and amenities.

Rooms refresh every minute. A requested quote uses live server validation; changing dates, guests, room count or room type invalidates the displayed quote. Rechecking the same selection requests a fresh quote. A quote does not reserve inventory or charge. The existing property-contact reservation flow is retained through call/email links. Online hotel checkout is not added by this screen.

The API quote supplies a room subtotal, not the backend’s final booking taxes and fees. The screen labels estimates and room subtotals and asks customers to confirm additional charges with the host. The Figma sample weather, altitude, superhost status, escrow promises, tax amounts, registration number, live front-desk status and reviews are not presented as actual property facts.

## Design reference and assets

The connector account could not read this file; the existing authorized signed-in browser supplied the selected frame’s PNG and SVG exports. The temporary export setting was removed afterward. The reference is used to verify layout and styling. All property and room photo slots are API supplied; the sample Serena photographs and its static map are not substituted for another hotel’s content. Icons use the existing Lucide package.

## Verification

- `node --experimental-strip-types --test tests/hotel-details.test.mjs tests/explore-catalog.test.mjs tests/explore-destinations.test.mjs tests/home-discovery.test.mjs`
- `npm run typecheck`, targeted ESLint for the new hotel components, helpers, API service and page, then `npm run build`.
- Browser checks: gallery navigation, room details and selection, date changes, occupancy filtering, empty inventory, live quote, wishlist reload, share dialog, map and responsive widths from 320px to 1920px.

The existing legacy menu-close effect in `src/components/site/site-header.tsx` triggers `react-hooks/set-state-in-effect` when linting that whole file. The hotel route only adds a condition to use the shared Home header; the unrelated effect was preserved.
