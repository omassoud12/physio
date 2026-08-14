import { apiError, ok, pick, required, sendError } from '../utils/http.js';
import { appointmentStatuses } from './clinicController.js';

const professionalFields = ['professional_title','specialization','biography','years_of_experience','consultation_duration','profile_image','is_accepting_patients'];
const weekdays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

function validateAvailabilityPeriod(period) {
  if (!weekdays.includes(period.day_of_week)) {
    throw apiError('Choose a valid day of the week', 400);
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(String(period.start_time || ''))
    || !/^\d{2}:\d{2}(:\d{2})?$/.test(String(period.end_time || ''))) {
    throw apiError('Choose valid start and end times', 400);
  }
  if (period.start_time >= period.end_time) {
    throw apiError('Availability end time must be after its start time', 400);
  }
  const duration = Number(period.slot_duration_minutes);
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    throw apiError('Slot duration must be a whole number between 5 and 480 minutes', 400);
  }
}

export async function me(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await req.db.from('physiotherapists').select('profile_id,professional_title,license_number,specialization,biography,years_of_experience,consultation_duration,profile_image,is_accepting_patients,profiles!inner(first_name,last_name,email,phone,is_active)').eq('profile_id', req.auth.user.id).single();
      if (error) throw error;
      return ok(res, data);
    }
    const profile = pick(req.body, ['first_name','last_name','phone']);
    const professional = pick(req.body, professionalFields);
    if (Object.keys(profile).length) await req.db.from('profiles').update({ ...profile, updated_at: new Date().toISOString() }).eq('id', req.auth.user.id);
    if (Object.keys(professional).length) await req.db.from('physiotherapists').update({ ...professional, updated_at: new Date().toISOString() }).eq('profile_id', req.auth.user.id);
    return ok(res, { id: req.auth.user.id }, 'Profile updated successfully');
  } catch (error) { return sendError(res, error, 'Unable to manage profile'); }
}

export async function availability(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await req.db.from('physiotherapist_working_hours').select('id,day_of_week,start_time,end_time,slot_duration_minutes,is_active').eq('physiotherapist_id', req.auth.user.id);
      if (error) throw error;
      const ordered = (data || []).sort((left, right) => (
        weekdays.indexOf(left.day_of_week) - weekdays.indexOf(right.day_of_week)
        || left.start_time.localeCompare(right.start_time)
      ));
      return ok(res, ordered);
    }
    required(req.body, ['day_of_week','start_time','end_time','slot_duration_minutes']);
    const period = pick(req.body, ['day_of_week','start_time','end_time','slot_duration_minutes','is_active']);
    period.day_of_week = String(period.day_of_week).toLowerCase();
    period.slot_duration_minutes = Number(period.slot_duration_minutes);
    validateAvailabilityPeriod(period);
    const { data, error } = await req.db.from('physiotherapist_working_hours').insert({ ...period, physiotherapist_id: req.auth.user.id }).select().single();
    if (error?.code === '23P01') throw apiError('Availability overlaps an existing period', 409);
    if (error?.code === '23514') throw apiError('Availability times are invalid', 400);
    if (error) throw error;
    return ok(res, data, 'Availability added successfully', 201);
  } catch (error) { return sendError(res, error, 'Unable to manage availability'); }
}

export async function updateAvailability(req, res) {
  try {
    const update = pick(req.body, ['day_of_week','start_time','end_time','slot_duration_minutes','is_active']);
    const { data: current, error: currentError } = await req.db.from('physiotherapist_working_hours').select('id,day_of_week,start_time,end_time,slot_duration_minutes,is_active').eq('id', req.params.id).eq('physiotherapist_id', req.auth.user.id).single();
    if (currentError || !current) throw apiError('Availability period not found', 404);
    const candidate = { ...current, ...update };
    candidate.day_of_week = String(candidate.day_of_week).toLowerCase();
    candidate.slot_duration_minutes = Number(candidate.slot_duration_minutes);
    validateAvailabilityPeriod(candidate);
    if (update.day_of_week !== undefined) update.day_of_week = candidate.day_of_week;
    if (update.slot_duration_minutes !== undefined) update.slot_duration_minutes = candidate.slot_duration_minutes;
    const { data, error } = await req.db.from('physiotherapist_working_hours').update({ ...update, updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('physiotherapist_id', req.auth.user.id).select().single();
    if (error?.code === '23P01') throw apiError('Availability overlaps an existing period', 409);
    if (error?.code === '23514') throw apiError('Availability times are invalid', 400);
    if (error || !data) throw apiError('Availability period not found', 404);
    return ok(res, data, 'Availability updated successfully');
  } catch (error) { return sendError(res, error, 'Unable to update availability'); }
}

export async function deleteAvailability(req, res) {
  try {
    const { data, error } = await req.db.from('physiotherapist_working_hours').delete().eq('id', req.params.id).eq('physiotherapist_id', req.auth.user.id).select('id').single();
    if (error || !data) throw apiError('Availability period not found', 404);
    return ok(res, data, 'Availability removed successfully');
  } catch (error) { return sendError(res, error, 'Unable to remove availability'); }
}

export async function timeOff(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await req.db.from('physiotherapist_time_off').select('id,start_datetime,end_datetime,reason,created_at').eq('physiotherapist_id', req.auth.user.id).order('start_datetime');
      if (error) throw error;
      return ok(res, data);
    }
    required(req.body, ['start_datetime','end_datetime']);
    const start = new Date(req.body.start_datetime);
    const end = new Date(req.body.end_datetime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw apiError('Choose valid time-off dates and times', 400);
    }
    if (start >= end) throw apiError('Start must be before end', 400);
    const { data, error } = await req.db.from('physiotherapist_time_off').insert({ physiotherapist_id: req.auth.user.id, ...pick(req.body, ['start_datetime','end_datetime','reason']) }).select().single();
    if (error) throw error;
    return ok(res, data, 'Time off added successfully', 201);
  } catch (error) { return sendError(res, error, 'Unable to manage time off'); }
}

