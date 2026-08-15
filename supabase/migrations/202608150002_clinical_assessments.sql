-- Versioned, region-based clinical assessments. Detailed findings remain doctor-only.
create table if not exists public.clinical_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  doctor_id uuid not null references public.profiles(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  parent_assessment_id uuid references public.clinical_assessments(id) on delete set null,
  body_region text not null check (body_region in (
    'shoulder','hip','elbow','knee','ankle','cervical','wrist','lumbar'
  )),
  assessment_type text not null check (assessment_type in ('shoulder_quick_assessment')),
  schema_version smallint not null default 1 check (schema_version > 0),
  affected_side text check (affected_side in ('right','left','bilateral')),
  status text not null default 'draft' check (status in ('draft','completed')),
  assessment_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(assessment_data) = 'object'),
  assessment_date timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body_region = 'shoulder' and assessment_type = 'shoulder_quick_assessment'),
  check (status = 'draft' or (affected_side is not null and completed_at is not null))
);

create index if not exists clinical_assessments_patient_history_idx
  on public.clinical_assessments(patient_id, body_region, assessment_date desc);
create index if not exists clinical_assessments_doctor_patient_idx
  on public.clinical_assessments(doctor_id, patient_id, status);
create index if not exists clinical_assessments_appointment_idx
  on public.clinical_assessments(appointment_id)
  where appointment_id is not null;
create index if not exists clinical_assessments_parent_idx
  on public.clinical_assessments(parent_assessment_id)
  where parent_assessment_id is not null;

create or replace function public.can_access_clinical_patient(target_patient_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.profile_role(auth.uid()) = 'admin'
    or (
      public.profile_role(auth.uid()) = 'physiotherapist'
      and (
        exists (
          select 1 from public.patient_physiotherapist_assignments a
          where a.patient_id = target_patient_id
            and a.physiotherapist_id = auth.uid()
            and a.is_active
        )
        or exists (
          select 1 from public.appointments ap
          where ap.patient_id = target_patient_id
            and ap.physiotherapist_id = auth.uid()
        )
      )
    );
$$;

create or replace function public.validate_clinical_assessment_relationships()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  linked_appointment public.appointments;
  parent_record public.clinical_assessments;
begin
  if public.profile_role(new.patient_id) <> 'patient'
    or public.profile_role(new.doctor_id) <> 'physiotherapist' then
    raise exception 'Invalid clinical assessment roles';
  end if;

  if new.body_region <> 'shoulder'
    or new.assessment_type <> 'shoulder_quick_assessment' then
    raise exception 'Assessment type does not match body region';
  end if;

  if new.appointment_id is not null then
    select * into linked_appointment
    from public.appointments where id = new.appointment_id;
    if not found
      or linked_appointment.patient_id <> new.patient_id
      or linked_appointment.physiotherapist_id <> new.doctor_id then
      raise exception 'Assessment appointment relationship mismatch';
    end if;
  end if;

  if new.parent_assessment_id is not null then
    select * into parent_record
    from public.clinical_assessments where id = new.parent_assessment_id;
    if not found
      or parent_record.patient_id <> new.patient_id
      or parent_record.body_region <> new.body_region
      or parent_record.status <> 'completed' then
      raise exception 'Invalid parent assessment';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'completed' then
      raise exception 'Completed clinical assessments are immutable';
    end if;
    if old.patient_id <> new.patient_id
      or old.doctor_id <> new.doctor_id
      or old.body_region <> new.body_region
      or old.assessment_type <> new.assessment_type
      or old.schema_version <> new.schema_version
      or old.parent_assessment_id is distinct from new.parent_assessment_id then
      raise exception 'Clinical assessment identity cannot be changed';
    end if;
  end if;

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status = 'draft' then
    new.completed_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_clinical_assessment_relationships on public.clinical_assessments;
create trigger validate_clinical_assessment_relationships
before insert or update on public.clinical_assessments
for each row execute function public.validate_clinical_assessment_relationships();

alter table public.clinical_assessments enable row level security;

drop policy if exists "Authorized clinicians read clinical assessments" on public.clinical_assessments;
create policy "Authorized clinicians read clinical assessments"
on public.clinical_assessments for select to authenticated
using (public.can_access_clinical_patient(patient_id));

drop policy if exists "Clinicians create authorized assessments" on public.clinical_assessments;
create policy "Clinicians create authorized assessments"
on public.clinical_assessments for insert to authenticated
with check (
  doctor_id = auth.uid()
  and public.profile_role(auth.uid()) = 'physiotherapist'
  and public.can_access_clinical_patient(patient_id)
);

drop policy if exists "Clinicians update own draft assessments" on public.clinical_assessments;
create policy "Clinicians update own draft assessments"
on public.clinical_assessments for update to authenticated
using (
  doctor_id = auth.uid()
  and status = 'draft'
  and public.can_access_clinical_patient(patient_id)
)
with check (
  doctor_id = auth.uid()
  and public.can_access_clinical_patient(patient_id)
);

drop policy if exists "Admins manage clinical assessments" on public.clinical_assessments;
create policy "Admins manage clinical assessments"
on public.clinical_assessments for all to authenticated
using (public.profile_role(auth.uid()) = 'admin')
with check (public.profile_role(auth.uid()) = 'admin');
