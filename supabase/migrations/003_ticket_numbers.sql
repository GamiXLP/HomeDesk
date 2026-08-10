-- HomeDesk 2.1: eindeutige 8-stellige Ticketnummern
-- Bestehende Tickets erhalten beim Ausführen automatisch eine Nummer.

create sequence if not exists public.homedesk_ticket_number_seq
  as bigint
  start with 10000000
  increment by 1
  minvalue 10000000
  maxvalue 99999999
  no cycle;


grant usage, select on sequence public.homedesk_ticket_number_seq to authenticated;
grant usage, select on sequence public.homedesk_ticket_number_seq to service_role;

alter table public.tickets
  add column if not exists ticket_number bigint;

alter table public.tickets
  alter column ticket_number set default nextval('public.homedesk_ticket_number_seq');

-- Falls die Migration erneut ausgeführt wird, die Unveränderlichkeitsregel während des Backfills kurz lösen.
drop trigger if exists trg_enforce_homedesk_ticket_number on public.tickets;

update public.tickets
set ticket_number = nextval('public.homedesk_ticket_number_seq')
where ticket_number is null;

alter table public.tickets
  alter column ticket_number set not null;

alter table public.tickets
  drop constraint if exists tickets_ticket_number_8_digits;

alter table public.tickets
  add constraint tickets_ticket_number_8_digits
  check (ticket_number between 10000000 and 99999999);

create unique index if not exists tickets_ticket_number_uidx
  on public.tickets(ticket_number);

-- Sicherstellen, dass die Sequence nach vorhandenen Nummern weiterläuft.
do $$
declare
  max_number bigint;
begin
  select max(ticket_number) into max_number from public.tickets;
  if max_number is null then
    perform setval('public.homedesk_ticket_number_seq', 10000000, false);
  else
    perform setval('public.homedesk_ticket_number_seq', max_number, true);
  end if;
end $$;

-- Ticketnummern werden ausschließlich von der Datenbank vergeben und bleiben unveränderlich.
create or replace function public.enforce_homedesk_ticket_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.ticket_number := nextval('public.homedesk_ticket_number_seq');
  elsif new.ticket_number is distinct from old.ticket_number then
    new.ticket_number := old.ticket_number;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_homedesk_ticket_number on public.tickets;
create trigger trg_enforce_homedesk_ticket_number
before insert or update of ticket_number on public.tickets
for each row execute function public.enforce_homedesk_ticket_number();

-- Kein doppelter Sequence-Aufruf: ab jetzt übernimmt ausschließlich der Trigger die Vergabe.
alter table public.tickets
  alter column ticket_number drop default;

-- HomeDesk 2.1 startet den neuen Ungelesen-Zähler ohne Altlasten:
-- aktuell sichtbare Bestandstickets gelten beim Rollout als bereits gelesen.
insert into public.ticket_reads (ticket_id, user_id, last_read_at)
select t.id, p.id, now()
from public.tickets t
join public.profiles p on (p.role = 'admin' or t.created_by = p.id)
on conflict (ticket_id, user_id) do nothing;

-- 2.1 Schema-Härtung für Kommentar-Bilder (no-op, falls bereits vorhanden).
alter table public.ticket_attachments
  add column if not exists comment_id uuid references public.ticket_comments(id) on delete cascade;

create index if not exists ticket_attachments_comment_id_idx
  on public.ticket_attachments(comment_id);

-- Kommentare zählen als Ticket-Aktivität: Ticket nach oben holen und Realtime/Unread auslösen.
create or replace function public.touch_ticket_from_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tickets
  set updated_at = now()
  where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_ticket_from_comment on public.ticket_comments;
create trigger trg_touch_ticket_from_comment
after insert or update on public.ticket_comments
for each row execute function public.touch_ticket_from_comment();

-- Kommentare im Aktivitätsverlauf protokollieren.
create or replace function public.log_ticket_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ticket_events(ticket_id, actor_id, event_type, metadata, internal)
  values (
    new.ticket_id,
    new.author_id,
    'comment_created',
    jsonb_build_object('comment_id', new.id),
    new.visibility = 'internal'
  );
  return new;
end;
$$;

drop trigger if exists trg_ticket_comment_created on public.ticket_comments;
create trigger trg_ticket_comment_created
after insert on public.ticket_comments
for each row execute function public.log_ticket_comment();

-- Aktivitätsverlauf um Bereich und Zuweisung erweitern.
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
  if old.area is distinct from new.area then
    insert into public.ticket_events(ticket_id, actor_id, event_type, old_value, new_value)
    values (new.id, auth.uid(), 'area_changed', old.area, new.area);
  end if;
  if old.assigned_to is distinct from new.assigned_to then
    insert into public.ticket_events(ticket_id, actor_id, event_type, old_value, new_value)
    values (new.id, auth.uid(), 'assignee_changed', old.assigned_to::text, new.assigned_to::text);
  end if;
  return new;
end;
$$;