export async function deleteTimeOff(req, res) {
  try {
    const { data, error } = await req.db.from('physiotherapist_time_off').delete().eq('id', req.params.id).eq('physiotherapist_id', req.auth.user.id).select('id').single();
    if (error || !data) throw apiError('Time-off period not found', 404);
    return ok(res, data, 'Time off removed successfully');
  } catch (error) { return sendError(res, error, 'Unable to remove time off'); }
}

export async function appointments(req, res) {
  try {
    const { data, error } = await req.db.from('appointments').select('id,patient_id,treatment_type,starts_at,ends_at,patient_notes,status,profiles!appointments_patient_id_fkey(first_name,last_name,email,phone,medical_record_number)').eq('physiotherapist_id', req.auth.user.id).order('starts_at');
    if (error) throw error;
    return ok(res, data);
  } catch (error) { return sendError(res, error, 'Unable to load appointments'); }
}

function boundedNumber(value, minimum, maximum, field, integer = false) {
  if (value === '' || value === null || value === undefined) {
    throw apiError(`${field} is required`, 400, [{ field, message: 'Required' }]);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum || (integer && !Number.isInteger(number))) {
    throw apiError(`${field} is invalid`, 400, [{ field, message: `Must be between ${minimum} and ${maximum}` }]);
  }
  return number;
}

export function validateSessionEvaluation(body, isFirstSession) {
  const evaluation = {
    session_performance_score: boundedNumber(body.session_performance_score, 1, 10, 'session_performance_score', true),
    estimated_sessions_remaining: boundedNumber(body.estimated_sessions_remaining, 0, 2147483647, 'estimated_sessions_remaining', true),
    pain_improvement_percent: boundedNumber(body.pain_improvement_percent, 0, 100, 'pain_improvement_percent'),
    progress_vs_previous_percent: null,
    progress_note: typeof body.progress_note === 'string' ? body.progress_note.trim() : '',
  };
  if (!isFirstSession) {
    evaluation.progress_vs_previous_percent = boundedNumber(body.progress_vs_previous_percent, -100, 100, 'progress_vs_previous_percent');
  }
  if (evaluation.progress_note.length > 2000) throw apiError('Progress note is too long', 400);
  return evaluation;
}

export async function evaluationContext(req, res) {
  try {
    const { data: appointment, error } = await req.db.from('appointments')
      .select('id,patient_id,physiotherapist_id,treatment_type,starts_at,ends_at,status,profiles!appointments_patient_id_fkey(first_name,last_name,medical_record_number)')
      .eq('id', req.params.id).eq('physiotherapist_id', req.auth.user.id).single();
    if (error || !appointment) throw apiError('Appointment not found', 404);
    if (appointment.status !== 'confirmed') throw apiError('Only confirmed appointments can be evaluated', 409);

    const [previousResult, countResult] = await Promise.all([
      req.db.from('session_evaluations')
        .select('id,session_performance_score,estimated_sessions_remaining,pain_improvement_percent,progress_vs_previous_percent,progress_note,created_at,appointments!inner(starts_at)')
        .eq('patient_id', appointment.patient_id)
        .neq('appointment_id', appointment.id)
        .lt('appointments.starts_at', appointment.starts_at)
        .eq('appointments.status', 'completed')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      req.db.from('appointments').select('id', { count: 'exact', head: true })
        .eq('patient_id', appointment.patient_id)
        .eq('physiotherapist_id', req.auth.user.id)
        .in('status', ['confirmed', 'completed'])
        .lte('starts_at', appointment.starts_at),
    ]);
    if (previousResult.error) throw previousResult.error;
    if (countResult.error) throw countResult.error;

    return ok(res, {
      appointment,
      previous_evaluation: previousResult.data || null,
      is_first_evaluated_session: !previousResult.data,
      session_number: countResult.count || 1,
    });
  } catch (error) { return sendError(res, error, 'Unable to load session evaluation'); }
}

