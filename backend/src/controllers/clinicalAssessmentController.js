import { apiError, ok, sendError } from '../utils/http.js';
import {
  CERVICAL_SCHEMA_VERSION,
  ELBOW_SCHEMA_VERSION,
  LUMBAR_SCHEMA_VERSION,
  SHOULDER_SCHEMA_VERSION,
  validateAssessmentData,
  validateAssessmentMetadata,
} from '../services/clinicalAssessmentService.js';

const assessmentSelect = 'id,patient_id,doctor_id,appointment_id,parent_assessment_id,body_region,assessment_type,schema_version,affected_side,status,assessment_data,assessment_date,completed_at,created_at,updated_at';
const assessmentSummarySelect = 'id,patient_id,doctor_id,appointment_id,parent_assessment_id,body_region,assessment_type,schema_version,affected_side,status,assessment_date,completed_at,created_at,updated_at';

async function authorizedPatient(req, patientId) {
  const [profileResult, assignmentResult, appointmentResult] = await Promise.all([
    req.db.from('profiles').select('id,first_name,last_name,email,phone,gender,date_of_birth,medical_record_number,is_active').eq('id', patientId).eq('role', 'patient').maybeSingle(),
    req.db.from('patient_physiotherapist_assignments').select('id').eq('patient_id', patientId).eq('physiotherapist_id', req.auth.user.id).eq('is_active', true).limit(1).maybeSingle(),
    req.db.from('appointments').select('id').eq('patient_id', patientId).eq('physiotherapist_id', req.auth.user.id).limit(1).maybeSingle(),
  ]);
  for (const result of [profileResult, assignmentResult, appointmentResult]) if (result.error) throw result.error;
  if (!profileResult.data || (!assignmentResult.data && !appointmentResult.data)) throw apiError('Patient clinical profile not found', 404);
  return profileResult.data;
}

