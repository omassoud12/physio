import { apiError, ok, pick, required, sendError } from '../utils/http.js';

const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const appointmentStatuses = ['pending','confirmed','rejected','completed','cancelled','no_show'];

async function activeClinician(db, id) {
  const { data, error } = await db.from('physiotherapists').select('profile_id,consultation_duration,is_accepting_patients,profiles!inner(is_active)').eq('profile_id', id).single();
  if (error || !data || !data.is_accepting_patients || !data.profiles.is_active) throw apiError('Physiotherapist is not available for booking', 404);
  return data;
}

export async function publicPhysiotherapists(req, res) {
  try {
    let query = req.db.from('physiotherapists').select('profile_id,professional_title,specialization,biography,years_of_experience,consultation_duration,profile_image,is_accepting_patients,profiles!inner(first_name,last_name,is_active)').eq('is_accepting_patients', true).eq('profiles.is_active', true);
    if (req.params.id) query = query.eq('profile_id', req.params.id).single();
    const { data, error } = await query;
    if (error) throw apiError('Physiotherapist not found', 404);
    return ok(res, data);
  } catch (error) { return sendError(res, error, 'Unable to load physiotherapists'); }
}

function slotIso(date, time) { return new Date(`${date}T${time}Z`).toISOString(); }

export async function availableSlots(req, res) {
  try {
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw apiError('A valid date is required', 400);
    const clinician = await activeClinician(req.db, req.params.id);
    const day = days[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const startDay = `${date}T00:00:00.000Z`;
    const endDay = `${date}T23:59:59.999Z`;
    const [hours, appointments, timeOff] = await Promise.all([
      req.db.from('physiotherapist_working_hours').select('start_time,end_time,slot_duration_minutes').eq('physiotherapist_id', req.params.id).eq('day_of_week', day).eq('is_active', true),
      req.db.from('appointments').select('starts_at,ends_at').eq('physiotherapist_id', req.params.id).in('status', ['pending','confirmed']).gte('starts_at', startDay).lte('starts_at', endDay),
      req.db.from('physiotherapist_time_off').select('start_datetime,end_datetime').eq('physiotherapist_id', req.params.id).lt('start_datetime', endDay).gt('end_datetime', startDay),
    ]);
    const slots = [];
    for (const period of hours.data || []) {
      let cursor = new Date(slotIso(date, period.start_time));
      const periodEnd = new Date(slotIso(date, period.end_time));
      const duration = period.slot_duration_minutes || clinician.consultation_duration;
      while (cursor.getTime() + duration * 60000 <= periodEnd.getTime()) {
        const end = new Date(cursor.getTime() + duration * 60000);
        const busy = [...(appointments.data || []).map((x) => [new Date(x.starts_at), new Date(x.ends_at)]), ...(timeOff.data || []).map((x) => [new Date(x.start_datetime), new Date(x.end_datetime)])].some(([a,b]) => cursor < b && end > a);
        if (!busy && cursor > new Date()) slots.push({ starts_at: cursor.toISOString(), ends_at: end.toISOString() });
        cursor = end;
      }
    }
    return ok(res, slots);
  } catch (error) { return sendError(res, error, 'Unable to load available slots'); }
}

export async function bookAppointment(req, res) {
  try {
    required(req.body, ['physiotherapist_id','treatment_type','starts_at']);
    const clinician = await activeClinician(req.db, req.body.physiotherapist_id);
    const start = new Date(req.body.starts_at);
    if (Number.isNaN(start.getTime()) || start <= new Date()) throw apiError('Select a future appointment time', 400);
    const date = start.toISOString().slice(0, 10);
    const day = days[start.getUTCDay()];
    const time = start.toISOString().slice(11, 19);
    const { data: hours } = await req.db.from('physiotherapist_working_hours').select('start_time,end_time,slot_duration_minutes').eq('physiotherapist_id', req.body.physiotherapist_id).eq('day_of_week', day).eq('is_active', true).lte('start_time', time).gt('end_time', time);
    const period = (hours || []).find((x) => new Date(start.getTime() + x.slot_duration_minutes * 60000) <= new Date(slotIso(date, x.end_time)));
    if (!period) throw apiError('Selected time is outside working hours', 400);
    const end = new Date(start.getTime() + period.slot_duration_minutes * 60000);
    const { count: off } = await req.db.from('physiotherapist_time_off').select('id', { count: 'exact', head: true }).eq('physiotherapist_id', req.body.physiotherapist_id).lt('start_datetime', end.toISOString()).gt('end_datetime', start.toISOString());
    if (off) throw apiError('Selected time is unavailable', 409);
    const { data, error } = await req.db.from('appointments').insert({ patient_id: req.auth.user.id, physiotherapist_id: req.body.physiotherapist_id, treatment_type: req.body.treatment_type.trim(), starts_at: start.toISOString(), ends_at: end.toISOString(), patient_notes: req.body.patient_notes?.trim() || null, status: 'pending' }).select('id,physiotherapist_id,treatment_type,starts_at,ends_at,status').single();
    if (error?.code === '23P01') throw apiError('That time slot was just booked', 409);
    if (error) throw error;
    return ok(res, data, 'Appointment requested successfully', 201);
  } catch (error) { return sendError(res, error, 'Unable to book appointment'); }
}

export async function myAppointments(req, res) {
  try {
    const { data, error } = await req.db.from('appointments').select('id,physiotherapist_id,treatment_type,starts_at,ends_at,patient_notes,status,profiles!appointments_physiotherapist_id_fkey(first_name,last_name)').eq('patient_id', req.auth.user.id).order('starts_at', { ascending: false });
    if (error) throw error;
    return ok(res, data);
  } catch (error) { return sendError(res, error, 'Unable to load appointments'); }
}

export async function cancelAppointment(req, res) {
  try {
    const { data, error } = await req.db.from('appointments').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('patient_id', req.auth.user.id).in('status', ['pending','confirmed']).select('id,status').single();
    if (error || !data) throw apiError('Cancellable appointment not found', 404);
    await req.db.from('appointment_status_history').insert({ appointment_id: data.id, new_status: 'cancelled', changed_by: req.auth.user.id });
    return ok(res, data, 'Appointment cancelled successfully');
  } catch (error) { return sendError(res, error, 'Unable to cancel appointment'); }
}

export async function rescheduleAppointment(req, res) {
  try {
    required(req.body, ['starts_at']);
    const { data: old } = await req.db.from('appointments').select('id,physiotherapist_id,status').eq('id', req.params.id).eq('patient_id', req.auth.user.id).in('status', ['pending','confirmed']).single();
    if (!old) throw apiError('Reschedulable appointment not found', 404);
    await activeClinician(req.db, old.physiotherapist_id);
    const start = new Date(req.body.starts_at);
    if (Number.isNaN(start.getTime()) || start <= new Date()) throw apiError('Select a future appointment time', 400);
    const date = start.toISOString().slice(0, 10);
    const time = start.toISOString().slice(11, 19);
    const { data: periods } = await req.db.from('physiotherapist_working_hours').select('end_time,slot_duration_minutes').eq('physiotherapist_id', old.physiotherapist_id).eq('day_of_week', days[start.getUTCDay()]).eq('is_active', true).lte('start_time', time).gt('end_time', time);
    const period = (periods || []).find((x) => new Date(start.getTime() + x.slot_duration_minutes * 60000) <= new Date(slotIso(date, x.end_time)));
    if (!period) throw apiError('Selected time is outside working hours', 400);
    const end = new Date(start.getTime() + period.slot_duration_minutes * 60000);
    const { count: off } = await req.db.from('physiotherapist_time_off').select('id', { count: 'exact', head: true }).eq('physiotherapist_id', old.physiotherapist_id).lt('start_datetime', end.toISOString()).gt('end_datetime', start.toISOString());
    if (off) throw apiError('Selected time is unavailable', 409);
    const { data, error } = await req.db.from('appointments').update({ starts_at: start.toISOString(), ends_at: end.toISOString(), status: 'pending', cancelled_at: null, updated_at: new Date().toISOString() }).eq('id', old.id).select('id,physiotherapist_id,treatment_type,starts_at,ends_at,status').single();
    if (error?.code === '23P01') throw apiError('That time slot was just booked', 409);
    if (error) throw error;
    await req.db.from('appointment_status_history').insert({ appointment_id: old.id, old_status: old.status, new_status: 'pending', changed_by: req.auth.user.id });
    return ok(res, data, 'Appointment rescheduled successfully');
  } catch (error) { return sendError(res, error, 'Unable to reschedule appointment'); }
}

export async function ownProfile(req, res) {
  try {
    if (req.method === 'GET') return ok(res, req.auth.profile);
    const update = pick(req.body, ['first_name','last_name','phone']);
    const { data, error } = await req.db.from('profiles').update({ ...update, updated_at: new Date().toISOString() }).eq('id', req.auth.user.id).select('id,first_name,last_name,email,phone,role,is_active').single();
    if (error) throw error;
    return ok(res, data, 'Profile updated successfully');
  } catch (error) { return sendError(res, error, 'Unable to update profile'); }
}

export { appointmentStatuses };
