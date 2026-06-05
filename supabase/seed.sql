-- Optional seed values. Users are created via Supabase Auth.
insert into public.settings(key, value) values
('registration_enabled', 'false'::jsonb),
('default_priority', '"normal"'::jsonb)
on conflict (key) do nothing;
