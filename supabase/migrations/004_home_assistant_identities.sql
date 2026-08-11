-- ============================================================
-- HomeDesk 2.4
-- Home Assistant <-> HomeDesk identity mapping
-- ============================================================

create table if not exists public.home_assistant_identities (
  home_assistant_user_id text primary key,

  supabase_user_id uuid not null unique
    references auth.users(id)
    on delete cascade,

  home_assistant_name text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table public.home_assistant_identities is
  'Maps an authenticated Home Assistant user to an existing HomeDesk/Supabase user.';

comment on column public.home_assistant_identities.home_assistant_user_id is
  'Stable Home Assistant user ID returned by auth/current_user.';

comment on column public.home_assistant_identities.supabase_user_id is
  'Existing HomeDesk user in auth.users.';


-- ============================================================
-- SECURITY
-- ============================================================

alter table public.home_assistant_identities
  enable row level security;

-- No client-side access.
-- This table is intentionally managed only by trusted
-- server-side HomeDesk functions using the service role.

revoke all on table public.home_assistant_identities
  from anon;

revoke all on table public.home_assistant_identities
  from authenticated;


-- ============================================================
-- INDEX
-- ============================================================

create index if not exists
  home_assistant_identities_supabase_user_id_idx
on public.home_assistant_identities (supabase_user_id);


-- ============================================================
-- updated_at
-- ============================================================

create or replace function public.set_home_assistant_identity_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  set_home_assistant_identity_updated_at
on public.home_assistant_identities;

create trigger
  set_home_assistant_identity_updated_at
before update
on public.home_assistant_identities
for each row
execute function public.set_home_assistant_identity_updated_at();
