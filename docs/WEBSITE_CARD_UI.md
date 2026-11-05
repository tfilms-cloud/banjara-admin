# Website card corners

Customer website cards use a shared **16px border radius** instead of the large rounded capsule corners in the original Figma screens. This applies to desktop and mobile layouts.

## Shared value

`src/components/site/site-shell.module.css` defines `--site-card-radius` on the customer layout. Card styles use:

```css
border-radius: var(--site-card-radius, 16px);
```

Use this value for new content cards, booking panels, itinerary blocks, profile sections, gallery frames, and information panels. Responsive rules should use the same value rather than introducing another radius.

The shared radius covers Home, Explore, agency profiles and transporter cards, trip details, hotel details, Bookings, Messages, and Profile. It supersedes card corner measurements in older page-specific UI documentation.

Buttons, tabs, search fields, badges, avatars, and message bubbles retain their own shapes. Card border colors, spacing, and interactions remain page-specific. The token is scoped to the customer website layout.
