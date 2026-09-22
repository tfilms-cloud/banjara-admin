# Bangara Admin — API Mapping

Every screen in the admin portal reads from the Bangara backend at
`NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`). No screen renders
mock, demo or seeded data: when an endpoint returns an empty collection the UI
shows an empty state instead.

All requests are issued through `src/lib/api.ts`, which attaches the bearer
token, refreshes it on `401`, and unwraps the `{ success, message, data }`
envelope. Service functions live in `src/services/admin.service.ts` and are
wrapped by React Query hooks in `src/hooks/`.

## Authentication

| Feature | Route | Method + endpoint | Service | Hook |
| --- | --- | --- | --- | --- |
| Admin sign in | `/admin/login` | `POST /auth/login` | `loginAdmin` | `useAuth().login` |
| Sign out | Sidebar, header, settings | `POST /auth/logout` | `logoutAdmin` | `useAuth().logout` |
| Re-read profile | `/admin/settings` | `GET /auth/me` | `fetchMe` | `useAuth().refresh` |
| Silent token refresh | Global interceptor | `POST /auth/refresh` | `src/lib/api.ts` | — |

`loginAdmin` rejects any account whose `role` is not `admin`, so provider and
customer credentials cannot enter the portal.

## Dashboard and reporting

| Feature | Route | Endpoint | Hook |
| --- | --- | --- | --- |
| Stat cards, trend chart, recent activity | `/admin/dashboard` | `GET /admin/dashboard` | `useDashboard` |
| Range-based analytics | `/admin/reports` | `GET /admin/reports?range=7d\|30d\|90d\|1y` | `useReports` |

The dashboard chart renders only when `charts[]` is present on the response.
The reports page inspects the payload at runtime: numeric fields become stat
cards, arrays of objects become a line chart plus table, and nested objects
become definition lists.

## Providers

| Feature | Route | Endpoint | Hook |
| --- | --- | --- | --- |
| Applications list (tabs + search) | `/admin/providers/applications` | `GET /admin/providers?status=&search=&page=&limit=` | `useProviders` |
| Provider directory | `/admin/providers` | `GET /admin/providers` | `useProviders` |
| Application / provider detail | `/admin/providers/applications/[id]`, `/admin/providers/[id]` | `GET /admin/providers/:id` | `useProvider` |
| Approve | Both list and detail | `PUT /admin/providers/:id/approve` | `useApproveProvider` |
| Reject (reason required) | Both list and detail | `PUT /admin/providers/:id/reject` | `useRejectProvider` |
| Suspend (reason optional) | Approved providers only | `PUT /admin/providers/:id/suspend` | `useSuspendProvider` |

Each mutation invalidates `["admin", "providers"]` and the dashboard query, so
lists and counters refresh without a manual reload.

## Customers

| Feature | Route | Endpoint | Hook |
| --- | --- | --- | --- |
| Customer list | `/admin/customers` | `GET /admin/customers` | `useCustomers` |
| Customer profile + bookings | `/admin/customers/[id]` | `GET /admin/customers/:id` | `useCustomer` |

`GET /admin/customers/:id` is expected to return `{ customer, bookings }`; the
bookings array powers the booking table and lifetime-value summary.

## Transport

| Feature | Route | Endpoint | Hook |
| --- | --- | --- | --- |
| Vehicles | `/admin/transport/vehicles` | `GET /admin/vehicles` | `useVehicles` |
| Vehicle detail | `/admin/transport/vehicles/[id]` | `GET /admin/vehicles/:id` | `useVehicle` |
| Routes | `/admin/transport/routes` | `GET /admin/routes` | `useRoutes` |
| Route detail | `/admin/transport/routes/[id]` | `GET /admin/routes/:id` | `useRoute` |
| Pickup points | `/admin/transport/pickup-points` | `GET /admin/pickup-points` | `usePickupPoints` |
| Pickup point detail | `/admin/transport/pickup-points/[id]` | `GET /admin/pickup-points/:id` | `usePickupPoint` |
| Trips | `/admin/transport/trips` | `GET /admin/trips` | `useTrips` |
| Trip detail | `/admin/transport/trips/[id]` | `GET /admin/trips/:id` | `useTrip` |

These endpoints are not covered by a typed contract yet, so the pages read
fields defensively through `src/lib/records.ts` (`firstText`, `firstNumber`,
`refLabel`). Populated references such as `providerId`, `routeId` and
`vehicleId` are rendered by label when the backend populates them and fall back
to the raw id otherwise.

## Hotels and stays

| Feature | Route | Endpoint | Hook |
| --- | --- | --- | --- |
| Hotels | `/admin/hotels` | `GET /admin/hotels` | `useHotels` |
| Hotel detail | `/admin/hotels/[id]` | `GET /admin/hotels/:id` | `useHotel` |
| Rooms | `/admin/hotels/rooms` | `GET /admin/rooms` | `useRooms` |
| Room detail | `/admin/hotels/rooms/[id]` | `GET /admin/rooms/:id` | `useRoom` |
| Availability calendar | `/admin/hotels/availability` | `GET /admin/availability?roomId=&from=&to=` | `useAvailability` |

The availability filters map directly to query parameters; empty filters are
omitted from the request.

## Commerce

| Feature | Route | Endpoint | Hook |
| --- | --- | --- | --- |
| Bookings (type tabs + search) | `/admin/bookings` | `GET /admin/bookings` | `useBookings` |
| Booking detail | `/admin/bookings/[id]` | `GET /admin/bookings/:id` | `useBooking` |
| Payments (status tabs + totals) | `/admin/payments` | `GET /admin/payments` | `usePayments` |
| Payment detail | `/admin/payments/[id]` | `GET /admin/payments/:id` | `usePayment` |

Booking detail renders `hotelBooking` or `transportBooking` depending on
`bookingType`. Payment detail links back to `/admin/bookings/:id` when the
payment carries a booking reference.

## Engagement and support

| Feature | Route | Endpoint | Hook |
| --- | --- | --- | --- |
| Reviews | `/admin/reviews` | `GET /admin/reviews` | `useReviews` |
| Messages | `/admin/messages` | `GET /admin/messages` | `useMessages` |
| Notifications | `/admin/notifications` | `GET /admin/notifications` | `useNotifications` |
| Support queue (status tabs) | `/admin/support` | `GET /admin/support` | `useSupportTickets` |
| Ticket detail | `/admin/support/[id]` | `GET /admin/support/:id` | `useSupportTicket` |
| Update status / priority | `/admin/support/[id]` | `PUT /admin/support/:id` | `useUpdateSupportTicket` |

`PUT /admin/support/:id` accepts `{ status?, priority? }`. Allowed statuses are
`open`, `inProgress`, `resolved`, `closed`; priorities are `low`, `medium`,
`high`.

## Settings

`/admin/settings` deliberately calls no settings endpoint. It renders the
authenticated administrator from the auth context, shows the configured API
base URL, and offers profile refresh (`GET /auth/me`) and sign out.

## Response shapes the UI tolerates

- `GET /admin/providers` may return either a bare array or `{ items, pagination }`.
- Any list endpoint may return `[]`, `{ items: [] }`, or `null`; `asArray` in
  `src/lib/utils.ts` normalises all three.
- Documents may expose `id` or `_id`; `idOf` resolves either.
- Reference fields may be raw ids or populated objects; `refLabel` handles both.
