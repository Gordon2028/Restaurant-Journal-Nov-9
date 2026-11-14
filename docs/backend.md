# Backend (Supabase)

Project `xtwufadawcybkymynmop` (`https://xtwufadawcybkymynmop.supabase.co`). The schema lives in `supabase/migrations/`, the two Edge Functions in `supabase/functions/`. Both are already deployed.

## How the app uses it

The app is **local-first**. Everything is saved to the device (IndexedDB) first, so capture is instant and works offline. When you're signed in and online:

1. **Push**: each local change adds an entry to an outbox (`visit:<id>`, `list:<id>`). A sync sends them: place → photo (Storage) → visit, then lists, then deletions. An entry is only cleared if it wasn't edited again while being sent.
2. **Pull**: the server's visits, places and lists are merged in. Anything with unsent local changes wins; anything deleted on another device is removed here (`src/services/sync/planPull.ts`, unit tested).
3. Syncs run on sign-in, when the connection returns, when the app comes back to the foreground, and ~1 second after you save or edit.

With no `VITE_SUPABASE_*` values the app runs entirely on the device, exactly as before (this is also what the tests use).

## Tables (all with RLS)

| Table | Who can do what |
| --- | --- |
| `profiles` | own row |
| `places` | any signed-in user reads/inserts real places (shared cache); hand-typed `manual:` places are private to their creator |
| `visits` | own rows. `photo_path` must be inside the owner's own folder (enforced by a check constraint) |
| `lists`, `list_items` | own rows; `list_items` also requires you own the visit |
| `events` | insert only, as yourself. Read through `admin_events()` by admins |

Photos: private bucket `visit-photos`, one folder per user id, JPEG only, 5 MB max. `anon` has no table access at all.

## Public lists (`/l/:slug`)

`shared-list` Edge Function (no login). Looks up a list by slug where `is_public = true` and returns an explicit whitelist: title, note, optional first name, and per place: name, neighborhood, cuisine, dish/tags/photo only if the owner allowed them, rating, and the place's coordinates rounded to ~1 m. It never returns timestamps, ids, notes or photo paths. Photos are 1-hour signed URLs. Turning a list off ("Anyone with the link can view") makes the link stop working immediately. Each view is logged as an anonymous `shared_list_viewed` event.

## Account deletion

`delete-account` Edge Function (requires a signed-in user). Removes the user's photos, then the auth user (foreign keys cascade to profile, visits, lists, list items, events), then leftover hand-typed places.

## Admin metrics

`/admin/metrics` shows everyone's numbers to admins, and only the device's own numbers to everyone else. To make yourself an admin, **sign in once with the email link**, then run in the SQL editor:

```sql
insert into private.admins (email) values ('you@example.com');
```

Admin checks require an OTP/OAuth sign-in (see migration 2). Because the app now signs in with email + password and email confirmation is off, password sessions are deliberately NOT treated as admin: anyone could register an unverified account with the admin's address. To allow admin over password, first turn "Confirm email" on, then add `password` to the allowed `amr` methods in `is_admin()`.

## Dashboard settings you need to check (can't be done from code)

1. **Authentication → URL Configuration**: add your app's address(es) to *Redirect URLs*, for example `http://localhost:5173/**` and your production URL, and set *Site URL* to the production URL. Without this, the email link sends people to the wrong place.
2. **Authentication → Providers → Email → "Confirm email"**: currently **off** (users are auto-confirmed). Turn it on so nobody can create an account with someone else's email.
3. Supabase's built-in email sender is limited to a few emails per hour; add your own SMTP provider before real users arrive.
4. **Google sign-in** (optional): enable the Google provider with your Google Cloud OAuth client, then set `VITE_ENABLE_GOOGLE=true`.

## Not yet covered

- No rate limiting on `shared-list` (slugs are ~58 bits of randomness, so guessing isn't practical, but scraping a known link is possible).
- Events are sent best-effort; a failed send is dropped, not retried.
- Last-write-wins on conflicts between two devices editing the same visit offline.
