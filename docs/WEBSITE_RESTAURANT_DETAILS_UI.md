# Website Restaurant Details

Figma reference: [frame 131:2](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=131-2).

## Entry and alignment

Open **Explore → Food → View details** on a restaurant or offer. The route is `/restaurants/[providerId]`. The shared website header retains the original BANJARA logo and marks Explore active.

The page has a white background, a centered 1280px container, and the shared 16px card radius. Breadcrumbs and save/share actions sit above the name, cuisine badges, address, and provider rating. A large photo leads the gallery, with up to four supporting photos. At smaller widths the gallery collapses to a main photo and supporting row. Missing imagery uses a neutral placeholder.

Below the gallery, a two-column desktop grid gives the content approximately two thirds of the width and the enquiry panel the remaining third. The long enquiry form scrolls naturally with the page so its final action remains reachable at shorter viewport heights. Content includes cuisine/menu/hours/location facts, provider description, searchable menu categories, active offers, contact links, provider rating, and map directions. On narrow screens the enquiry panel follows the gallery; all remaining content stacks below it. Menu cards stay in two columns.

## Shared components and data

- Shared site header/footer, `HomeDialog`, and `HomeState` remain the base components. The gallery composes the existing gallery layout with a dining-specific image placeholder.
- `GET /providers/public/:id` supplies public restaurant details. Only whitelisted business fields are mapped; onboarding and bank documents are excluded.
- The existing catalog service and restaurant ranking remain intact. Both standard restaurant cards and offer cards link to the new route.
- Provider favourites use the existing `/favorites` endpoints with `targetType: "provider"`. Guests sign in through the shared account dialog and return to this restaurant. Saved restaurant-only providers open this details route from Profile; providers with transport services retain their existing agency link.
- Contact calls use the published phone. Messaging uses the provider's **user ID**, not the provider profile ID. Website links accept HTTP/HTTPS only. Directions use validated coordinates or a business/address search.
- `@/lib/live-query` gates live details during backend outages. Loading, missing, and retry states do not substitute stale initial data.

## Visit enquiries

The existing mobile flow exposes menu highlights, offers, calls, sharing, and favourites. The backend has no restaurant booking type, priced dish inventory, seating inventory, or pre-order checkout. This screen therefore prepares an enquiry rather than creating a booking or charging a deposit.

Visitors select a date, preferred time in Pakistan time, 1–20 guests, an optional seating preference, menu interests, and notes. Date, time, guest count, and notes are validated. Time presets express a preference, not available reservation slots. The restaurant confirms operating hours, table availability, portions, prices, and any reservation terms.

The enquiry dialog provides selectable text, Copy enquiry, Call restaurant, and Open messages. Nothing is sent automatically. Copy the plan into the conversation to discuss it with the provider. No fabricated dish prices, guarantees, testimonials, Wi-Fi claims, or payment totals appear.

The displayed rating is the overall provider rating. The current reviews model does not support restaurant-specific reviews, so ratings from other provider services are not presented as dining testimonials.

## Validation

Run `node --experimental-strip-types --test tests/restaurant-details.test.mjs` for public-data mapping, enquiry validation, menu filtering, contact sanitization, and map-coordinate behavior. Use the project typecheck, ESLint, production build, and browser desktop/mobile checks for integration and layout.
