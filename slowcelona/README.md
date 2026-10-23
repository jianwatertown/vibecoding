# Slowcelona V2

Next.js + TypeScript on Vercel, with Google Sheets as the only persistent store. No Apps Script frontend dependency, separate database, payment processor, or login for players.

## Player flow

Open the permanent link → choose an active player → confirm age 18+ → read the visible waiver → type full name → explicitly agree → **RESERVE MY SPOT**. The selected player ID is remembered on that browser. There is no second arrival check-in and no public cancellation. A reservation is a commitment to pay, including no-shows.

`/club` contains the existing red/blue uniform links, Venmo, and the three actual visits + watermelon/Gatorade WeChat tradition. The organizer confirms actual visits; reservation counts do not prove attendance.

Under-18 players see **Parent consent needed**. Online youth signing is deliberately not enabled until a suitable guardian consent form is provided. The adult waiver cannot substitute for that form. The current adult wording removes the old COVID attestations; the signed original PDF was not published.

## Admin: the existing Google Sheet

- **Players**: existing roster, active flags, prepaid balances, formulas. App reads only.
- **Games**: next date on or after today in America/Los_Angeles wins. `active` is ignored. Extend the seeded schedule when it runs out. Dates must be ISO `YYYY-MM-DD` or native Sheets dates. An optional `cancelled` boolean column is supported if added later.
- **Attendance**: untouched historical actual attendance. V2 never appends fake arrival records.
- **Reservations**: one row per game/player, status `reserved`. To waive a chargeable reservation, change status to `waived` and record the reason in `admin_notes`. `cancelled` also excludes it from counts. Do not delete rows. Restoring status to `reserved` restores the commitment. The app will not recreate admin-adjusted reservations.
- **WaiverAcceptances**: full typed participant name, timestamp, version, SHA-256, and exact checkbox wording saved with the reservation. Treat as a private audit record. Name selection/signing is an honor system, not identity verification.
- **WaiverVersions**: exact unsigned waiver text for each version. Never overwrite a published version; create a new version and redeploy.
- **Season Summary**: edit **B3/B4** for the playing period. Counts combine historical Attendance and reserved Reservations and count each game/player once. Hidden J:L contain the calculation helper. The existing Players credit balance is displayed for reference.

**Billing remains manual.** Final pricing/settlement was intentionally deferred. Existing Players charge/owed formulas still cover the V1 Attendance records only; they do not calculate V2 reservation charges. Season Summary supplies the combined count; review prepaid credits and earlier settlements before calculating a final bill. Do not deduct the same historical charges twice.

The original five tabs and their formulas were backed up locally before changes, then compared byte-for-byte after setup. Private backups under `.private/` must never be published. Sheet sharing is restricted to the owner and the service account, while the public API returns only names, IDs, game date, reservation names, and waiver version/hash.

## Setup and maintenance

Node 24. Run `npm ci`, configure `.env.local` from `.env.example`, then `npm run dev`. Credentials belong only in local ignored environment files and Vercel server environment variables. Never use a `NEXT_PUBLIC_` variable for a credential or copy the JSON key into this project.

`npm run build`, `npm test`, `npm run typecheck`.

The service account needs editor access only to the selected sheet and the Sheets API enabled. In Vercel production configure `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`, and `SITE_URL`. `SITE_URL` determines the printed QR target. Deploy with `npx vercel deploy --prod --scope watertown` from this directory. All secrets are configured as Vercel sensitive environment variables. Production must be public; preview deployments can remain protected.

Vercel project: `watertown/slowcelona`. No local computer must stay running after deployment. The old Apps Script deployment can remain as a fallback/history tool, but its QR is separate from V2.

## Write safety and failure behavior

A deterministic full SHA-256 reservation ID identifies each game/player pair. An atomic Sheets `batchUpdate` creates a unique developerMetadata numeric ID and appends both reservation and acceptance rows together. Google rejects duplicate metadata IDs and rejects the whole batch if any request fails. Full-key comparison and deterministic alternate slots handle numeric hash collisions. A read after ambiguous write failures recovers a committed reservation. Do not manually remove the developer metadata; it is the idempotency tombstone.

This works across Vercel instances; no process-local mutex is used for uniqueness. The public roster coalesces reads and caches for 10 seconds, refreshes every 30 seconds and on focus, and immediately adds a successful reservation. If a write times out, the user can safely retry. Server errors log only an error code and request ID, never credentials or waiver text.

Google Sheets has API quotas; this is designed for a small pickup group. The homepage, club guide, and waiver render independently of Google API availability. Live requests have timeouts, loading indicators, visible errors, and a retry control. In a Google outage, existing records remain in the Sheet; new reservations require retrying when access returns.