async function validateAppointment(req, patientId, appointmentId) {
  if (!appointmentId) return null;
  const result = await req.db.from('appointments').select('id').eq('id', appointmentId)
    .eq('patient_id', patientId).eq('physiotherapist_id', req.auth.user.id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw apiError('The selected session is not available for this assessment', 400);
  return appointmentId;
}

async function assertPatientRegionSelected(req, patientId, bodyRegion) {
  if (bodyRegion === 'shoulder') return
  const result = await req.db.from('patient_medical_profiles')
    .select('subjective_assessment').eq('patient_id', patientId).maybeSingle()
  if (result.error) throw result.error
  const subjective = result.data?.subjective_assessment || {}
  if (!medicalRecordHasRegion(subjective, bodyRegion)) throw apiError(`${bodyRegion} must be selected in the patient medical record before opening this assessment`, 409)
}

export function medicalRecordHasRegion(subjective, bodyRegion) {
  const primaryRegion = subjective.primary_pain_location
  const chartRegions = Array.isArray(subjective.pain_locations) ? subjective.pain_locations : []
  const primaryKey = { cervical:'cervical_spine', lumbar:'lumbar_spine' }[bodyRegion] || bodyRegion
  const chartKey = { cervical:'neck', lumbar:'lower_back' }[bodyRegion] || bodyRegion
  return primaryRegion === primaryKey || chartRegions.some((region) => (
    region === chartKey || String(region).endsWith(`_${chartKey}`)
  ))
}

function assessmentSchemaVersion(bodyRegion) {
  if (bodyRegion === 'shoulder') return SHOULDER_SCHEMA_VERSION
  if (bodyRegion === 'elbow') return ELBOW_SCHEMA_VERSION
  if (bodyRegion === 'cervical') return CERVICAL_SCHEMA_VERSION
  return LUMBAR_SCHEMA_VERSION
}

export async function clinicalProfile(req, res) {
  try {
    const patient = await authorizedPatient(req, req.params.patientId);
    const now = new Date().toISOString();
    const [appointments, evaluation, assessments, medical, documents, clinician] = await Promise.all([
      req.db.from('appointments')
        .select('id,treatment_type,starts_at,ends_at,status')
        .eq('patient_id', patient.id).eq('physiotherapist_id', req.auth.user.id)
        .order('starts_at', { ascending: false }),
      req.db.from('session_evaluations')
        .select('id,appointment_id,session_performance_score,estimated_sessions_remaining,pain_improvement_percent,progress_vs_previous_percent,progress_note,created_at,appointments!inner(starts_at,treatment_type,status)')
        .eq('patient_id', patient.id).eq('doctor_id', req.auth.user.id)
        .eq('appointments.status', 'completed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      req.db.from('clinical_assessments').select(assessmentSummarySelect)
        .eq('patient_id', patient.id).order('assessment_date', { ascending: false }),
      req.db.from('patient_medical_profiles')
        .select('id,completion_percent,completion_status,personal_data,subjective_assessment,updated_at')
        .eq('patient_id', patient.id).maybeSingle(),
      req.db.from('patient_documents').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
      req.db.from('physiotherapists')
        .select('professional_title,specialization,profiles!inner(first_name,last_name)')
        .eq('profile_id', req.auth.user.id).maybeSingle(),
    ]);
    for (const result of [appointments, evaluation, assessments, medical, documents, clinician]) if (result.error) throw result.error;
    const appointmentRows = appointments.data || [];
    const nextAppointment = [...appointmentRows].reverse().find((item) => (
      ['pending', 'confirmed'].includes(item.status) && item.starts_at > now
    )) || null;
    const counts = Object.fromEntries(['completed','pending','confirmed','cancelled','rejected','no_show'].map((status) => [status, appointmentRows.filter((item) => item.status === status).length]));

    return ok(res, {
      patient,
      primary_therapist: clinician.data || null,
      medical_record: medical.data || null,
      document_count: documents.count || 0,
      appointment_counts: {
        completed: counts.completed,
        upcoming: appointmentRows.filter((item) => ['pending','confirmed'].includes(item.status) && item.starts_at > now).length,
        cancelled: counts.cancelled,
      },
      next_appointment: nextAppointment,
      latest_evaluation: evaluation.data || null,
      assessments: assessments.data || [],
      appointments: appointmentRows,
    });
  } catch (error) { return sendError(res, error, 'Unable to load the patient clinical profile'); }
}

export async function createAssessment(req, res) {
  try {
    const patient = await authorizedPatient(req, req.params.patientId);
    const metadata = validateAssessmentMetadata(req.body);
    await assertPatientRegionSelected(req, patient.id, metadata.bodyRegion);
    const appointmentId = await validateAppointment(req, patient.id, req.body.appointment_id);

    if (!req.body.force_new) {
      const existing = await req.db.from('clinical_assessments').select(assessmentSelect)
        .eq('patient_id', patient.id).eq('doctor_id', req.auth.user.id)
        .eq('body_region', metadata.bodyRegion).eq('status', 'draft')
        .is('parent_assessment_id', null).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return ok(res, existing.data, 'Existing draft loaded');
    }

    const data = req.body.assessment_data || {};
    validateAssessmentData(metadata.bodyRegion, data);
    const inserted = await req.db.from('clinical_assessments').insert({
      patient_id: patient.id,
      doctor_id: req.auth.user.id,
      appointment_id: appointmentId,
      body_region: metadata.bodyRegion,
      assessment_type: metadata.assessmentType,
      schema_version: assessmentSchemaVersion(metadata.bodyRegion),
      affected_side: metadata.side,
      status: 'draft',
      assessment_data: data,
    }).select(assessmentSelect).single();
    if (inserted.error) throw inserted.error;
    return ok(res, inserted.data, 'Clinical assessment draft created', 201);
  } catch (error) { return sendError(res, error, 'Unable to create the clinical assessment'); }
}

export async function getAssessment(req, res) {
  try {
    const patient = await authorizedPatient(req, req.params.patientId);
    const assessment = await req.db.from('clinical_assessments').select(assessmentSelect)
      .eq('id', req.params.assessmentId).eq('patient_id', patient.id).maybeSingle();
    if (assessment.error) throw assessment.error;
    if (!assessment.data) throw apiError('Clinical assessment not found', 404);
    await assertPatientRegionSelected(req, patient.id, assessment.data.body_region);

    const [appointments, parent] = await Promise.all([
      req.db.from('appointments').select('id,treatment_type,starts_at,status')
        .eq('patient_id', patient.id).eq('physiotherapist_id', req.auth.user.id)
        .in('status', ['confirmed','completed']).order('starts_at', { ascending: false }),
      assessment.data.parent_assessment_id
        ? req.db.from('clinical_assessments').select(assessmentSelect).eq('id', assessment.data.parent_assessment_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (appointments.error) throw appointments.error;
    if (parent.error) throw parent.error;
    return ok(res, { assessment: assessment.data, patient, appointments: appointments.data || [], previous_assessment: parent.data || null });
  } catch (error) { return sendError(res, error, 'Unable to load the clinical assessment'); }
}

export async function updateAssessment(req, res) {
  try {
    const patient = await authorizedPatient(req, req.params.patientId);
    const current = await req.db.from('clinical_assessments').select(assessmentSelect)
      .eq('id', req.params.assessmentId).eq('patient_id', patient.id).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) throw apiError('Clinical assessment not found', 404);
    await assertPatientRegionSelected(req, patient.id, current.data.body_region);
    if (current.data.doctor_id !== req.auth.user.id) throw apiError('Only the authoring physiotherapist can edit this assessment', 403);
    if (current.data.status === 'completed') throw apiError('Completed clinical assessments cannot be changed', 409);

    const requestedStatus = req.body.status || 'draft';
    const metadata = validateAssessmentMetadata({
      body_region: current.data.body_region,
      assessment_type: current.data.assessment_type,
      affected_side: req.body.affected_side ?? current.data.affected_side,
      status: requestedStatus,
    }, { completing: requestedStatus === 'completed' });
    const assessmentData = req.body.assessment_data ?? current.data.assessment_data;
    validateAssessmentData(current.data.body_region, assessmentData, { completed: requestedStatus === 'completed' });
    const appointmentId = req.body.appointment_id === undefined
      ? current.data.appointment_id
      : await validateAppointment(req, patient.id, req.body.appointment_id);

    const saved = await req.db.from('clinical_assessments').update({
      affected_side: metadata.side,
      appointment_id: appointmentId,
      assessment_data: assessmentData,
      status: requestedStatus,
      completed_at: requestedStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', current.data.id).eq('doctor_id', req.auth.user.id).eq('status', 'draft')
      .select(assessmentSelect).single();
    if (saved.error?.code === 'PGRST116') throw apiError('The assessment was already completed or changed', 409);
    if (saved.error) throw saved.error;
    return ok(res, saved.data, requestedStatus === 'completed' ? 'Clinical assessment completed' : 'Draft saved');
  } catch (error) { return sendError(res, error, 'Unable to save the clinical assessment'); }
}

export async function reassess(req, res) {
  try {
    const patient = await authorizedPatient(req, req.params.patientId);
    const parent = await req.db.from('clinical_assessments').select(assessmentSelect)
      .eq('id', req.params.assessmentId).eq('patient_id', patient.id).eq('status', 'completed').maybeSingle();
    if (parent.error) throw parent.error;
    if (!parent.data) throw apiError('Completed assessment not found', 404);
    await assertPatientRegionSelected(req, patient.id, parent.data.body_region);

    const existing = await req.db.from('clinical_assessments').select(assessmentSelect)
      .eq('parent_assessment_id', parent.data.id).eq('doctor_id', req.auth.user.id).eq('status', 'draft')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return ok(res, existing.data, 'Existing reassessment draft loaded');

    const inserted = await req.db.from('clinical_assessments').insert({
      patient_id: patient.id,
      doctor_id: req.auth.user.id,
      parent_assessment_id: parent.data.id,
      body_region: parent.data.body_region,
      assessment_type: parent.data.assessment_type,
      schema_version: assessmentSchemaVersion(parent.data.body_region),
      affected_side: parent.data.affected_side,
      status: 'draft',
      assessment_data: {},
    }).select(assessmentSelect).single();
    if (inserted.error) throw inserted.error;
    return ok(res, inserted.data, 'Reassessment draft created', 201);
  } catch (error) { return sendError(res, error, 'Unable to start the reassessment'); }
}

export { assessmentSelect, authorizedPatient };
