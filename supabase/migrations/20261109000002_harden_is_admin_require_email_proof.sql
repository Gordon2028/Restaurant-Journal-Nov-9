-- Applied as "harden_is_admin_require_email_proof".
-- The project auto-confirms emails, so an unverified account could carry any email address.
-- Admin access therefore also requires that this session signed in by proving inbox/provider
-- ownership (magic link / OTP / OAuth), not by password.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from private.admins a
    where lower(a.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      and exists (
        select 1
        from jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) m
        where m ->> 'method' in ('otp', 'magiclink', 'oauth')
      )
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
