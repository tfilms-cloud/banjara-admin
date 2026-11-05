# Shared customer website header

The customer website uses one base header across Home, Explore, bookings,
messages, profile, authentication, and inventory/detail pages.

## Component ownership

- `src/components/site/site-header.tsx` owns navigation and account actions.
- `src/components/site/site-header.module.css` owns the header's responsive UI.
- `src/app/(site)/layout.tsx` mounts the header once for all customer routes.
- `src/components/site/site-main.tsx` reserves 76px above page content to match
  the fixed header height.
- `HomeHeader` remains a compatibility export of `SiteHeader`; it does not
  implement a separate header.

New customer screens should use the shared `(site)` layout. Do not mount
another header inside a page or add a second header-height spacer.

## Navigation and alignment

The tabs are **Home, Explore, Bookings, Messages, Profile**. Stays is removed
from the global header. Stay listings remain available through Explore's
service selection and existing links.

The original gold logo and BANJARA wordmark sit on the left, navigation is in
the middle, and account actions sit on the right. The header has a white
background, a subtle bottom border, and a centered 1280px content container.
The selected tab uses teal text and an underline.

Explore stays selected on trip and hotel inventory/detail routes. Bookings and
Messages stay selected on their nested routes; other account routes select
Profile.

## Responsive behavior

At widths of 700px and below, a menu button replaces the desktop tabs. The
dropdown uses the same navigation definitions, includes the current sign-in
or sign-out action, and closes on selection, outside pointer interaction,
Escape, or route navigation. Escape returns focus to the menu button.

Keyboard focus indicators and `aria-current`, `aria-expanded`, and descriptive
button labels are shared across all customer pages. The separate admin header
and mobile application are outside this component's scope.
