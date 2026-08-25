-- HomeDesk 3.0: intelligence, relations, automation and notifications
create type public.ticket_relation_type as enum ('relates_to', 'blocks', 'duplicates', 'caused_by');
create type public.recurrence_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');

alter table public.tickets
  add column due_at timestamptz,
  add column solution_summary text,
  add column root_cause text,
  add column resolution_steps text,
  add column escalation_level smallint not null default 0 check (escalation_level between 0 and 3),
  add column escalated_at timestamptz,
  add column source text not null default 'manual',
  add column source_reference text;

create table public.ticket_subtasks (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 200), completed boolean not null default false,
  position integer not null default 0, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.ticket_relations (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade,
  related_ticket_id uuid not null references public.tickets(id) on delete cascade,
  relation_type public.ticket_relation_type not null default 'relates_to', created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), check (ticket_id <> related_ticket_id), unique(ticket_id, related_ticket_id, relation_type)
);
create table public.ticket_watchers (
  ticket_id uuid not null references public.tickets(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(ticket_id, user_id)
);
create table public.ticket_recurrences (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null unique references public.tickets(id) on delete cascade,
  frequency public.recurrence_frequency not null, interval_count integer not null default 1 check(interval_count between 1 and 365),
  next_run_at timestamptz not null, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.push_devices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check(platform in ('android','web')), token text not null unique, enabled boolean not null default true,
  last_seen_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(), name text not null, trigger_type text not null,
  conditions jsonb not null default '{}'::jsonb, actions jsonb not null default '[]'::jsonb,
  enabled boolean not null default true, created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

create index tickets_due_at_idx on public.tickets(due_at) where due_at is not null;
create index ticket_subtasks_ticket_idx on public.ticket_subtasks(ticket_id, position);
create index ticket_relations_ticket_idx on public.ticket_relations(ticket_id);
create index ticket_watchers_user_idx on public.ticket_watchers(user_id);

alter table public.ticket_subtasks enable row level security;
alter table public.ticket_relations enable row level security;
alter table public.ticket_watchers enable row level security;
alter table public.ticket_recurrences enable row level security;
alter table public.push_devices enable row level security;
alter table public.automation_rules enable row level security;
create policy "subtasks_visible" on public.ticket_subtasks for select using (public.is_admin() or public.owns_ticket(ticket_id));
create policy "subtasks_admin" on public.ticket_subtasks for all using (public.is_admin()) with check(public.is_admin());
create policy "relations_visible" on public.ticket_relations for select using (public.is_admin() or public.owns_ticket(ticket_id));
create policy "relations_admin" on public.ticket_relations for all using (public.is_admin()) with check(public.is_admin());
create policy "watchers_visible" on public.ticket_watchers for select using (public.is_admin() or public.owns_ticket(ticket_id) or user_id=auth.uid());
create policy "watchers_own" on public.ticket_watchers for all using (user_id=auth.uid()) with check(user_id=auth.uid() and (public.is_admin() or public.owns_ticket(ticket_id)));
create policy "recurrences_visible" on public.ticket_recurrences for select using (public.is_admin() or public.owns_ticket(ticket_id));
create policy "recurrences_admin" on public.ticket_recurrences for all using(public.is_admin()) with check(public.is_admin());
create policy "push_devices_own" on public.push_devices for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "automation_admin" on public.automation_rules for all using(public.is_admin()) with check(public.is_admin());

-- Scheduled by Supabase Cron: escalates overdue, still-open tickets.
create or replace function public.escalate_overdue_tickets() returns integer language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
  update tickets set escalation_level=least(3, escalation_level+1), escalated_at=now()
  where due_at < now() and status not in ('done','rejected','archived')
    and (escalated_at is null or escalated_at < now()-interval '24 hours');
  get diagnostics affected = row_count; return affected;
end $$;

-- Home Assistant may call this through a tightly scoped service-role Edge Function.
create or replace function public.create_ha_ticket(p_title text, p_description text, p_entity_id text, p_area text, p_created_by uuid, p_source_reference text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  insert into tickets(title,description,type,category,area,entity_id,created_by,source,source_reference)
  values(p_title,p_description,'Störung','Smart Home',p_area,p_entity_id,p_created_by,'home_assistant',p_source_reference)
  returning id into new_id; return new_id;
end $$;

-- Privileged automation entrypoints are server-only. PostgreSQL otherwise
-- grants function execution to PUBLIC by default, even with table RLS enabled.
revoke all on function public.create_ha_ticket(text, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_ha_ticket(text, text, text, text, uuid, text) to service_role;
revoke all on function public.escalate_overdue_tickets() from public, anon, authenticated;
grant execute on function public.escalate_overdue_tickets() to service_role;
