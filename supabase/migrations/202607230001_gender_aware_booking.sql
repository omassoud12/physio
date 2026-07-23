-- Add gender data needed for patient/physiotherapist booking eligibility.
-- Existing profiles intentionally remain null until explicitly updated.
alter table public.profiles
  add column if not exists gender text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_gender_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_gender_check
      check (gender is null or gender in ('female', 'male'));
  end if;
end;
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name, last_name, email, gender, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    lower(new.email),
    case
      when lower(new.raw_user_meta_data->>'gender') in ('female', 'male')
        then lower(new.raw_user_meta_data->>'gender')
      else null
    end,
    'patient'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.profile_gender(user_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select gender from public.profiles where id = user_id and is_active;
$$;

-- Keep the same eligibility rule in PostgreSQL so direct client inserts cannot
-- bypass the API's female-patient matching rule.
create or replace function public.validate_clinic_relationships() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  patient_gender text;
  clinician_gender text;
begin
  if tg_table_name = 'patient_physiotherapist_assignments' then
    if public.profile_role(new.patient_id) <> 'patient'
      or public.profile_role(new.physiotherapist_id) <> 'physiotherapist'
      or public.profile_role(new.assigned_by) <> 'admin' then
      raise exception 'Invalid assignment roles';
    end if;
  elsif tg_table_name = 'appointments' then
    if public.profile_role(new.patient_id) <> 'patient'
      or public.profile_role(new.physiotherapist_id) <> 'physiotherapist' then
      raise exception 'Invalid appointment roles';
    end if;

    if new.status in ('pending', 'confirmed') then
      select gender into patient_gender
      from public.profiles
      where id = new.patient_id;

      select gender into clinician_gender
      from public.profiles
      where id = new.physiotherapist_id;

      if patient_gender is null then
        raise exception 'Patient gender is required before booking';
      end if;
      if patient_gender = 'female' and clinician_gender is distinct from 'female' then
        raise exception 'Female patients may only book female physiotherapists';
      end if;
      if not exists (
        select 1
        from public.physiotherapists pt
        join public.profiles p on p.id = pt.profile_id
        where pt.profile_id = new.physiotherapist_id
          and pt.is_accepting_patients
          and p.is_active
      ) then
        raise exception 'Physiotherapist is not available for booking';
      end if;
    end if;
  elsif tg_table_name = 'physiotherapists'
    and public.profile_role(new.profile_id) <> 'physiotherapist' then
    raise exception 'Profile is not an active physiotherapist';
  end if;
  return new;
end;
$$;

-- Apply the same directory visibility rule to direct authenticated Supabase
-- reads. Backend controllers use the service client and repeat this filtering.
drop policy if exists "Scoped profile reads" on public.profiles;
create policy "Scoped profile reads" on public.profiles for select to authenticated using (
  auth.uid() = id
  or public.profile_role(auth.uid()) = 'admin'
  or (
    role = 'physiotherapist'
    and is_active
    and (
      public.profile_role(auth.uid()) <> 'patient'
      or public.profile_gender(auth.uid()) <> 'female'
      or gender = 'female'
    )
  )
  or (
    public.profile_role(auth.uid()) = 'physiotherapist'
    and role = 'patient'
    and (
      exists (
        select 1
        from public.patient_physiotherapist_assignments a
        where a.patient_id = id
          and a.physiotherapist_id = auth.uid()
          and a.is_active
      )
      or exists (
        select 1
        from public.appointments ap
        where ap.patient_id = id
          and ap.physiotherapist_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Public professional profiles" on public.physiotherapists;
create policy "Public professional profiles" on public.physiotherapists
for select to authenticated using (
  (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and p.is_active
    )
    and (
      public.profile_role(auth.uid()) <> 'patient'
      or public.profile_gender(auth.uid()) <> 'female'
      or public.profile_gender(profile_id) = 'female'
    )
  )
  or public.profile_role(auth.uid()) = 'admin'
);

drop policy if exists "Working hours readable" on public.physiotherapist_working_hours;
create policy "Working hours readable" on public.physiotherapist_working_hours
for select to authenticated using (
  public.profile_role(auth.uid()) <> 'patient'
  or public.profile_gender(auth.uid()) <> 'female'
  or public.profile_gender(physiotherapist_id) = 'female'
);

notify pgrst, 'reload schema';
