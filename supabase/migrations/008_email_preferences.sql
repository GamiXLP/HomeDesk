-- Per-user control over optional HomeDesk ticket emails.
alter table public.profiles
  add column email_notifications_enabled boolean not null default true;

comment on column public.profiles.email_notifications_enabled is
  'Controls optional HomeDesk ticket and comment emails. Authentication and security emails are unaffected.';
