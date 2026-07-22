import { apiError, ok, pick, required, sendError } from '../utils/http.js';
import { appointmentStatuses } from './clinicController.js';

const professionalFields = ['professional_title','specialization','biography','years_of_experience','consultation_duration','profile_image','is_accepting_patients'];

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
      const { data, error } = await req.db.from('physiotherapist_working_hours').select('id,day_of_week,start_time,end_time,slot_duration_minutes,is_active').eq('physiotherapist_id', req.auth.user.id).order('day_of_week');
      if (error) throw error;
      return ok(res, data);
    }
    required(req.body, ['day_of_week','start_time','end_time','slot_duration_minutes']);
    const { data, error } = await req.db.from('physiotherapist_working_hours').insert({ ...pick(req.body, ['day_of_week','start_time','end_time','slot_duration_minutes','is_active']), physiotherapist_id: req.auth.user.id }).select().single();
    if (error?.code === '23P01') throw apiError('Availability overlaps an existing period', 409);
    if (error) throw error;
    return ok(res, data, 'Availability added successfully', 201);
  } catch (error) { return sendError(res, error, 'Unable to manage availability'); }
}

export async function updateAvailability(req, res) {
  try {
    const update = pick(req.body, ['day_of_week','start_time','end_time','slot_duration_minutes','is_active']);
    const { data, error } = await req.db.from('physiotherapist_working_hours').update({ ...update, updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('physiotherapist_id', req.auth.user.id).select().single();
    if (error?.code === '23P01') throw apiError('Availability overlaps an existing period', 409);
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
    if (new Date(req.body.start_datetime) >= new Date(req.body.end_datetime)) throw apiError('Start must be before end', 400);
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

export async function updateAppointmentStatus(req, res) {
  try {
    required(req.body, ['status']);
    if (!appointmentStatuses.includes(req.body.status)) throw apiError('Invalid appointment status', 400);
    const allowed = { pending: ['confirmed','rejected','cancelled'], confirmed: ['completed','cancelled','no_show'], rejected: [], completed: [], cancelled: [], no_show: [] };
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
