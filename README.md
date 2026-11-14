# Plate

A mobile-first, installable web app (PWA) that helps foodies remember the restaurants and dishes they've tried, find them again by dish, neighborhood or vibe, and share a list with a friend through a plain link.

**Status: connected to Supabase.** It works offline first (everything saves to the device), and syncs to your Supabase project when you're signed in. Without Supabase keys it runs fully on the device. Backend details: [docs/backend.md](docs/backend.md).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Copy `.env.example` to `.env.local` and fill in your Supabase URL and **publishable** key (Project Settings → API). With them set, sign-in is a real email link. Leave them empty to try the app in local-only mode (any email works, nothing is sent). In local-only mode and on the dev server, **Settings → Add sample spots** loads 25 made-up NYC visits.

Before the email link works, add your app's address to Supabase → Authentication → URL Configuration (see [docs/backend.md](docs/backend.md)).

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run preview` | Production build (includes PWA service worker) |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint (`no-explicit-any` is an error) |
| `npm test` | Vitest unit tests (ranking, place matching, share whitelist, metrics, data layer, offline outbox, sync merge) |
| `npm run e2e` | Playwright: builds in local-only mode (never touches the real backend), then runs the happy path. First time: `npx playwright install chromium` |
| `node scripts/make-icons.mjs` | Regenerates PWA icons |

## Stack

React 19 + Vite + TypeScript (strict), React Router, Tailwind CSS v4, `idb` (IndexedDB), `@supabase/supabase-js`, MapLibre GL (OSM tiles), `vite-plugin-pwa`, `exifr`, `lz-string`, Vitest, Playwright. The Vite template ships oxlint rather than ESLint, so that is what we use.

## Environment variables

| Name | What |
| --- | --- |
| `VITE_SUPABASE_URL` | Your project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The publishable (public) key. Safe in the browser because every table has RLS. **Never** put the service-role/secret key in a `VITE_` variable. |
| `VITE_ENABLE_GOOGLE` | `true` once the Google provider is enabled in Supabase |
| `VITE_GOOGLE_PLACES_KEY` | Reserved for a future Google Places provider |

Set the first two in Vercel's project settings for production. The Edge Functions get their server-side keys from Supabase automatically.

## How it's organized

Every place that will talk to a server sits behind a small interface with a local implementation, so Supabase is a swap, not a rewrite:

| Seam | Interface | Today | Later |
| --- | --- | --- | --- |
| Sign-in | `services/auth/AuthService` | Supabase email + password (+ Google when enabled); local stand-in without keys | |
| Data | `services/data/repos.ts` | IndexedDB (instant, offline) + outbox sync to Supabase tables and Storage | |
| Places | `services/places/PlacesProvider` | OSM (Overpass, falling back to Nominatim) | Google Places (New) |
| Sharing | `services/share/ShareService` | `/l/slug` served by the `shared-list` Edge Function; text-snapshot links without keys | |
| Sync | `services/sync/supabaseSync` | push outbox, pull and merge | |

Pure logic lives in `src/domain` (search ranking, place matching, tags) and is unit tested.

## Decisions worth knowing

- **Capture**: photo → location → 3 nearest places → 👍/👎 → optional dish → save. Only the place and the thumb are required; the photo can be skipped. Location is requested only on that screen, with a one-line reason; the photo's GPS is used first when present. If location is denied or offline, you can type the restaurant name. Nothing about where you were is stored, only the chosen place.
- **Photos** are resized to 1600px max in the browser. GPS is read from the original, then the stored copy is re-encoded on a canvas, which drops all EXIF.
- **Search** is forgiving (typos, partial words) and weights dish > restaurant > vibe > neighborhood/cuisine, then recency.
- **Overpass is unreliable** from some networks (we saw HTTP 406), so nearby lookup falls back to bounded Nominatim searches. Both are fine for development but not for production traffic; use Google Places or a self-hosted instance.
- **OSM map tiles are for development.** Use a hosted tile provider in production.
- **"Week 3 retention"** is defined as: of people whose first log was 28+ days ago, the share who logged again 21–27 days after their first.

## Things to know

1. **Account data is also cached on the device.** Signing out clears that cache, after making sure everything was sent first (it warns you if something couldn't be).
2. **Local-only mode is a stand-in**: no real accounts, data stays in one browser, and shared links carry a text-only snapshot with no photos.
3. **Two devices editing the same visit offline**: the last one to sync wins.
4. **Public links** are on/off per list. Turning a list off stops its link immediately.
5. **Delete my account** removes the account and everything in it on the server (and this device).

## Later

Host mode / itinerary generation, "rut breaker" new-opening suggestions, friend feeds, camera-roll bulk import, SMS/voice capture, native apps; map pin clustering; Google sign-in; editing a visit's dish/rating; photos on shared pages (needs Storage).

## Verified so far / not verified

Verified: lint, typecheck, 41 unit tests (including the offline queue and sync merge rules), 3 Playwright tests in local-only mode (full happy path including opening a share link logged out, offline capture, map). Against the live Supabase project: the schema and RLS are applied; anonymous requests are refused on every table and function; the storage bucket is private; the two Edge Functions are deployed and behave correctly for unknown/malformed/unauthenticated calls; the app starts in online mode and shows the email sign-in.

**Not verified (needs a real signed-in session):** the actual email + password sign-in, push/pull sync with real rows and photos, the public page with real data, account deletion, and the admin metrics. Also not verified: real phone camera/EXIF, the native share sheet, installing to a home screen, and Lighthouse.
