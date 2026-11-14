-- Plate: restaurant journal schema. RLS on every table; explicit grants (no reliance on default exposure).
-- Applied to project xtwufadawcybkymynmop as "plate_initial_schema".

create schema if not exists private;

-- ───────── Tables ─────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key,  -- deterministic from external_id (see client), so every user shares one row per place
  external_id text not null unique check (char_length(external_id) between 1 and 200),
  name text not null check (char_length(name) between 1 and 200),
  address text not null default '' check (char_length(address) <= 300),
  neighborhood text not null default '' check (char_length(neighborhood) <= 120),
  cuisine text not null default '' check (char_length(cuisine) <= 80),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id uuid not null references public.places (id),
  rating text not null check (rating in ('up', 'down')),
  dish_name text not null default '' check (char_length(dish_name) <= 120),
  photo_path text not null default '' check (char_length(photo_path) <= 300),
  note text not null default '' check (char_length(note) <= 2000),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A visit may only point at a photo inside its owner's own storage folder.
  constraint visits_photo_in_own_folder check (photo_path = '' or photo_path like (user_id::text || '/%'))
);
create index visits_user_visited_idx on public.visits (user_id, visited_at desc);
create index visits_place_idx on public.visits (place_id);

create table public.lists (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 100),
  description text not null default '' check (char_length(description) <= 400),
  slug text not null unique check (slug ~ '^[A-Za-z0-9]{8,32}$'),
  is_public boolean not null default false,
  show_owner_name boolean not null default false,
  share_dishes boolean not null default true,
  share_tags boolean not null default true,
  share_photos boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_user_idx on public.lists (user_id, created_at desc);

create table public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  visit_id uuid not null references public.visits (id) on delete cascade,
  position integer not null default 0,
  primary key (list_id, visit_id)
);
create index list_items_visit_idx on public.list_items (visit_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,  -- null = anonymous viewer of a shared list
  name text not null check (name in ('capture_started','capture_completed','search_performed','recall_result_opened','list_created','list_shared','shared_list_viewed')),
  props jsonb not null default '{}' check (pg_column_size(props) < 2000),
  at timestamptz not null default now()
);
create index events_at_idx on public.events (at desc);

-- Who may see the internal metrics page. Not exposed through the API.
create table private.admins (email text primary key);

-- ───────── updated_at ─────────
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger visits_updated before update on public.visits for each row execute function public.set_updated_at();
create trigger lists_updated before update on public.lists for each row execute function public.set_updated_at();

-- ───────── Row Level Security ─────────
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.visits enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.events enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Shared cache of real-world places. Hand-typed ("manual:") places are private to whoever typed them,
-- because they may carry that person's position.
create policy places_select on public.places for select to authenticated
  using (external_id not like 'manual:%' or created_by = (select auth.uid()));
create policy places_insert on public.places for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy visits_select_own on public.visits for select to authenticated using (user_id = (select auth.uid()));
create policy visits_insert_own on public.visits for insert to authenticated with check (user_id = (select auth.uid()));
create policy visits_update_own on public.visits for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy visits_delete_own on public.visits for delete to authenticated using (user_id = (select auth.uid()));

create policy lists_select_own on public.lists for select to authenticated using (user_id = (select auth.uid()));
create policy lists_insert_own on public.lists for insert to authenticated with check (user_id = (select auth.uid()));
create policy lists_update_own on public.lists for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy lists_delete_own on public.lists for delete to authenticated using (user_id = (select auth.uid()));

create policy list_items_select on public.list_items for select to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_items_insert on public.list_items for insert to authenticated
  with check (
    exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid()))
    and exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid())));
create policy list_items_update on public.list_items for update to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid()))
    and exists (select 1 from public.visits v where v.id = visit_id and v.user_id = (select auth.uid())));
create policy list_items_delete on public.list_items for delete to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- Events are write-only for users; nobody reads them through the API except admins via admin_events().
create policy events_insert_own on public.events for insert to authenticated with check (user_id = (select auth.uid()));

-- ───────── Grants (least privilege) ─────────
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.places to authenticated;
grant select, insert, update, delete on public.visits to authenticated;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.list_items to authenticated;
grant insert on public.events to authenticated;
grant all on all tables in schema public to service_role;

-- ───────── Functions ─────────
-- Replace a list's items atomically. SECURITY INVOKER: RLS still applies, so it only works on your own list and visits.
create function public.save_list_items(p_list_id uuid, p_visit_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.list_items where list_id = p_list_id and not (visit_id = any (p_visit_ids));
  insert into public.list_items (list_id, visit_id, position)
  select p_list_id, t.v, t.ord - 1 from unnest(p_visit_ids) with ordinality as t (v, ord)
  on conflict (list_id, visit_id) do update set position = excluded.position;
end $$;
revoke execute on function public.save_list_items(uuid, uuid[]) from public, anon;
grant execute on function public.save_list_items(uuid, uuid[]) to authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admins a where lower(a.email) = lower(coalesce((select auth.jwt()) ->> 'email', '')));
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create function public.admin_events()
returns table (id uuid, user_id uuid, name text, props jsonb, at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, e.user_id, e.name, e.props, e.at
  from public.events e
  where (select public.is_admin());
$$;
revoke execute on function public.admin_events() from public, anon;
grant execute on function public.admin_events() to authenticated;

-- ───────── Storage: private photo bucket, one folder per user ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy photos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
