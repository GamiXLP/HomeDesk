-- HomeDesk 3.1: asset registry, maintenance, health, templates and notification inbox.
alter table public.tickets
  add column asset_id uuid,
  add column tags text[] not null default '{}',
  add column approval_required boolean not null default false,
  add column approved_at timestamptz,
  add column approved_by uuid references public.profiles(id) on delete set null,
  add column reopened_count integer not null default 0,
  add column response_due_at timestamptz,
  add column first_response_at timestamptz;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(trim(name)) between 2 and 160),
  manufacturer text, model text, serial_number text, purchase_date date, warranty_until date,
  area text not null default 'Allgemein', category text not null default 'Geräte',
  notes text, image_url text, health_override smallint check(health_override between 0 and 100),
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.asset_entities (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references public.assets(id) on delete cascade,
  entity_id text not null, label text, created_at timestamptz not null default now(), unique(asset_id,entity_id)
);
alter table public.tickets add constraint tickets_asset_id_fkey foreign key(asset_id) references public.assets(id) on delete set null;

create table public.maintenance_plans (
  id uuid primary key default gen_random_uuid(), asset_id uuid references public.assets(id) on delete cascade,
  title text not null, description text, frequency public.recurrence_frequency not null default 'monthly', interval_count integer not null default 1 check(interval_count between 1 and 365),
  next_due_at timestamptz not null, last_completed_at timestamptz, active boolean not null default true,
  auto_create_ticket boolean not null default true, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.ticket_templates_v3 (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  ticket_defaults jsonb not null default '{}'::jsonb, subtasks text[] not null default '{}', active boolean not null default true,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.user_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade, kind text not null, title text not null, body text,
  metadata jsonb not null default '{}'::jsonb, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.ticket_approvals (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade,
  requested_by uuid not null references public.profiles(id), requested_from uuid not null references public.profiles(id),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  note text, decided_at timestamptz, created_at timestamptz not null default now(), unique(ticket_id,requested_from,status)
);

create index assets_area_idx on public.assets(area);
create index asset_entities_entity_idx on public.asset_entities(entity_id);
create index maintenance_next_due_idx on public.maintenance_plans(next_due_at) where active;
create index user_notifications_unread_idx on public.user_notifications(user_id,created_at desc) where read_at is null;
create index tickets_asset_idx on public.tickets(asset_id);

create trigger trg_assets_updated_at before update on public.assets for each row execute function public.set_updated_at();
alter table public.assets enable row level security; alter table public.asset_entities enable row level security;
alter table public.maintenance_plans enable row level security; alter table public.ticket_templates_v3 enable row level security;
alter table public.user_notifications enable row level security; alter table public.ticket_approvals enable row level security;
create policy "assets_read" on public.assets for select using(auth.role()='authenticated');
create policy "assets_admin" on public.assets for all using(public.is_admin()) with check(public.is_admin());
create policy "asset_entities_read" on public.asset_entities for select using(auth.role()='authenticated');
create policy "asset_entities_admin" on public.asset_entities for all using(public.is_admin()) with check(public.is_admin());
create policy "maintenance_read" on public.maintenance_plans for select using(auth.role()='authenticated');
create policy "maintenance_admin" on public.maintenance_plans for all using(public.is_admin()) with check(public.is_admin());
create policy "templates_read" on public.ticket_templates_v3 for select using(auth.role()='authenticated');
create policy "templates_admin" on public.ticket_templates_v3 for all using(public.is_admin()) with check(public.is_admin());
create policy "notifications_own" on public.user_notifications for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "notifications_service" on public.user_notifications for all using(public.is_admin()) with check(public.is_admin());
create policy "approvals_visible" on public.ticket_approvals for select using(public.is_admin() or requested_from=auth.uid() or public.owns_ticket(ticket_id));
create policy "approvals_admin" on public.ticket_approvals for all using(public.is_admin()) with check(public.is_admin());
create policy "approvals_decide_own" on public.ticket_approvals for update using(requested_from=auth.uid()) with check(requested_from=auth.uid());

create or replace function public.process_due_maintenance() returns uuid[] language plpgsql security definer set search_path=public as $$
declare item record; new_id uuid; ids uuid[] := '{}'; next_time timestamptz;
begin
  for item in select m.*,a.name asset_name,a.area,a.category from maintenance_plans m left join assets a on a.id=m.asset_id where m.active and m.auto_create_ticket and m.next_due_at<=now() for update of m skip locked loop
    insert into tickets(title,description,type,category,area,device,created_by,due_at,asset_id,source,source_reference)
    values(item.title,coalesce(item.description,'Geplante Wartung durchführen.'),'Wartung',coalesce(item.category,'Geräte'),coalesce(item.area,'Allgemein'),item.asset_name,item.created_by,item.next_due_at,item.asset_id,'maintenance',item.id::text||':'||item.next_due_at::text)
    returning id into new_id; ids:=array_append(ids,new_id);
    next_time:=case item.frequency when 'daily' then item.next_due_at+make_interval(days=>item.interval_count) when 'weekly' then item.next_due_at+make_interval(days=>7*item.interval_count) when 'monthly' then item.next_due_at+make_interval(months=>item.interval_count) else item.next_due_at+make_interval(years=>item.interval_count) end;
    update maintenance_plans set next_due_at=next_time where id=item.id;
  end loop; return ids;
end $$;
revoke all on function public.process_due_maintenance() from public,anon,authenticated;
grant execute on function public.process_due_maintenance() to service_role;

-- SLA is calculated centrally, so every source (UI, HA and recurring jobs) behaves identically.
create or replace function public.apply_ticket_sla() returns trigger language plpgsql set search_path=public as $$
begin
  if new.response_due_at is null then
    new.response_due_at := new.created_at + case new.priority when 'urgent' then interval '1 hour' when 'high' then interval '4 hours' when 'normal' then interval '1 day' else interval '2 days' end;
  end if;
  if new.due_at is null then
    new.due_at := new.created_at + case new.priority when 'urgent' then interval '8 hours' when 'high' then interval '2 days' when 'normal' then interval '7 days' else interval '14 days' end;
  end if;
  return new;
end $$;
create trigger trg_ticket_sla before insert on public.tickets for each row execute function public.apply_ticket_sla();

create or replace function public.create_ticket_activity_notification() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into user_notifications(user_id,ticket_id,kind,title,body) values(new.created_by,new.id,'ticket_created','Ticket angelegt',new.title) on conflict do nothing;
  elsif old.status is distinct from new.status then
    insert into user_notifications(user_id,ticket_id,kind,title,body)
      select user_id,new.id,'status_changed','Ticketstatus geändert',new.title||' · '||new.status from (
        select new.created_by user_id union select new.assigned_to union select user_id from ticket_watchers where ticket_id=new.id
      ) audience where user_id is not null;
  end if;
  return new;
end $$;
create trigger trg_ticket_activity_notification after insert or update on public.tickets for each row execute function public.create_ticket_activity_notification();

insert into public.ticket_templates_v3(name,description,ticket_defaults,subtasks,created_by)
select 'Home-Assistant-Störung','Strukturierte Diagnose einer gestörten Entität','{"type":"Problem","category":"Home Assistant","priority":"high"}'::jsonb,array['Entität und Verlauf prüfen','Automations-Trace prüfen','Behebung testen','Lösung dokumentieren'],id from profiles where role='admin' order by created_at limit 1;
insert into public.ticket_templates_v3(name,description,ticket_defaults,subtasks,created_by)
select 'Geplante Wartung','Wiederholbarer Wartungsablauf','{"type":"Wartung","category":"Geräte","priority":"normal"}'::jsonb,array['Sichtprüfung','Wartung durchführen','Funktionstest','Geräteakte aktualisieren'],id from profiles where role='admin' order by created_at limit 1;

create or replace function public.resolve_ha_ticket(p_source_reference text,p_resolution text default 'Home Assistant meldet wieder Normalzustand.') returns uuid language plpgsql security definer set search_path=public as $$
declare target_id uuid;
begin
  select id into target_id from tickets where source='home_assistant' and source_reference=p_source_reference and status not in ('done','archived','rejected') order by created_at desc limit 1 for update;
  if target_id is not null then update tickets set status='done',closed_at=now(),solution_summary=p_resolution where id=target_id; end if;
  return target_id;
end $$;
revoke all on function public.resolve_ha_ticket(text,text) from public,anon,authenticated;
grant execute on function public.resolve_ha_ticket(text,text) to service_role;
