-- Reconcile an older physiotherapists table preserved by CREATE TABLE IF NOT EXISTS.
alter table public.physiotherapists
  add column if not exists consultation_duration integer not null default 30
    check (consultation_duration > 0),
  add column if not exists profile_image text;

-- Ask PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';
