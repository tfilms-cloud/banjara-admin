# Retained Figma website

The Next.js application keeps these Figma implementations and their shared dependencies:

| Page | Route | Figma frame |
| --- | --- | --- |
| Home | `/` | `88:3` |
| Explore | `/explore` | `88:674` |
| Agency Profile | `/agencies/[id]` | `108:3192` |
| Trip Details | `/trips/[id]` | `118:1474` |
| Hotel Details | `/hotels/[id]` | `88:1505` |
| Room Details | `/hotels/[id]/rooms/[roomId]` | `120:2210` |
| Bookings | `/account/bookings` | `88:2602` |
| Messages | `/account/messages` | `88:2133` |
| Profile & Account | `/account` | `108:4044` |
| Tour Details | `/tours/[id]` | `123:2852` |
| Restaurant Details | `/restaurants/[id]` | `131:2` |
| Guide Details | `/guides/[id]` | `135:2` |

Tour Details and its supporting booking flow are being implemented in the separate active Figma task and are preserved by this cleanup. Its checkout route is a supporting flow, not a separately approved Figma screen.

Legacy admin routes, dashboard components, unused UI primitives, admin auth providers/hooks/services, and the earlier customer listing, login, registration, trip checkout and booking detail screens were removed. The shared Figma site header, original logo, footer, customer authentication, query providers, API clients and backend availability handling remain.

Sign-in and registration use the shared site dialog on `/account?auth=signin` and `/account?auth=register`. Old login/registration URLs redirect there. Previous trip and hotel listing URLs redirect to the Figma Explore page, retaining search parameters; Explore sends route, dates, passenger count and stay occupancy to the existing APIs. Hotel cards preserve stay dates/occupancy into the details page. The removed trip checkout links now open the retained trip details; its main action contacts the provider. Existing booking details, pass and payment dialogs remain in the Figma Bookings page.

The readiness endpoint remains `/api/backend-status`. UI stays mounted when the backend is unavailable; server-supplied records are hidden and recover when the connection returns.

A pre-cleanup archive of source, documentation and configuration is stored outside the active Next.js application at `../.cleanup-backups/banjara-next-before-figma-cleanup-20261101-002126.zip`. It contains existing uncommitted and untracked source files as well as tracked files. The cleanup manifest is stored beside it. The archive is for recovery, not imported or served by the website.

Validate with `npm run typecheck`, `node --experimental-strip-types --test tests/*.test.mjs`, targeted ESLint and `npm run build`. The backend does not need to be started for compilation or unit tests.
