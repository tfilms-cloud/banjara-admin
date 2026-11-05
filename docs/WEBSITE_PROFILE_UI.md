# Website Profile & Account

Route: `/account`. Design: [Figma 108:4044](https://www.figma.com/design/GTy67NAiZDPG2jkPRhVcSs/Untitled?node-id=108-4044).

The page replaces the earlier basic account screen with the approved Profile & Account layout. It retains the original gold BANJARA logo, shared website header/footer and white default page background. The existing authenticated customer supplies identity, account status and membership date; bookings and favorites supply actual summary values.

## UI alignment and components

- A 1280px maximum-width container uses 48px desktop gutters. Breadcrumbs and the page heading sit above account badges and the identity card.
- The identity card has a rounded 48px outline, white-to-aqua background and 24px padding. Its first column contains a 112px circular avatar/initials, camera action, name, contacts, join month and Edit Profile link. Four rounded tiles contain completed journeys, saved items, reputation availability and the next active booking.
- Below it, desktop content uses a 380px sidebar and flexible main column separated by 24px. The sidebar contains account navigation, a local-provider travel note and brand copy. The main column stacks Personal Information, Appearance & Display, Payments & Transactions and Travel Preparation & Support.
- Panels use 48px desktop radii, a subtle border/shadow and 24px padding. Form fields occupy two columns with rounded 42px inputs. Totals, contact details and travel preparation use pairs of inset rounded cards. Actions align at the bottom right.
- Below 1150px identity information spans a separate row above the four summary tiles, the sidebar narrows and panels use 36px radii. Below 800px navigation moves above the main content. Below 520px summary tiles use two columns, fields stack and panels use 30px radii with smaller gutters. Long names and labels wrap within their cards.
- `WebsiteProfile` gates authentication. `ProfileWorkspace` composes the page; `Stat`, `PanelHeading` and `PersonalInformation` share structure. `ProfileDialogs` owns saved items, notification preferences, avatar selection, security and a travel checklist. Existing `HomeDialog` and `HomeState` provide focus-managed dialogs and loading/error/empty states. CSS is scoped in `profile.module.css`.

## APIs and behavior

| Function                 | Existing mobile backend / behavior                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Profile                  | `GET /users/me`                                                                                                                |
| Personal information     | `PUT /users/me`, with validated name, email, phone and optional website base city                                              |
| Avatar                   | `PUT /users/me/avatar`, multipart photo, using the existing image upload service                                               |
| Security                 | `PUT /users/me/password`; current/new password and confirmation are entered by the customer                                    |
| Logout                   | Existing customer logout/session cleanup                                                                                       |
| Booking summary          | Existing `getBookingItineraries`, including every API page across rides, stays, tours and guides                               |
| Saved account items      | `GET /favorites`; existing trip/hotel/public-provider APIs supply listing names and links                                      |
| Saved destinations       | Existing owner-specific device storage from `useSavedDestinations`                                                             |
| Notification preferences | `GET` and `PATCH /notifications/preferences`; applies to registered mobile push devices, without requesting browser permission |

Completed journeys include completed bookings only. Active journeys include pending, confirmed, payment-verification and disputed bookings, with the earliest dated record linked to its precise booking status. Expired, cancelled, refunded and unknown states do not inflate the active count. Saved items are unique per service type and target ID; device-saved destinations are labeled separately. Missing or unavailable counts show an em dash while loading or after a query failure, rather than a fabricated zero.

The Personal Information form validates before any request, submits the actual visible form values and retains drafts when a server request fails. Cancel restores the current loaded profile. A successful save updates the owner-scoped profile query, stored customer identity and shared auth state. Changing the customer remounts the workspace, clearing drafts and dialogs. Late save responses cannot overwrite another account's stored session. A save reads the latest profile before merging the optional base city into `preferences.websiteProfile.baseCity`, retaining unrelated preferences such as notification settings.

Avatar selection previews locally; upload happens only after Save photo. Supported formats are JPEG, PNG, WebP and GIF up to 5 MB. Missing or broken avatars fall back to initials. An image failure does not replace the user's photo with a sample person or landscape.

Light/Dark appearance is scoped to this account page and its dialogs, with owner-specific persistence on this device. Light mode keeps the requested white page background. Shared header/footer and other routes retain their established styling.

The payment section shows recorded paid booking totals separately for each currency and excludes refunded bookings. Its second tile counts pending refunds. Recent records link to the correct booking and display actual payment states. These are booking records, not spendable credit or an escrow balance. No card enrollment, withdrawal or financial transaction is introduced.

## Reference data and limits

The Figma sample name, portrait, counts, reputation score, Gold Tier, eco certification, verified email/phone/CNIC, biometric clearance, medical profile, emergency-service availability, VHF frequency, wallet balances and stored bank/card accounts are not supplied by these customer APIs. The implementation uses factual account labels, an unavailable guest rating, booking payment records, published provider contacts and a practical travel checklist in their corresponding layout areas. It does not create unsupported identity, medical, escrow or rescue guarantees. No medical or identification document data is collected by this screen.

Saved-item dialogs distinguish loading/error/empty states. Listing details are loaded in small batches as the customer chooses Show more; unavailable listings retain a fallback entry. Existing backend upload configuration is required for avatar saves; failures remain visible without altering the profile.

The connector account could not access this Figma file. The existing authorized signed-in browser supplied the selected 1280×2184 PNG reference; its temporary export setting was removed. The reference render is not used as an implementation asset. Avatar imagery is dynamic; icons reuse Lucide.

## Verification

- `node --experimental-strip-types --test tests/customer-profile.test.mjs tests/customer-chat.test.mjs tests/booking-itineraries.test.mjs tests/hotel-details.test.mjs tests/explore-catalog.test.mjs tests/explore-destinations.test.mjs tests/home-discovery.test.mjs` — 41 tests.
- Profile tests cover contact normalization/validation, preservation of unrelated preferences, missing settings, state-based booking totals with separate currencies, saved-item deduplication and password confirmation rules.
- `npm run typecheck`, targeted ESLint for the new profile components, service, helpers and account page, then `npm run build`.
- Browser checks: actual signed-in identity, zero completed/active journeys matching the account's expired bookings, payment history, invalid-name validation without an API write, Cancel/reset, appearance persistence and restoration to Light, notification preferences, saved empty state, avatar/security dialogs, section navigation and responsive widths from 320px to 1920px.
- QA does not submit valid profile changes, upload a profile photo, change a password, change notification settings or sign the customer out. Those mutation controls are wired to existing APIs and remain customer actions.

The pre-existing legacy menu-close effect in `site-header.tsx` triggers `react-hooks/set-state-in-effect` when linting that entire file. The profile route only adds a shared-header condition; the unrelated effect is preserved.

Targeted lint reports no errors. The shared `customer-api.ts` retains its existing warning about the session-expiry redirect using `window.location.href`; the added stored-user helper does not change that redirect.
