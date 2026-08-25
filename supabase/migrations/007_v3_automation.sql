-- Transactional v3 automation workers and HA deduplication.
create unique index tickets_ha_source_reference_uidx on public.tickets(source_reference)
where source = 'home_assistant' and source_reference is not null;

create or replace function public.create_ha_ticket(p_title text, p_description text, p_entity_id text, p_area text, p_created_by uuid, p_source_reference text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;
begin
  if p_source_reference is not null then
    select id into result_id from tickets where source='home_assistant' and source_reference=p_source_reference;
    if result_id is not null then return result_id; end if;
  end if;
  insert into tickets(title,description,type,category,area,entity_id,created_by,source,source_reference)
  values(p_title,p_description,'Störung','Smart Home',p_area,p_entity_id,p_created_by,'home_assistant',p_source_reference)
  returning id into result_id; return result_id;
exception when unique_violation then
  select id into result_id from tickets where source='home_assistant' and source_reference=p_source_reference;
  return result_id;
end $$;

create or replace function public.process_due_ticket_recurrences() returns uuid[] language plpgsql security definer set search_path=public as $$
declare item record; new_id uuid; created_ids uuid[] := '{}'; next_time timestamptz;
begin
  for item in select r.id recurrence_id,r.frequency,r.interval_count,r.next_run_at,
    t.id template_id,t.title,t.description,t.priority,t.type,t.category,t.area,t.device,t.entity_id,t.created_by,t.assigned_to,t.due_at,t.created_at
    from ticket_recurrences r join tickets t on t.id=r.ticket_id
    where r.active and r.next_run_at<=now() for update of r skip locked loop
    insert into tickets(title,description,priority,type,category,area,device,entity_id,created_by,assigned_to,due_at,source,source_reference)
    values(item.title,item.description,item.priority,item.type,item.category,item.area,item.device,item.entity_id,item.created_by,item.assigned_to,
      case when item.due_at is null then null else item.next_run_at + (item.due_at-item.created_at) end,
      'recurrence',item.recurrence_id::text||':'||item.next_run_at::text) returning id into new_id;
    created_ids := array_append(created_ids,new_id);
    next_time := case item.frequency when 'daily' then item.next_run_at + make_interval(days=>item.interval_count) when 'weekly' then item.next_run_at + make_interval(days=>7*item.interval_count) when 'monthly' then item.next_run_at + make_interval(months=>item.interval_count) else item.next_run_at + make_interval(years=>item.interval_count) end;
    update ticket_recurrences set next_run_at=next_time where id=item.recurrence_id;
  end loop;
  return created_ids;
end $$;

create or replace function public.escalate_overdue_ticket_ids() returns uuid[] language plpgsql security definer set search_path=public as $$
declare ids uuid[];
begin
  with changed as (update tickets set escalation_level=least(3,escalation_level+1), escalated_at=now() where due_at<now() and status not in ('done','rejected','archived') and (escalated_at is null or escalated_at<now()-interval '24 hours') returning id)
  select coalesce(array_agg(id),'{}') into ids from changed; return ids;
end $$;

revoke all on function public.create_ha_ticket(text,text,text,text,uuid,text) from public,anon,authenticated;
revoke all on function public.process_due_ticket_recurrences() from public,anon,authenticated;
revoke all on function public.escalate_overdue_ticket_ids() from public,anon,authenticated;
grant execute on function public.create_ha_ticket(text,text,text,text,uuid,text) to service_role;
grant execute on function public.process_due_ticket_recurrences() to service_role;
grant execute on function public.escalate_overdue_ticket_ids() to service_role;
