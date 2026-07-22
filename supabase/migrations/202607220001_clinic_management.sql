-- Clinic management schema. Run after 202607210001_create_profiles.sql.
create extension if not exists btree_gist;

alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists date_of_birth date,
  add column if not exists medical_record_number text,
  add column if not exists is_active boolean not null default true;

create unique index if not exists profiles_email_unique on public.profiles (lower(email)) where email is not null;
create unique index if not exists profiles_medical_record_unique on public.profiles (medical_record_number) where medical_record_number is not null;
create unique index if not exists one_active_administrator on public.profiles ((role)) where role = 'admin' and is_active;

-- Promote the already-created administrator. No password is stored in SQL.
update public.profiles p set email = lower(u.email)
from auth.users u where p.id = u.id and p.email is null;

update public.profiles p
set role = 'admin', email = lower(u.email), is_active = true, updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = 'omarmassoud27076@gmail.com';

create table if not exists public.physiotherapists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  professional_title text not null,
  license_number text not null unique,
  specialization text not null,
  biography text not null default '',
  years_of_experience integer not null default 0 check (years_of_experience >= 0),
  consultation_duration integer not null default 30 check (consultation_duration > 0),
  profile_image text,
  is_accepting_patients boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility for projects that already had an older physiotherapists table.
alter table public.physiotherapists
  add column if not exists consultation_duration integer not null default 30
    check (consultation_duration > 0),
  add column if not exists profile_image text;

create table if not exists public.patient_physiotherapist_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  physiotherapist_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (patient_id <> physiotherapist_id)
);
create unique index if not exists one_active_assignment_per_patient
  on public.patient_physiotherapist_assignments (patient_id) where is_active;

create table if not exists public.physiotherapist_working_hours (
  id uuid primary key default gen_random_uuid(),
  physiotherapist_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null check (slot_duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time),
  exclude using gist (physiotherapist_id with =, day_of_week with =, int4range(extract(epoch from start_time)::integer, extract(epoch from end_time)::integer, '[)') with &&) where (is_active)
);

create table if not exists public.physiotherapist_time_off (
  id uuid primary key default gen_random_uuid(),
  physiotherapist_id uuid not null references public.profiles(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (start_datetime < end_datetime)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  physiotherapist_id uuid not null references public.profiles(id) on delete restrict,
  treatment_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  patient_notes text,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','completed','cancelled','no_show')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  exclude using gist (physiotherapist_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('pending','confirmed'))
);

create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create or replace function public.profile_role(user_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role::text from public.profiles where id = user_id and is_active;
$$;

create or replace function public.validate_clinic_relationships() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'patient_physiotherapist_assignments' then
    if public.profile_role(new.patient_id) <> 'patient' or public.profile_role(new.physiotherapist_id) <> 'physiotherapist' or public.profile_role(new.assigned_by) <> 'admin' then
      raise exception 'Invalid assignment roles';
    end if;
  elsif tg_table_name = 'appointments' then
    if public.profile_role(new.patient_id) <> 'patient' or public.profile_role(new.physiotherapist_id) <> 'physiotherapist' then
      raise exception 'Invalid appointment roles';
    end if;
  elsif tg_table_name = 'physiotherapists' and public.profile_role(new.profile_id) <> 'physiotherapist' then
    raise exception 'Profile is not an active physiotherapist';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_assignment_roles on public.patient_physiotherapist_assignments;
create trigger validate_assignment_roles before insert or update on public.patient_physiotherapist_assignments for each row execute function public.validate_clinic_relationships();
drop trigger if exists validate_appointment_roles on public.appointments;
create trigger validate_appointment_roles before insert or update on public.appointments for each row execute function public.validate_clinic_relationships();
drop trigger if exists validate_physiotherapist_role on public.physiotherapists;
create trigger validate_physiotherapist_role before insert or update on public.physiotherapists for each row execute function public.validate_clinic_relationships();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name, last_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name',''), coalesce(new.raw_user_meta_data->>'last_name',''), lower(new.email), 'patient')
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.physiotherapists enable row level security;
alter table public.patient_physiotherapist_assignments enable row level security;
alter table public.physiotherapist_working_hours enable row level security;
alter table public.physiotherapist_time_off enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_history enable row level security;

-- Profiles: self access, public clinician directory, relevant clinician patients, or admin.
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Scoped profile reads" on public.profiles;
create policy "Scoped profile reads" on public.profiles for select to authenticated using (
  auth.uid() = id or public.profile_role(auth.uid()) = 'admin' or
  (role = 'physiotherapist' and is_active) or
  (public.profile_role(auth.uid()) = 'physiotherapist' and role = 'patient' and (
    exists (select 1 from public.patient_physiotherapist_assignments a where a.patient_id = id and a.physiotherapist_id = auth.uid() and a.is_active) or
    exists (select 1 from public.appointments ap where ap.patient_id = id and ap.physiotherapist_id = auth.uid())
  ))
);
drop policy if exists "Users can update their own patient profile" on public.profiles;
drop policy if exists "Users update own non-role fields" on public.profiles;
create policy "Users update own non-role fields" on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id and role::text = public.profile_role(auth.uid()));
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all to authenticated
using (public.profile_role(auth.uid()) = 'admin') with check (public.profile_role(auth.uid()) = 'admin');

drop policy if exists "Public professional profiles" on public.physiotherapists;
create policy "Public professional profiles" on public.physiotherapists for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = profile_id and p.is_active) or public.profile_role(auth.uid()) = 'admin'
);
drop policy if exists "Clinicians update themselves" on public.physiotherapists;
create policy "Clinicians update themselves" on public.physiotherapists for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "Admins manage clinicians" on public.physiotherapists;
create policy "Admins manage clinicians" on public.physiotherapists for all to authenticated using (public.profile_role(auth.uid()) = 'admin') with check (public.profile_role(auth.uid()) = 'admin');