export async function completeAppointment(req, res) {
  try {
    const { data: current, error: currentError } = await req.db.from('appointments')
      .select('id,status,patient_id,physiotherapist_id,starts_at')
      .eq('id', req.params.id).eq('physiotherapist_id', req.auth.user.id).single();
    if (currentError || !current) throw apiError('Appointment not found', 404);
    if (current.status !== 'confirmed') throw apiError('Only confirmed appointments can be completed', 409);

    const { data: previous, error: previousError } = await req.db.from('session_evaluations')
      .select('id,appointments!inner(starts_at)').eq('patient_id', current.patient_id).neq('appointment_id', current.id)
      .lt('appointments.starts_at', current.starts_at)
      .eq('appointments.status', 'completed')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (previousError) throw previousError;
    const evaluation = validateSessionEvaluation(req.body, !previous);

    const { data, error } = await req.db.rpc('complete_appointment_with_evaluation', {
      p_appointment_id: current.id,
      p_doctor_id: req.auth.user.id,
      p_session_performance_score: evaluation.session_performance_score,
      p_estimated_sessions_remaining: evaluation.estimated_sessions_remaining,
      p_pain_improvement_percent: evaluation.pain_improvement_percent,
      p_progress_vs_previous_percent: evaluation.progress_vs_previous_percent,
      p_progress_note: evaluation.progress_note || null,
    });
    if (error?.code === '23505') throw apiError('This session already has an evaluation', 409);
    if (error) throw error;
    return ok(res, data, 'Session completed successfully', 201);
  } catch (error) { return sendError(res, error, 'Unable to save the evaluation and complete the session'); }
}

export async function updateAppointmentStatus(req, res) {
  try {
    required(req.body, ['status']);
    if (!appointmentStatuses.includes(req.body.status)) throw apiError('Invalid appointment status', 400);
    if (req.body.status === 'completed') throw apiError('Complete the session through the required evaluation form', 409);
    const allowed = { pending: ['confirmed','rejected','cancelled'], confirmed: ['cancelled','no_show'], rejected: [], completed: [], cancelled: [], no_show: [] };
    const { data: current } = await req.db.from('appointments').select('id,status').eq('id', req.params.id).eq('physiotherapist_id', req.auth.user.id).single();
    if (!current) throw apiError('Appointment not found', 404);
    if (!allowed[current.status].includes(req.body.status)) throw apiError(`Cannot change ${current.status} to ${req.body.status}`, 409);
    const { data, error } = await req.db.from('appointments').update({ status: req.body.status, updated_at: new Date().toISOString() }).eq('id', current.id).select('id,status').single();
    if (error) throw error;
    await req.db.from('appointment_status_history').insert({ appointment_id: current.id, old_status: current.status, new_status: req.body.status, changed_by: req.auth.user.id });
    return ok(res, data, 'Appointment status updated successfully');
  } catch (error) { return sendError(res, error, 'Unable to update appointment'); }
}

async function authorizedPatientIds(req) {
  const [assignments, appointments] = await Promise.all([
    req.db.from('patient_physiotherapist_assignments').select('patient_id').eq('physiotherapist_id', req.auth.user.id).eq('is_active', true),
    req.db.from('appointments').select('patient_id').eq('physiotherapist_id', req.auth.user.id),
  ]);
  return [...new Set([...(assignments.data || []), ...(appointments.data || [])].map((x) => x.patient_id))];
}

export async function patients(req, res) {
  try {
    const ids = await authorizedPatientIds(req);
    if (req.params.id && !ids.includes(req.params.id)) throw apiError('Patient not found', 404);
    if (!ids.length) return ok(res, req.params.id ? null : []);
    let query = req.db.from('profiles').select('id,first_name,last_name,email,phone,date_of_birth,medical_record_number').in('id', ids).eq('role', 'patient');
    if (req.params.id) query = query.eq('id', req.params.id).single();
    const { data, error } = await query;
    if (error) throw error;
    return ok(res, data);
  } catch (error) { return sendError(res, error, 'Unable to load patients'); }
}
