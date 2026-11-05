# Bangara Admin — Historical Setup

> The legacy admin website was removed during the Figma-only cleanup. This document is retained as history. See [the current website scope](WEBSITE_FIGMA_SCOPE.md) for active routes and validation.

The Next.js app now hosts **two surfaces**:

| Route | Audience |
|-------|----------|
| `/` | BANJARA customer website (traveller search, booking, account) |
| `/admin` | Operations console (unchanged) |

Customer and admin auth use **separate** localStorage keys so sessions never overwrite each other.

The operations console for the Bangara travel platform, built with Next.js 16
(App Router), React 19, Tailwind CSS v4 and TanStack Query.

## Requirements

- Node.js 20 or newer
- The Bangara backend running and reachable (default `http://localhost:5000`)
- An account in the backend whose `role` is `admin`

## 1. Install

```bash
cd banjara-admin
npm install
```

## 2. Configure the environment

`.env.local` holds a single variable — the base URL of the Bangara API,
including the `/api` prefix:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Point it at a deployed backend when running against a shared environment:

```bash
NEXT_PUBLIC_API_URL=https://api.bangara.pk/api
```

The variable is read at build time, so restart the dev server (or rebuild)
after changing it.

## 3. Run

```bash
npm run dev     # development server on http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
```

## 4. Sign in as an administrator

1. Start the backend, then open `http://localhost:3000`.
2. The landing page links to `/admin`, which redirects to `/admin/login` when
   no session token is stored and to `/admin/dashboard` when one is.
3. Enter the email and password of an account whose role is `admin`.

Sign-in calls `POST /auth/login` and rejects the session locally if the returned
user is not an administrator, so provider and customer accounts cannot reach the
console. Access and refresh tokens plus the user record are stored in
`localStorage` under the `bangara_admin_*` keys.

If you do not have an admin account yet, create one directly in the backend —
the portal intentionally exposes no self-registration.

## 5. What to expect on first run

Against a fresh database every screen loads successfully and shows an empty
state rather than placeholder rows. Nothing in the UI is mocked: counts,
charts, tables and detail panes all come from `/api/admin/*`.

If the backend is unreachable you will see "Unable to connect to server" with a
**Retry** button on each screen; the app does not silently swallow failures.

## Project structure

```
src/
  app/
    page.tsx                     Public placeholder, links to the portal
    admin/page.tsx               Token-aware redirect
    admin/login/page.tsx         Sign-in screen
    admin/(dashboard)/           Authenticated shell (sidebar + header)
      dashboard/                 Overview
      providers/                 Directory, applications, detail views
      customers/                 Customers and profiles
      transport/                 Vehicles, routes, pickup points, trips
      hotels/                    Hotels, rooms, availability
      bookings/  payments/       Commerce
      reviews/ messages/ notifications/
      support/  reports/  settings/
  components/
    layout/                      Sidebar, header, nav configuration
    providers/                   App providers and auth context
    ui/                          Button, input, select, textarea, badge, card, dialog
    <shared>                     Data table, stat card, status badge, states, dialogs
  hooks/                         React Query wrappers, one per resource
  lib/                           API client, utils, query keys, record helpers
  services/                      Backend calls (admin, auth, thin aliases)
  types/                         Shared TypeScript contracts
```

## Session behaviour

- Session state is exposed through an external store (`src/lib/session-store.ts`)
  and read with `useSyncExternalStore`, which keeps server rendering and client
  hydration consistent.
- `src/app/admin/(dashboard)/layout.tsx` redirects to `/admin/login` once
  hydration completes if there is no token or the stored user is not an admin.
- A `401` triggers one silent refresh attempt via `POST /auth/refresh`. If that
  fails the session is cleared and the browser is sent to `/admin/login`.

## Theming

Brand colours are CSS variables in `src/app/globals.css` and surface as Tailwind
utilities (`bg-navy`, `text-sky`, `bg-amber`, `text-green`, `text-danger`, plus
`sidebar`, `card`, `border` and `muted` tokens).

| Token | Value | Used for |
| --- | --- | --- |
| navy | `#0B1F33` | Sidebar, headings, primary buttons |
| sky | `#3B82F6` | Links, active navigation, primary charts |
| amber | `#F59E0B` | Brand mark, warnings, secondary series |
| green | `#16A34A` | Approvals, settled payments |
| danger | `#DC2626` | Rejections, failures, destructive actions |
