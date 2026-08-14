-- Post-session clinical evaluation tied to the existing appointment lifecycle.
create table if not exists public.session_evaluations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete restrict,
  doctor_id uuid not null references public.profiles(id) on delete restrict,
  session_performance_score smallint not null check (session_performance_score between 1 and 10),
  estimated_sessions_remaining integer not null check (estimated_sessions_remaining >= 0),
  pain_improvement_percent numeric(5,2) not null check (pain_improvement_percent between 0 and 100),
  progress_vs_previous_percent numeric(6,2) check (progress_vs_previous_percent between -100 and 100),
  progress_note text check (progress_note is null or char_length(progress_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_evaluations_patient_latest_idx
  on public.session_evaluations(patient_id, created_at desc);
create index if not exists session_evaluations_doctor_idx
  on public.session_evaluations(doctor_id, created_at desc);
create index if not exists appointments_patient_upcoming_idx
  on public.appointments(patient_id, starts_at)
  where status in ('pending', 'confirmed');

create or replace function public.validate_session_evaluation_relationships()
returns trigger language plpgsql security definer set search_path = '' as $$
declare linked public.appointments;
begin
  select * into linked from public.appointments where id = new.appointment_id;
  if not found or linked.patient_id <> new.patient_id or linked.physiotherapist_id <> new.doctor_id then
    raise exception 'Session evaluation appointment relationship mismatch';
  end if;
  if tg_op = 'INSERT' and linked.status <> 'confirmed' then
    raise exception 'Only confirmed appointments can be evaluated';
  end if;
  if public.profile_role(new.patient_id) <> 'patient'
    or public.profile_role(new.doctor_id) <> 'physiotherapist' then
    raise exception 'Invalid session evaluation roles';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_session_evaluation_relationships on public.session_evaluations;
create trigger validate_session_evaluation_relationships
before insert or update on public.session_evaluations
for each row execute function public.validate_session_evaluation_relationships();

alter table public.session_evaluations enable row level security;

create policy "Session evaluations scoped read" on public.session_evaluations
for select to authenticated using (
  patient_id = auth.uid()
  or doctor_id = auth.uid()
  or public.profile_role(auth.uid()) = 'admin'
);

create policy "Physiotherapists create own session evaluations" on public.session_evaluations
for insert to authenticated with check (
  doctor_id = auth.uid()
  and public.profile_role(auth.uid()) = 'physiotherapist'
  and exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and a.patient_id = patient_id
      and a.physiotherapist_id = auth.uid()
      and a.status = 'confirmed'
  )
);

create policy "Physiotherapists update own session evaluations" on public.session_evaluations
for update to authenticated using (doctor_id = auth.uid())
with check (doctor_id = auth.uid());

create policy "Admins manage session evaluations" on public.session_evaluations
for all to authenticated using (public.profile_role(auth.uid()) = 'admin')
with check (public.profile_role(auth.uid()) = 'admin');

create or replace function public.complete_appointment_with_evaluation(
  p_appointment_id uuid,
  p_doctor_id uuid,
  p_session_performance_score smallint,
  p_estimated_sessions_remaining integer,
  p_pain_improvement_percent numeric,
  p_progress_vs_previous_percent numeric default null,
  p_progress_note text default null
) returns public.session_evaluations
language plpgsql security definer set search_path = '' as $$
declare
  linked public.appointments;
  saved public.session_evaluations;
  has_previous boolean;
begin
  if auth.uid() is not null and auth.uid() <> p_doctor_id then
    raise exception 'Authenticated user does not match clinician';
  end if;
  if public.profile_role(p_doctor_id) <> 'physiotherapist' then
    raise exception 'Only an active physiotherapist can complete a session';
  end if;

  select * into linked from public.appointments
  where id = p_appointment_id and physiotherapist_id = p_doctor_id
  for update;
  if not found then raise exception 'Appointment not found'; end if;
  if linked.status <> 'confirmed' then
    raise exception 'Only a confirmed appointment can be completed';
  end if;

  select exists (
    select 1
    from public.session_evaluations e
    join public.appointments a on a.id = e.appointment_id
    where e.patient_id = linked.patient_id
      and e.appointment_id <> linked.id
      and a.starts_at < linked.starts_at
      and a.status = 'completed'
  ) into has_previous;

  if not has_previous then
    p_progress_vs_previous_percent := null;
  elsif p_progress_vs_previous_percent is null then
    raise exception 'Progress compared with the previous session is required';
  end if;

  insert into public.session_evaluations (
    appointment_id, patient_id, doctor_id, session_performance_score,
    estimated_sessions_remaining, pain_improvement_percent,
    progress_vs_previous_percent, progress_note
  ) values (
    linked.id, linked.patient_id, linked.physiotherapist_id,
    p_session_performance_score, p_estimated_sessions_remaining,
    p_pain_improvement_percent, p_progress_vs_previous_percent,
    nullif(trim(p_progress_note), '')
  ) returning * into saved;

  update public.appointments
  set status = 'completed', updated_at = now()
  where id = linked.id;

  insert into public.appointment_status_history
    (appointment_id, old_status, new_status, changed_by)
  values (linked.id, linked.status, 'completed', p_doctor_id);

  return saved;
end;
$$;

revoke all on function public.complete_appointment_with_evaluation(uuid,uuid,smallint,integer,numeric,numeric,text) from public, anon, authenticated;
grant execute on function public.complete_appointment_with_evaluation(uuid,uuid,smallint,integer,numeric,numeric,text) to service_role;
