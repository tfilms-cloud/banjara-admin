# Website Tour / Expedition Details

Figma reference: `GTy67NAiZDPG2jkPRhVcSs`, frame `123:2852`.

## Navigation

`/tours/[id]` is linked from the Home Tours cards and Explore → Tours → View details. The shared website header uses Explore as the active section on tour routes. The original BANJARA logo, white background and shared 16px card corners are reused.

## Alignment

The desktop container is 1280px wide with 48px horizontal padding. Breadcrumbs and share/save actions sit above the destination, title and package tags. A full-width gallery uses the package cover followed by published gallery photos. With five images, the cover occupies the larger left column and four supporting images form a two-by-two grid on the right. Fewer images use the shared gallery's smaller-image layouts.

Below the gallery, a 2.1:1 grid separates the main content from the sticky reservation panel, with a 40px gap. The main column contains four fact tiles, description, inclusion highlights, route overview, expandable daily itinerary, included/excluded services, operator card and preparation notes. The reservation panel stays 100px below the viewport top, beneath the shared header.

At 850px and below the reservation panel enters normal flow. At 550px and below the page uses 16px horizontal padding, two-column fact tiles, single-column service/preparation cards, a compact gallery and a fixed bottom link to the reservation panel. All content cards retain the shared radius across breakpoints.

## Existing app API integration

- `GET /tour-itineraries/:id` supplies the published package, pricing, duration, capacity, season, imagery, inclusions, exclusions and daily plan.
- `GET /providers/public/:id` supplies the operator's public profile and **user ID** for `/account/messages?with=...`, matching the mobile app's messaging flow.
- `GET /tour-itineraries?providerId=...` supplies the operator profile dialog's published packages.
- The existing favorites API saves the **operator**, since itinerary favorites are not supported. The control is labeled Save operator.
- The reserve action opens `/tours/[id]/book?startDate=...&travelers=...`. It preserves the requested start date and traveler count and checks package status, valid dates and participant limits.
- Creating a booking posts the same `bookingType: package` / `packageBooking` structure used in the mobile app to `POST /bookings`. Lead traveler details and the supported payment method are passed; prices and totals are calculated by the backend. Success opens the matching tour in My Bookings.

The current API does not expose scheduled departures, remaining slots, elevation, tax quotes, vouchers, dossier URLs or escrow guarantees. The page therefore uses a requested start date, participant **limit**, published route overview and base fare subtotal. It does not invent those missing values. Taxes and service fees are shown on the created booking before payment. Non-PKR packages direct customers to the operator because the current booking backend totals are in PKR.

## Controls and states

The gallery has thumbnail and previous/next controls in an accessible dialog. Share opens a copyable website URL. Itinerary days expand individually or together. Operator profile opens a dialog with actual business information, contact links and published packages. Direct Message links to the operator's user identity without sending a message.

Print detailed itinerary opens the browser print workflow. Print styles include all day descriptions even when collapsed and remove navigation, booking controls and galleries. The user can select Save as PDF in the browser.

The booking form uses the authenticated customer's details, preserves the package selection through sign-in, validates contact details and disables repeat submissions. No payment is taken by the form. Loading, missing-tour, backend outage and retry states use the existing live-query and site state components.

## Files and validation

- `src/components/site/tours/website-tour-details.tsx`
- `src/components/site/tours/website-tour-booking.tsx`
- `src/components/site/tours/tour-details.module.css`
- `src/services/customer/tour.service.ts`
- `src/types/customer/tour.ts`
- `src/lib/tour-details.ts`
- `tests/tour-details.test.mjs`

Behavior tests cover public-data mapping, operator messaging identity, package eligibility, date/quantity handoff, guest validation and the mobile-compatible booking payload. Browser verification must not submit a real booking, send a message, or modify favorites.
