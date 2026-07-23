import { apiError, ok, pick, required, sendError } from '../utils/http.js';
import {
  CLINIC_TIME_ZONE,
  clinicianSlots,
  eligibleClinicians,
  groupSlotsByDay,
  inclusiveDayCount,
  isIsoDate,
  shuffled,
} from '../services/availabilityService.js';

const appointmentStatuses = ['pending','confirmed','rejected','completed','cancelled','no_show'];

function validRange(from, to) {
  return isIsoDate(from)
    && isIsoDate(to)
    && from <= to
    && inclusiveDayCount(from, to) <= 42;
}

export async function publicPhysiotherapists(req, res) {
  try {
    const clinicians = await eligibleClinicians(req, req.params.id);
    if (req.params.id && !clinicians.length) {
      throw apiError('Physiotherapist not found', 404);
    }
    return ok(res, req.params.id ? clinicians[0] : clinicians);
  } catch (error) { return sendError(res, error, 'Unable to load physiotherapists'); }
}

export async function availableSlots(req, res) {
  try {
    const date = String(req.query.date || '');
    if (!isIsoDate(date)) throw apiError('A valid date is required', 400);
    const clinicians = await eligibleClinicians(req, req.params.id, {
      requirePatientGender: req.auth.profile.role === 'patient',
    });
    if (!clinicians.length) throw apiError('Physiotherapist is not available for booking', 404);
    const slots = await clinicianSlots(req.db, clinicians, date, date);
    return ok(res, slots.map(({ starts_at, ends_at }) => ({ starts_at, ends_at })));
  } catch (error) { return sendError(res, error, 'Unable to load available slots'); }
}

export async function calendarAvailability(req, res) {
  try {
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    if (!validRange(from, to)) {
      throw apiError('Choose a valid calendar range of up to 42 days', 400);
    }

    const requestedId = String(req.query.physiotherapist_id || '').trim() || undefined;
    const doctors = await eligibleClinicians(req, requestedId, {
      requirePatientGender: true,
    });
    const slots = await clinicianSlots(req.db, doctors, from, to);

    return ok(res, {
      from,
      to,
      time_zone: CLINIC_TIME_ZONE,
      doctors,
      days: groupSlotsByDay(slots, from, to),
    });
  } catch (error) { return sendError(res, error, 'Unable to load calendar availability'); }
}

export async function bookAppointment(req, res) {
  try {
    required(req.body, ['treatment_type','starts_at']);
    if (typeof req.body.treatment_type !== 'string') {
      throw apiError('Treatment type must be text', 400);
    }
    const treatmentType = req.body.treatment_type.trim();
    const rawNotes = req.body.notes ?? req.body.patient_notes;
    if (rawNotes !== undefined && rawNotes !== null && typeof rawNotes !== 'string') {
      throw apiError('Appointment notes must be text', 400);
    }
    const start = new Date(req.body.starts_at);
    if (Number.isNaN(start.getTime()) || start <= new Date()) throw apiError('Select a future appointment time', 400);
    const date = start.toISOString().slice(0, 10);
    const requestedId = String(req.body.physiotherapist_id || '').trim() || undefined;
    const doctors = await eligibleClinicians(req, requestedId, {
      requirePatientGender: true,
    });
    if (!doctors.length) {
      throw apiError(
        requestedId
          ? 'The selected physiotherapist is not available for you'
          : 'No eligible physiotherapist is available',
        409,
      );
    }

    const openSlots = await clinicianSlots(req.db, doctors, date, date);
    const matchingSlots = openSlots.filter((slot) => slot.starts_at === start.toISOString());
    if (!matchingSlots.length) throw apiError('Selected time is no longer available', 409);

    const doctorById = new Map(doctors.map((doctor) => [doctor.profile_id, doctor]));
    const candidates = requestedId ? matchingSlots : shuffled(matchingSlots);
    let bookingConflict = false;

    for (const slot of candidates) {
      const { data, error } = await req.db
        .from('appointments')
        .insert({
          patient_id: req.auth.user.id,
          physiotherapist_id: slot.physiotherapist_id,
          treatment_type: treatmentType,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          patient_notes: rawNotes?.trim() || null,
          status: 'pending',
        })
        .select('id,physiotherapist_id,treatment_type,starts_at,ends_at,status')
        .single();

      if (error?.code === '23P01') {
        bookingConflict = true;
        continue;
      }
      if (error) throw error;

      const assigned = doctorById.get(slot.physiotherapist_id);
      return ok(res, {
        ...data,
        auto_assigned: !requestedId,
        assigned_doctor: {
          profile_id: assigned.profile_id,
          first_name: assigned.profiles.first_name,
          last_name: assigned.profiles.last_name,
          professional_title: assigned.professional_title,
          specialization: assigned.specialization,
        },
      }, !requestedId
        ? `Appointment requested with ${assigned.profiles.first_name} ${assigned.profiles.last_name}`
        : 'Appointment requested successfully', 201);
    }

    throw apiError(
      bookingConflict
        ? 'That time was just booked. Please choose another available time.'
        : 'Selected time is no longer available',
      409,
    );
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
    const start = new Date(req.body.starts_at);
    if (Number.isNaN(start.getTime()) || start <= new Date()) throw apiError('Select a future appointment time', 400);
    const date = start.toISOString().slice(0, 10);
    const doctors = await eligibleClinicians(req, old.physiotherapist_id, {
      requirePatientGender: true,
    });
    if (!doctors.length) {
      throw apiError('Your current physiotherapist is no longer eligible for this appointment', 409);
    }
    const openSlots = await clinicianSlots(req.db, doctors, date, date, {
      excludeAppointmentId: old.id,
    });
    const slot = openSlots.find((candidate) => candidate.starts_at === start.toISOString());
    if (!slot) throw apiError('Selected time is no longer available', 409);

    const { data, error } = await req.db.from('appointments').update({ starts_at: slot.starts_at, ends_at: slot.ends_at, status: 'pending', cancelled_at: null, updated_at: new Date().toISOString() }).eq('id', old.id).select('id,physiotherapist_id,treatment_type,starts_at,ends_at,status').single();
    if (error?.code === '23P01') throw apiError('That time slot was just booked', 409);
    if (error) throw error;
    await req.db.from('appointment_status_history').insert({ appointment_id: old.id, old_status: old.status, new_status: 'pending', changed_by: req.auth.user.id });
    return ok(res, data, 'Appointment rescheduled successfully');
  } catch (error) { return sendError(res, error, 'Unable to reschedule appointment'); }
}

export async function ownProfile(req, res) {
  try {
    if (req.method === 'GET') return ok(res, req.auth.profile);
    const allowedFields = ['first_name','last_name','phone'];
    if (req.auth.profile.role === 'patient') allowedFields.push('gender');
    const update = pick(req.body, allowedFields);
    if (update.gender !== undefined) {
      update.gender = String(update.gender).trim().toLowerCase();
      if (!['female', 'male'].includes(update.gender)) {
        throw apiError('Gender must be female or male', 400);
      }
    }
    const { data, error } = await req.db.from('profiles').update({ ...update, updated_at: new Date().toISOString() }).eq('id', req.auth.user.id).select('id,first_name,last_name,email,phone,gender,role,is_active').single();
    if (error) throw error;
    return ok(res, data, 'Profile updated successfully');
  } catch (error) { return sendError(res, error, 'Unable to update profile'); }
}

export { appointmentStatuses };
