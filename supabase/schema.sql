-- Run once in the SQL editor of your Supabase project.
create table if not exists public.sun_soul_catalog (
  id text primary key,
  trips jsonb not null default '{}'::jsonb,
  revision integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.sun_soul_catalog enable row level security;
revoke all on public.sun_soul_catalog from anon, authenticated;
grant select, insert, update on public.sun_soul_catalog to service_role;

-- Images are public to view. Only the server service role can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-images', 'trip-images', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
