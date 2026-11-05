# Website Guide Details

Reference: [Figma frame 135:2](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=135-2).

## Entry and alignment

Open **Home → Guides → View details** or **Explore → Guides → View details**. Guide-only favourites open this page from Profile. The route is `/guides/[providerId]`, within the shared header and footer. The original logo, white page background, Explore navigation state, and shared 16px card radius are retained.

The 1280px centered container has a breadcrumb followed by a wide guide profile card. The portrait and identity sit on the left, message/share/wishlist actions on the right, and language/skill badges below. The main desktop grid uses approximately two thirds of the width for profile content and one third for the booking panel. The long reservation form scrolls with the page so its final action remains reachable on shorter screens.

Content follows the design hierarchy: biography and profile statistics, listed certifications and training, guided experience cards, selected-service inclusions, traveller reviews, and availability/planning information. Experience cards use images from the guide’s public field gallery, not invented route-specific photographs. Missing portraits/photos have neutral icon placeholders.

At tablet/mobile widths, actions wrap and the reservation panel stacks after the profile card. Experience cards become a single column on phones; statistics and weekly schedule remain compact grids. Inputs use readable mobile font sizes and explicit accessible labels. Gallery, share, service details, and booking review use the shared `HomeDialog`.

## Existing API integration

- `GET /providers/public/:id`: public guide identity, portrait, profile, languages, skills, credentials, photos and active services. The mapper whitelists view fields and excludes CNIC, document URLs, bank information, and other onboarding records.
- `GET /guides/:id/availability`: weekly hours, blocked dates, available date range, minimum/maximum duration, and advance notice. This is a published schedule, not a claim that existing bookings have already been checked.
- `GET /reviews/provider/:id`: only `serviceType: "guide"` reviews appear in the guide reviews section. Header ratings are explicitly the provider’s overall ratings.
- Existing provider favourites use `/favorites`, `targetType: "provider"`. Messages address the provider’s **user ID**. Guests use the shared sign-in dialog and return to their guide or conversation.
- `POST /bookings` with `bookingType: "guide"` follows the mobile app’s contract. The payload includes provider/service ID, date, start/end time, duration, guests, meeting point/location, contact details, special requests, and payment method. Rates and totals are calculated by the backend.
- Live queries use the project’s backend availability wrapper. Loading, retry, missing-profile, empty-services, empty-credentials, and empty-review states do not display fabricated records.

## Reservation behavior

The screen selects an active published service and suggests a future working day from the public schedule. Group limits and published durations are preserved. Hourly services can adjust duration in 15-minute increments. Start/end times use Pakistan time. Validation covers real dates, working days/hours, blocked dates, date bounds, advance notice, group limits, duration, and lead traveller contacts. The final request re-fetches the profile and schedule, rejects changed rates, and lets the backend detect booking conflicts.

Per-person, group, hourly, daily, and custom pricing follow the existing backend rules. Daily pricing uses eight hours per billable day; hourly pricing has a one-hour billing minimum. The panel displays the estimated guide fee. Configurable tax and service fees are returned by the booking service; they are not guessed in the UI. Non-PKR services require direct contact because the current booking totals use PKR.

The existing booking API stores a single date/time interval. Multi-day itineraries therefore require contact with the guide rather than a fabricated multi-day reservation. Private license documents, rescue dispatch/GPS status, specific safety equipment, escrow guarantees, permits, cancellation promises, and sample testimonials from the Figma fixture are not displayed unless supported by the provider data and API.

Reviewing the request does not create a booking. An authenticated visitor explicitly chooses **Create booking request**, which creates a pending booking/payment record and opens My bookings. This form does not transfer money. The shared dialog prevents dismissal and duplicate submissions while that request is in progress.

## Verification

`node --experimental-strip-types --test tests/guide-details.test.mjs` covers public data mapping, pricing models, schedule/date/lead-time validation, group and duration limits, mobile-compatible booking payloads, daily-rate fallback, review filtering, and guest validation. Run targeted ESLint, the project typecheck/build, and browser desktop/mobile checks. Preview tests must not create bookings, send messages, or change real favourites.