Sources: [Sheets batch atomicity](https://developers.google.com/workspace/sheets/api/guides/batch), [developer metadata identifiers](https://developers.google.com/workspace/sheets/api/guides/metadata), [Vercel authentication settings](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

## Verification

21 automated checks cover LA midnight/DST, game rollover, inactive flags, cancellation, privacy projection, explicit adult consent, exact waiver hash, 20 concurrent attempts, a lost write response, numeric metadata collisions, admin tombstones, and invalid HTTP requests. A separate synthetic Google Sheet was used to verify real API concurrency and batch atomicity, with exactly one reservation/acceptance after concurrent writes. HTTP tests verify invalid player/game, missing consent, under-18 rejection, successful reservation, and duplicate retries. Production has no synthetic player or reservation rows.

Before a wording update, replace `content/waiver.json` with a new version/hash, run tests, append its archived text with `scripts/sheets.ts setup`, then redeploy. Client requests send the hash of the text actually bundled into their page, so an older page cannot silently accept newer wording.

## Launch details (October 11, 2026)

- Permanent site: https://www.slowcelona.com
- Immediate Vercel fallback: https://slowcelona.vercel.app
- Printable QR: `/qr` (encoded URL verified with an independent decoder)
- Existing GitHub QR page updated: https://jianwatertown.github.io/vibecoding/soccer.html
- Squarespace remains the registrar/DNS provider. Website DNS uses Vercel's assigned CNAME and two root A records. The root redirects to `www` with HTTP 308. TLS certificates were issued and verified against the Vercel edge. Old recursive DNS caches may temporarily show the former Squarespace site.
- Squarespace site subscription and old submissions were not deleted. Admin access remains at https://disc-chicken-9xn2.squarespace.com/config/
- Domain expiry shown by Squarespace: October 1, 2027; auto-renew was off at launch. No renewal/payment settings were changed.

Usual warm reservation traffic uses one batch read and one atomic write. Sheet IDs are cached for 10 minutes; conflicts and ambiguous failures trigger additional reads. Newly confirmed reservations remain visible during the brief public cache window.

## Game details

Games columns M (`time`) and N (`location`) supply the public game details. October 11 and 18, 2026 were imported from the organizer’s Slowcelona calendar events: 8–10 PM Pacific, Robinswood Soccer 1 East. When `GOOGLE_CALENDAR_ID` is configured, the server refreshes confirmed Slowcelona calendar events on demand, at most once every five minutes per server instance. Without that setting, these fields remain manually managed. The game card labels the current Los Angeles date “TODAY.”

The game card shows arrival 30 minutes before the game time (for example, arrive 7:30 PM for an 8–10 PM game). Keep the actual kickoff time in `Games.time`; do not subtract the lead time in the Sheet. Use a 12-hour range such as `8–10 PM Pacific` or `11 AM–1 PM Pacific`.

## New player signup

“Name not listed? Sign up” opens a name-only popup. Signup creates an active `pay_per_game` player with zero prepaid credit/payments, selects the player, and continues through the existing age/waiver/reservation flow. It never signs a waiver or reserves automatically. Names are public in the roster. Matching names (case/spacing normalized) reuse the existing active entry; inactive or ambiguous matches require organizer review.

Signup atomically claims both the normalized-name ID and an unused Players row using developer metadata. Only A:C and E:G are written; the credit and reporting array formulas are preserved. The current roster supports up to row 1000; adding capacity later requires extending the allocator. Do not delete signup metadata or reuse claimed rows manually.

## Hosting and source

- Vercel (`watertown/slowcelona`) runs the website and server API continuously; the organizer’s computer can be off.
- Google Sheets stores the roster, game schedule, reservations, consent records and summaries. The Vercel server accesses only the shared spreadsheet through a Google service account. Google Cloud holds that service account and API configuration.
- Google Calendar sync is available behind `GOOGLE_CALENDAR_ID`. Enable Google Calendar API in the service-account project and share the selected calendar read-only with the service account before setting this variable.
- Squarespace holds the domain registration and DNS records pointing `slowcelona.com` to Vercel. The old Squarespace site is not the reservation backend.
- GitHub (`jianwatertown/vibecoding/slowcelona`) stores this source backup. The existing GitHub Pages QR entry remains in `docs/soccer.html`. Deployments currently use the Vercel CLI; pushing this folder alone does not automatically deploy it.

On every data refresh, the app chooses the earliest non-cancelled game dated today or later in Los Angeles time. Sunday’s game remains selected through Sunday night; after midnight Monday it advances to the next listed game. The Chinese announcement follows that selected game. With calendar sync enabled, only calendar-confirmed games are offered. New game dates are created automatically; moved events retain their game ID and reservations, and removed upcoming events are marked cancelled. No weekly background job is required: visiting the site triggers a refresh. Calendar errors stop live reservations until a refresh succeeds rather than showing an unverified schedule.

### Calendar sync configuration

The service account requires Calendar API enabled and “See all event details” access to the chosen calendar. Set `GOOGLE_CALENDAR_ID` only after verifying that access. The server requests the calendar.events.readonly OAuth scope and only reads event IDs, titles, status, start/end and location. Only titles containing the word Slowcelona are published. The next 180 days are read, including recurring instances; ambiguous same-day or untimed events require organizer review.

Games columns O–Q must be `cancelled`, `calendar_event_id`, `calendar_synced_at`. Preserve those tracking fields and existing game IDs. The sync writes dates and calendar details but does not change prices, player balances or reservation rows. Arrival remains 30 minutes before kickoff. Without `GOOGLE_CALENDAR_ID`, the previous Sheet-only behavior remains available.
