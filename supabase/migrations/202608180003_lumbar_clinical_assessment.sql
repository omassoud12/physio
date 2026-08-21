-- Add the lumbar spine module to the versioned clinical-assessment system.
do $$
declare constraint_row record;
begin
  for constraint_row in
    select conname from pg_constraint
    where conrelid = 'public.clinical_assessments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%assessment_type%'
  loop
    execute format('alter table public.clinical_assessments drop constraint %I', constraint_row.conname);
  end loop;
end;
$$;

alter table public.clinical_assessments
  add constraint clinical_assessments_type_supported check (assessment_type in (
    'shoulder_quick_assessment','elbow_quick_assessment','cervical_quick_assessment','lumbar_quick_assessment'
  )),
  add constraint clinical_assessments_region_type_match check (
    (body_region='shoulder' and assessment_type='shoulder_quick_assessment')
    or (body_region='elbow' and assessment_type='elbow_quick_assessment')
    or (body_region='cervical' and assessment_type='cervical_quick_assessment')
    or (body_region='lumbar' and assessment_type='lumbar_quick_assessment')
  );

create or replace function public.validate_clinical_assessment_relationships()
returns trigger language plpgsql security definer set search_path = '' as $$
declare linked_appointment public.appointments; parent_record public.clinical_assessments;
begin
  if public.profile_role(new.patient_id)<>'patient' or public.profile_role(new.doctor_id)<>'physiotherapist' then raise exception 'Invalid clinical assessment roles'; end if;
  if not (
    (new.body_region='shoulder' and new.assessment_type='shoulder_quick_assessment')
    or (new.body_region='elbow' and new.assessment_type='elbow_quick_assessment')
    or (new.body_region='cervical' and new.assessment_type='cervical_quick_assessment')
    or (new.body_region='lumbar' and new.assessment_type='lumbar_quick_assessment')
  ) then raise exception 'Assessment type does not match body region'; end if;
  if new.appointment_id is not null then
    select * into linked_appointment from public.appointments where id=new.appointment_id;
    if not found or linked_appointment.patient_id<>new.patient_id or linked_appointment.physiotherapist_id<>new.doctor_id then raise exception 'Assessment appointment relationship mismatch'; end if;
  end if;
  if new.parent_assessment_id is not null then
    select * into parent_record from public.clinical_assessments where id=new.parent_assessment_id;
    if not found or parent_record.patient_id<>new.patient_id or parent_record.body_region<>new.body_region or parent_record.status<>'completed' then raise exception 'Invalid parent assessment'; end if;
  end if;
  if tg_op='UPDATE' then
    if old.status='completed' then raise exception 'Completed clinical assessments are immutable'; end if;
    if old.patient_id<>new.patient_id or old.doctor_id<>new.doctor_id or old.body_region<>new.body_region or old.assessment_type<>new.assessment_type or old.schema_version<>new.schema_version or old.parent_assessment_id is distinct from new.parent_assessment_id then raise exception 'Clinical assessment identity cannot be changed'; end if;
  end if;
  if new.status='completed' and new.completed_at is null then new.completed_at:=now(); elsif new.status='draft' then new.completed_at:=null; end if;
  new.updated_at:=now(); return new;
end;
$$;
