-- HomeDesk MVP schema + RLS
create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'user');
create type public.ticket_status as enum ('new', 'seen', 'planned', 'in_progress', 'waiting_feedback', 'waiting_parts', 'tested', 'done', 'rejected', 'archived');
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.ticket_visibility as enum ('public', 'internal');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.user_role not null default 'user',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) >= 5),
  description text not null check (char_length(description) >= 10),
  status public.ticket_status not null default 'new',
  priority public.ticket_priority not null default 'normal',
  type text not null,
  category text not null,
  area text not null,
  device text,
  entity_id text,
  desired_date date,
  created_by uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  archived_at timestamptz
);

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  visibility public.ticket_visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size integer not null check (file_size <= 10485760),
  created_at timestamptz not null default now()
);

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  old_value text,
  new_value text,
  metadata jsonb,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.ticket_reads (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (ticket_id, user_id)
);

create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

create index tickets_created_by_idx on public.tickets(created_by);
create index tickets_status_idx on public.tickets(status);
create index tickets_priority_idx on public.tickets(priority);
create index tickets_updated_at_idx on public.tickets(updated_at desc);
create index ticket_comments_ticket_id_idx on public.ticket_comments(ticket_id);
create index ticket_events_ticket_id_idx on public.ticket_events(ticket_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tickets_updated_at before update on public.tickets
for each row execute function public.set_updated_at();

create trigger trg_ticket_comments_updated_at before update on public.ticket_comments
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_ticket(ticket_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tickets
    where id = ticket_uuid and created_by = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'user')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.log_ticket_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ticket_events(ticket_id, actor_id, event_type, new_value)
  values (new.id, new.created_by, 'ticket_created', new.status::text);
  return new;
end;
$$;

create trigger trg_ticket_created after insert on public.tickets
for each row execute function public.log_ticket_created();

create or replace function public.log_ticket_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into public.ticket_events(ticket_id, actor_id, event_type, old_value, new_value)
    values (new.id, auth.uid(), 'status_changed', old.status::text, new.status::text);
  end if;
  if old.priority is distinct from new.priority then
    insert into public.ticket_events(ticket_id, actor_id, event_type, old_value, new_value)
    values (new.id, auth.uid(), 'priority_changed', old.priority::text, new.priority::text);
  end if;
  if old.category is distinct from new.category then
    insert into public.ticket_events(ticket_id, actor_id, event_type, old_value, new_value)
    values (new.id, auth.uid(), 'category_changed', old.category, new.category);
  end if;
  return new;
end;
$$;

create trigger trg_ticket_changes after update on public.tickets
for each row execute function public.log_ticket_changes();

alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_events enable row level security;
alter table public.ticket_reads enable row level security;
alter table public.settings enable row level security;

-- profiles
create policy "profiles_read_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_name" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_admin_update" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

-- tickets
create policy "tickets_select_own_or_admin" on public.tickets
for select using (public.is_admin() or created_by = auth.uid());

create policy "tickets_insert_own" on public.tickets
for insert with check (created_by = auth.uid());

create policy "tickets_admin_all" on public.tickets
for all using (public.is_admin()) with check (public.is_admin());

create policy "tickets_user_limited_update" on public.tickets
for update using (created_by = auth.uid())
with check (
  created_by = auth.uid()
  and assigned_to is null
  and status in ('new', 'seen', 'planned', 'in_progress', 'waiting_feedback', 'waiting_parts', 'tested', 'done')
);

-- comments
create policy "comments_select_visible" on public.ticket_comments
for select using (
  public.is_admin()
  or (visibility = 'public' and public.owns_ticket(ticket_id))
);

create policy "comments_insert_public_own" on public.ticket_comments
for insert with check (
  author_id = auth.uid()
  and visibility = 'public'
  and public.owns_ticket(ticket_id)
);

create policy "comments_admin_all" on public.ticket_comments
for all using (public.is_admin()) with check (public.is_admin());

-- attachments metadata; storage bucket policies are in 002_storage.sql
create policy "attachments_select_own_or_admin" on public.ticket_attachments
for select using (public.is_admin() or public.owns_ticket(ticket_id));

create policy "attachments_insert_own_or_admin" on public.ticket_attachments
for insert with check (uploaded_by = auth.uid() and (public.is_admin() or public.owns_ticket(ticket_id)));

create policy "attachments_admin_delete" on public.ticket_attachments
for delete using (public.is_admin());

-- events
create policy "events_select_visible" on public.ticket_events
for select using (public.is_admin() or (public.owns_ticket(ticket_id) and internal = false));

create policy "events_admin_all" on public.ticket_events
for all using (public.is_admin()) with check (public.is_admin());

-- reads
create policy "reads_own" on public.ticket_reads
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- settings
create policy "settings_read_authenticated" on public.settings
for select using (auth.role() = 'authenticated');

create policy "settings_admin_all" on public.settings
for all using (public.is_admin()) with check (public.is_admin());
