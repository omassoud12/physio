-- Bilingual patient intake, physiotherapy assessment, and private documents.
create table if not exists public.patient_medical_profiles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.profiles(id) on delete cascade,
  booking_id uuid references public.appointments(id) on delete set null,
  personal_data jsonb not null default '{}'::jsonb check (jsonb_typeof(personal_data) = 'object'),
  medical_history jsonb not null default '{}'::jsonb check (jsonb_typeof(medical_history) = 'object'),
  risk_factors jsonb not null default '{}'::jsonb check (jsonb_typeof(risk_factors) = 'object'),
  screening jsonb not null default '{}'::jsonb check (jsonb_typeof(screening) = 'object'),
  subjective_assessment jsonb not null default '{}'::jsonb check (jsonb_typeof(subjective_assessment) = 'object'),
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  completion_status text not null default 'draft' check (completion_status in ('draft','submitted')),
  submitted_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((completion_status = 'submitted' and submitted_at is not null) or completion_status = 'draft'),
  check (coalesce(personal_data->>'height_cm','') = '' or (personal_data->>'height_cm')::numeric between 80 and 250),
  check (coalesce(personal_data->>'weight_kg','') = '' or (personal_data->>'weight_kg')::numeric between 20 and 350),
  check (coalesce(subjective_assessment->'pain_scores'->>'current','') = '' or (subjective_assessment->'pain_scores'->>'current')::numeric between 0 and 10),
  check (coalesce(subjective_assessment->'pain_scores'->>'today','') = '' or (subjective_assessment->'pain_scores'->>'today')::numeric between 0 and 10),
  check (coalesce(subjective_assessment->'pain_scores'->>'worst','') = '' or (subjective_assessment->'pain_scores'->>'worst')::numeric between 0 and 10),
  check (coalesce(subjective_assessment->'pain_scores'->>'rest','') = '' or (subjective_assessment->'pain_scores'->>'rest')::numeric between 0 and 10),
  check (coalesce(subjective_assessment->'pain_scores'->>'activity','') = '' or (subjective_assessment->'pain_scores'->>'activity')::numeric between 0 and 10)
);

create table if not exists public.patient_surgeries (
  id uuid primary key default gen_random_uuid(),
  medical_profile_id uuid not null references public.patient_medical_profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  surgery_date date,
  operated_region text not null,
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  medical_profile_id uuid not null references public.patient_medical_profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  medication_name text not null,
  indication text,
  dosage text,
  frequency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  medical_profile_id uuid not null references public.patient_medical_profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.appointments(id) on delete set null,
  category text not null check (category in ('mri','ct','xray','ultrasound','emg','blood_test','medical_report','prescription')),
  original_filename text not null,
  storage_path text not null unique,
  file_type text not null check (file_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 8388608),
  description text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  upload_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Immutable save history keeps every persisted answer set without making it the primary model.
create table if not exists public.patient_medical_profile_versions (
  id bigint generated always as identity primary key,
  medical_profile_id uuid not null references public.patient_medical_profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  saved_by uuid not null references public.profiles(id) on delete restrict,
  saved_at timestamptz not null default now()
);

create index if not exists patient_surgeries_patient_idx on public.patient_surgeries(patient_id);
create index if not exists patient_medications_patient_idx on public.patient_medications(patient_id);
create index if not exists patient_documents_patient_idx on public.patient_documents(patient_id);
create index if not exists patient_medical_versions_profile_idx on public.patient_medical_profile_versions(medical_profile_id, saved_at desc);

create or replace function public.can_access_patient_medical_record(target_patient_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() = target_patient_id
    or public.profile_role(auth.uid()) = 'admin'
    or (
      public.profile_role(auth.uid()) = 'physiotherapist'
      and (
        exists (select 1 from public.patient_physiotherapist_assignments a where a.patient_id = target_patient_id and a.physiotherapist_id = auth.uid() and a.is_active)
        or exists (select 1 from public.appointments ap where ap.patient_id = target_patient_id and ap.physiotherapist_id = auth.uid())
      )
    );
$$;

create or replace function public.validate_medical_child_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.patient_medical_profiles p where p.id = new.medical_profile_id and p.patient_id = new.patient_id) then
    raise exception 'Medical record patient mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_surgery_owner on public.patient_surgeries;
create trigger validate_surgery_owner before insert or update on public.patient_surgeries for each row execute function public.validate_medical_child_owner();
drop trigger if exists validate_medication_owner on public.patient_medications;
create trigger validate_medication_owner before insert or update on public.patient_medications for each row execute function public.validate_medical_child_owner();
drop trigger if exists validate_document_owner on public.patient_documents;
create trigger validate_document_owner before insert or update on public.patient_documents for each row execute function public.validate_medical_child_owner();

alter table public.patient_medical_profiles enable row level security;
alter table public.patient_surgeries enable row level security;
alter table public.patient_medications enable row level security;
alter table public.patient_documents enable row level security;
alter table public.patient_medical_profile_versions enable row level security;

create policy "Medical profiles scoped read" on public.patient_medical_profiles for select to authenticated using (public.can_access_patient_medical_record(patient_id));
create policy "Patients create own medical profile" on public.patient_medical_profiles for insert to authenticated with check (patient_id = auth.uid() and created_by = auth.uid());
create policy "Patients update own medical profile" on public.patient_medical_profiles for update to authenticated using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy "Surgeries scoped read" on public.patient_surgeries for select to authenticated using (public.can_access_patient_medical_record(patient_id));
create policy "Patients manage own surgeries" on public.patient_surgeries for all to authenticated using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "Medications scoped read" on public.patient_medications for select to authenticated using (public.can_access_patient_medical_record(patient_id));
create policy "Patients manage own medications" on public.patient_medications for all to authenticated using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "Documents scoped read" on public.patient_documents for select to authenticated using (public.can_access_patient_medical_record(patient_id));
create policy "Patients manage own documents" on public.patient_documents for all to authenticated using (patient_id = auth.uid()) with check (patient_id = auth.uid() and created_by = auth.uid());
create policy "Versions scoped read" on public.patient_medical_profile_versions for select to authenticated using (public.can_access_patient_medical_record(patient_id));
create policy "Patients create own versions" on public.patient_medical_profile_versions for insert to authenticated with check (patient_id = auth.uid() and saved_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-medical-documents', 'patient-medical-documents', false, 8388608, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Patients upload own medical documents" on storage.objects for insert to authenticated
with check (bucket_id = 'patient-medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Authorized medical document reads" on storage.objects for select to authenticated
using (bucket_id = 'patient-medical-documents' and public.can_access_patient_medical_record(((storage.foldername(name))[1])::uuid));
create policy "Patients remove own medical documents" on storage.objects for delete to authenticated
using (bucket_id = 'patient-medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
