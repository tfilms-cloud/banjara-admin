# Website Explore

Implementation: `/explore`. Reference: [Figma 88:674](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=88-674).

The screen adapts the approved 1280px desktop layout with 48px gutters, an introduction, the mobile app’s service selector, rounded search controls, a Hunza expedition banner, service listings, six destination cards in three columns, and four road-planning cards. It shares the original BANJARA logo and customer header with Home. Tablets use two card columns; phones stack cards and search controls. Typography, teal buttons, warm neutral pills, rounded corners and spacing follow the existing Home components.

Reusable presentation lives in `src/components/site/explore/`. Destination metadata and filter logic live in `src/lib/explore-destinations.ts`. Shared `HomeImage`, `HomeDialog`, `HomeState`, and `SectionHeading` components provide image fallback, native modal focus management, empty/error/loading states, and headings. CSS modules keep styles scoped to this screen.

## Behavior and APIs

- The primary filters match mobile Explore: **Ride / Stay / Tours / Guides / Food**. Switching services clears the search and restaurant destination, while remembering each service’s category. Search, service, category, destination and sorting persist in the URL and respond to browser navigation.
- Ride uses provider-registration categories (**Car, Jeep, SUV, Van, Mini bus, Bus, Other**), showing only categories with available future inventory, plus **All**. Each vehicle appears once at its lowest published fare. The mapper retains the provider’s raw vehicle category so Jeeps and SUVs do not become generic private cars.
- Like mobile Explore, **Popular vehicles** cards open their agency profile. **Top transporters** below them groups matching departures into one card per provider, with routes, departure counts and starting fares. The whole vehicle or transporter card is clickable; the explicit action says **View agency** or **View agency & all trips**. The destination is `/agencies/[providerId]`, where the traveler selects a departure before booking.
- Stay uses **Hotels / Guest houses / Hostels & lodges**, limited to categories present in the catalog, with a safe fallback when the selected category has no inventory. Resorts map to hotels; homestays map to lodges, matching mobile.
- Tours use **Trek / Expedition / Summits** from the itinerary’s published `tourType`. Guides use **Male / Female**, ranked by provider rating and reviews, with provider languages shown. As on mobile, legacy guides without gender metadata remain discoverable.
- Food searches restaurants by destination through the same `GET /providers/catalog?service=restaurant&limit=40` data used by mobile. Active sales and offers appear first, followed by traveler favorites ranked from ratings, reviews and menu variety. The website does not request location permission automatically; nearby GPS ranking is not used without location access.
- Region, maximum altitude and transit fare remain in **All Filters** as valley-planning filters. Region also narrows service listings; altitude and fare apply to destination cards. Terrain and altitude are curated metadata, not live road or weather reports.
- Transport and destination fares use `GET /trips/search`, filtered to future, available departures in Pakistan time. Prices retain their seat or whole-vehicle unit. Missing inventory never receives a sample fare.
- Stays use `GET /hotels/search`; destination details link to the existing hotel/room flow.
- Guide profiles and tour itineraries use `GET /guides` and `GET /tour-itineraries`. Photos, names, published descriptions, verification, reviews and prices come from provider data. Detail dialogs show current information and a provider phone link when one is available. Dedicated guide/tour website checkout remains separate.
- Server data loads independently with `Promise.allSettled`. Client queries refresh transport every minute and provide retries for each failed service. A catalog outage does not remove the curated destinations.
- Destination hearts save on this device, separated by customer ID (or guest). The backend favorites endpoint supports trips, hotels and providers, so destination saves do not send an unsupported API target.
- There is no live road/weather telemetry endpoint. The road-planning section and advisory dialog explicitly ask travelers to confirm conditions with their providers. No sample opening statuses, temperatures, escrow coverage or sensor timestamps are presented as real data.

## Exact design assets

Source: embedded original raster images from the selected frame’s SVG export in the authorized signed-in Figma browser. These are not screenshots of the page. Export settings were restored after download.

| File in `public/explore/` | Source SVG image index | Design slot                   |
| ------------------------- | ---------------------- | ----------------------------- |
| `hunza-expedition.jpg`    | 0                      | Featured Hunza banner         |
| `hunza.jpg`               | 1                      | Hunza destination             |
| `skardu-deosai.jpg`       | 2                      | Skardu and Deosai destination |
| `fairy-meadows.jpg`       | 3                      | Fairy Meadows destination     |
| `swat-kalam.jpg`          | 4                      | Swat destination              |
| `kumrat.jpg`              | 5                      | Kumrat destination            |
| `khunjerab.jpg`           | 6                      | Khunjerab destination         |

Guide and tour imagery is dynamic API content. The earlier Home 4K background remains on Home.

## Verification

Run `node --experimental-strip-types --test tests/explore-catalog.test.mjs tests/explore-destinations.test.mjs tests/home-discovery.test.mjs`, `npm run typecheck`, targeted ESLint, and `npm run build`. Browser checks cover visual layout at desktop/tablet/phone sizes, all five service tabs, lodging categories, guide gender, tour type, restaurant destination and offers, search, URL persistence, empty/reset states, and existing trip/hotel detail links. Reusable service controls and cards live in `service-catalog.tsx`; mobile-aligned options and matching logic live in `src/lib/explore-catalog.ts`.
