# Website Room Details

Design reference: Figma file `GTy67NAiZDPG2jkPRhVcSs`, frame `120:2210`.

## Route and entry points

`/hotels/[id]/rooms/[roomId]` opens a room details page. Hotel room cards link here through their photos and **View room details** links. Other room cards open their corresponding room pages. All links preserve check-in, check-out, adults, children and room count.

The page validates that the room belongs to the hotel in the URL. Mismatched or missing records show the site's not-found state. **Back to all rooms**, **Compare with other rooms**, and the quote's **Select this room** action return to the hotel room list with the room selected.

## Layout and alignment

The existing shared site header and original logo remain the header for this screen. The page has a white background and a centered 1280px container with 48px desktop side padding.

Breadcrumbs and the back link sit above the room title, address, summary and policy badges. The gallery spans the content width, with one large room photo and up to four supporting photos. Fewer published photos use the shared gallery's corresponding layout; hotel or other-room photos are not substituted for the room gallery.

Below the gallery, the main column and reservation panel use a 2.1:1 grid with a 32px gap. The main column contains a two-column room specification grid, room description, grouped room amenities, property policies and host contact. The reservation panel stays beneath the fixed header while scrolling on desktop. Alternative room cards form a three-column row beneath both columns.

All main surfaces use `--site-card-radius` (16px). Buttons, badges and avatars use the existing UI shapes. At 850px and below the stay panel moves into the normal page flow. At 550px and below, details and alternative rooms become single-column, and a fixed bottom rate bar links to the stay panel.

## API and interactions

- `GET /rooms/:id`: published room details and room-owned property identity.
- `GET /hotels/:id`: hotel address, policies, contact and manager information.
- `GET /rooms/hotel/:hotelId`: other active room types.
- `GET /rooms/hotel/:hotelId` with dates, rooms and guests: availability and the rate for the selected stay. Rechecked every minute and when the stay changes.
- `POST /hotels/quote`: current nightly rates and room subtotal after **Check room availability**. This checks availability without holding inventory or taking payment.

Dates and guest counts are edited in an accessible dialog. Room quantity controls update availability and clear previous quote data. The action is blocked for invalid dates, inactive rooms or properties, missing availability, insufficient inventory, capacity errors, or availability failures. API errors provide retry controls.

The gallery dialog supports thumbnails, previous/next controls, and Escape to close. Sharing opens a copyable room link. Saving uses the existing hotel favorites API and is labeled **Save property** because the API supports hotel favorites. Phone and email links use published property contact details.

Room facts, amenities, images, prices and cancellation terms come from the existing API. The design's sample escrow guarantees, tax percentages, discounts, response times, scenic views and host certifications are not presented as facts without data. The fare panel distinguishes estimated and quoted room subtotals; taxes and other charges are confirmed with the host.

## Implementation

- Route: `src/app/(site)/hotels/[id]/rooms/[roomId]/page.tsx`
- Presentation: `src/components/site/hotels/website-room-details.tsx`
- Styles: `src/components/site/hotels/room-details.module.css`
- Shared gallery and room cards: `src/components/site/hotels/hotel-primitives.tsx`
- Navigation, amenities and availability helpers: `src/lib/room-details.ts`
- API: `src/services/customer/hotel.service.ts`
- Behavior tests: `tests/room-details.test.mjs`