drop policy if exists "Scoped assignments" on public.patient_physiotherapist_assignments;
create policy "Scoped assignments" on public.patient_physiotherapist_assignments for select to authenticated using (patient_id = auth.uid() or physiotherapist_id = auth.uid() or public.profile_role(auth.uid()) = 'admin');
drop policy if exists "Admins manage assignments" on public.patient_physiotherapist_assignments;
create policy "Admins manage assignments" on public.patient_physiotherapist_assignments for all to authenticated using (public.profile_role(auth.uid()) = 'admin') with check (public.profile_role(auth.uid()) = 'admin');

drop policy if exists "Working hours readable" on public.physiotherapist_working_hours;
create policy "Working hours readable" on public.physiotherapist_working_hours for select to authenticated using (true);
drop policy if exists "Clinicians manage own hours" on public.physiotherapist_working_hours;
create policy "Clinicians manage own hours" on public.physiotherapist_working_hours for all to authenticated using (physiotherapist_id = auth.uid()) with check (physiotherapist_id = auth.uid());
drop policy if exists "Time off scoped" on public.physiotherapist_time_off;
create policy "Time off scoped" on public.physiotherapist_time_off for select to authenticated using (physiotherapist_id = auth.uid() or public.profile_role(auth.uid()) = 'admin');
drop policy if exists "Clinicians manage own time off" on public.physiotherapist_time_off;
create policy "Clinicians manage own time off" on public.physiotherapist_time_off for all to authenticated using (physiotherapist_id = auth.uid()) with check (physiotherapist_id = auth.uid());

drop policy if exists "Appointments scoped" on public.appointments;
create policy "Appointments scoped" on public.appointments for select to authenticated using (patient_id = auth.uid() or physiotherapist_id = auth.uid() or public.profile_role(auth.uid()) = 'admin');
drop policy if exists "Patients create own appointments" on public.appointments;
create policy "Patients create own appointments" on public.appointments for insert to authenticated with check (patient_id = auth.uid() and public.profile_role(auth.uid()) = 'patient' and status = 'pending');
drop policy if exists "Participants update appointments" on public.appointments;
create policy "Participants update appointments" on public.appointments for update to authenticated using (patient_id = auth.uid() or physiotherapist_id = auth.uid() or public.profile_role(auth.uid()) = 'admin');
drop policy if exists "Status history scoped" on public.appointment_status_history;
create policy "Status history scoped" on public.appointment_status_history for select to authenticated using (exists (select 1 from public.appointments a where a.id = appointment_id and (a.patient_id = auth.uid() or a.physiotherapist_id = auth.uid() or public.profile_role(auth.uid()) = 'admin')));
drop policy if exists "Participants create status history" on public.appointment_status_history;
create policy "Participants create status history" on public.appointment_status_history for insert to authenticated with check (changed_by = auth.uid());
