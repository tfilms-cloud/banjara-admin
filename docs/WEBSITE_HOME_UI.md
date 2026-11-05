# Website Home

Reference: [approved Figma frame 88:3](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=88-3).

## Layout

The website Home uses a 1280px container with 48px desktop gutters, a white header, the existing gold BANJARA logo, a full-color Attabad Lake backdrop, and a rounded search panel. Below it are six circular shortcuts, three ride cards, four destination tiles, two inspiration cards, and four benefit cards. The page foundation is white, with warm neutral controls, teal actions, aqua selections, and coral accents.

The banner uses `attabad-lake-4k.webp`, a 3840 × 2160 photograph, with white text and a directional dark overlay. The photo stays visible across the banner; only its bottom edge blends into the white page. Search controls share a 58px desktop height, with a 132px traveler field and 16px gaps. Return-date searches use explicit traveler/button columns at intermediate widths so neither falls into the narrow swap-button column.

Background photo: [Attabad Lake by Asim Rehman on Unsplash](https://unsplash.com/photos/turquoise-lake-between-rugged-mountain-cliffs-aPIq6Q5OSrQ), available under the [Unsplash License](https://unsplash.com/license). The optimized local WebP retains 3840 × 2160 pixels. The earlier Figma imagery remains available for other design slots.

At tablet widths, ride cards and destination tiles use two columns. On phones, search fields stack, service tabs remain available, shortcuts use three columns, rides and inspiration use one column, and destinations and benefits use two columns. Native inputs, keyboard tabs, visible focus outlines, descriptive buttons, and modal focus handling are retained. Reduced-motion preferences disable transitions.

`src/components/site/home/` contains reusable section headings, image fallbacks, loading/error/empty states, dialogs, the Home header, ride cards, and page composition. Its CSS module scopes the design to Home. The existing transport and hotel pages continue to use their existing search component.

## Mobile API integration

The website uses the existing customer API client and `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`). Customer authentication remains separate from admin authentication.

| UI                                                      | Existing endpoint / behavior                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rides, fares, seats, pickup points, registered vehicles | `GET /trips/search`; links into the existing trip detail and booking flow                                                                         |
| Ride search                                             | Existing `/trips` URL parameters, including origin, destination, date, passengers and journey type; class/mode filters are preserved on results   |
| Stays                                                   | `GET /hotels/search`; search opens `/hotels/results`, then existing hotel and room selection                                                      |
| Guides                                                  | `GET /guides`; search sends destination, date and guests; details show published provider information                                             |
| Tours                                                   | `GET /tour-itineraries`; destination filtering is applied locally because this endpoint does not support destination queries                      |
| Rental                                                  | Published whole-vehicle trips (`bookingMode=vehicle`), using the existing trip flow; no authenticated provider fleet endpoint is exposed publicly |
| Saved rides                                             | Signed-in customers use `GET/POST /favorites` and `DELETE /favorites/:id`; guests save on this browser in local storage                           |

Home is server-rendered with trips and hotels fetched independently. Client queries refresh ride availability every minute, support retries, and keep failures distinct from empty catalogs. Server requests time out after 12 seconds. Past departures, cancelled trips, sold-out inventory and invalid fares are excluded using Pakistan departure times. Booking detail screens remain the authority for final availability. Vehicle chips derive from registered class/name/model; ratings and verification badges derive from provider data. Destination fare chips use actual upcoming departures and indicate seat versus vehicle pricing.

Road and weather shortcuts provide planning guidance because no live road/weather feed exists. Inspiration uses the approved illustrative design photos with actual provider journeys; it does not invent community posts, likes, reviews or booking claims. Benefit text describes supported behavior rather than unimplemented escrow or round-the-clock guarantees. Guide/tour discovery has details/contact views; their dedicated website checkout screens are outside this Home change.

## Artwork

`public/home/` contains the original raster images embedded in the approved frame's SVG export: Karakoram backdrop, trending, local guide, Hunza, Skardu, Fairy Meadows, Swat, and two inspiration images. These are extracted source assets, not page screenshots. Original logo asset: `public/banjara-logo.png` (unchanged).

## Verification

Run `npm run typecheck`, targeted ESLint, `npm run build`, and `node --experimental-strip-types --test tests/home-discovery.test.mjs`. The unit tests cover Pakistan midnight boundaries, stale/sold-out/cancelled inventory, vehicle classification and search query preservation. Browser verification should cover Ride/Stay/Tours/Guides/Rental, guest save persistence, route swapping, search navigation, dialogs, and desktop/phone overflow.
