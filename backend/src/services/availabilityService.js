import { apiError } from '../utils/http.js';

export const CLINIC_TIME_ZONE = 'UTC';
export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed'];

export function isIsoDate(value) {
  if (!DATE_PATTERN.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addUtcDays(date, amount) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

export function inclusiveDayCount(from, to) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  return Math.floor((end - start) / 86400000) + 1;
}

function slotIso(date, time) {
  return new Date(`${date}T${String(time).slice(0, 8)}Z`).toISOString();
}

function overlaps(start, end, busyStart, busyEnd) {
  return start < busyEnd && end > busyStart;
}

function clinicianDirectoryRecord(clinician) {
  return {
    profile_id: clinician.profile_id,
    professional_title: clinician.professional_title,
    specialization: clinician.specialization,
    biography: clinician.biography,
    years_of_experience: clinician.years_of_experience,
    consultation_duration: clinician.consultation_duration,
    profile_image: clinician.profile_image,
    is_accepting_patients: clinician.is_accepting_patients,
    profiles: clinician.profiles,
  };
}

export async function eligibleClinicians(req, requestedId, options = {}) {
  const requirePatientGender = options.requirePatientGender ?? false;
  const patientGender = req.auth.profile.role === 'patient'
    ? req.auth.profile.gender
    : null;

  if (req.auth.profile.role === 'patient' && !patientGender) {
    if (requirePatientGender) {
      throw apiError('Add your gender to your profile before booking an appointment', 409);
    }
    return [];
  }

  let query = req.db
    .from('physiotherapists')
    .select('profile_id,professional_title,specialization,biography,years_of_experience,consultation_duration,profile_image,is_accepting_patients,profiles!inner(first_name,last_name,gender,is_active)')
    .eq('is_accepting_patients', true)
    .eq('profiles.is_active', true);

  if (requestedId) query = query.eq('profile_id', requestedId);
  if (patientGender === 'female') query = query.eq('profiles.gender', 'female');

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(clinicianDirectoryRecord);
}

export async function clinicianSlots(db, clinicians, from, to, options = {}) {
  if (!clinicians.length) return [];

  const clinicianIds = clinicians.map((clinician) => clinician.profile_id);
  const rangeStart = `${from}T00:00:00.000Z`;
  const rangeEnd = `${addUtcDays(to, 1)}T00:00:00.000Z`;

  let appointmentsQuery = db
    .from('appointments')
    .select('id,physiotherapist_id,starts_at,ends_at')
    .in('physiotherapist_id', clinicianIds)
    .in('status', ACTIVE_APPOINTMENT_STATUSES)
    .lt('starts_at', rangeEnd)
    .gt('ends_at', rangeStart);
  if (options.excludeAppointmentId) {
    appointmentsQuery = appointmentsQuery.neq('id', options.excludeAppointmentId);
  }

  const [hoursResult, appointmentsResult, timeOffResult] = await Promise.all([
    db
      .from('physiotherapist_working_hours')
      .select('physiotherapist_id,day_of_week,start_time,end_time,slot_duration_minutes')
      .in('physiotherapist_id', clinicianIds)
      .eq('is_active', true),
    appointmentsQuery,
    db
      .from('physiotherapist_time_off')
      .select('physiotherapist_id,start_datetime,end_datetime')
      .in('physiotherapist_id', clinicianIds)
      .lt('start_datetime', rangeEnd)
      .gt('end_datetime', rangeStart),
  ]);

  for (const result of [hoursResult, appointmentsResult, timeOffResult]) {
    if (result.error) throw result.error;
  }

  const hoursByClinician = new Map();
  const busyByClinician = new Map();
  for (const id of clinicianIds) {
    hoursByClinician.set(id, []);
    busyByClinician.set(id, []);
  }
  for (const period of hoursResult.data || []) {
    hoursByClinician.get(period.physiotherapist_id)?.push(period);
  }
  for (const appointment of appointmentsResult.data || []) {
    busyByClinician.get(appointment.physiotherapist_id)?.push([
      new Date(appointment.starts_at),
      new Date(appointment.ends_at),
    ]);
  }
  for (const exception of timeOffResult.data || []) {
    busyByClinician.get(exception.physiotherapist_id)?.push([
      new Date(exception.start_datetime),
      new Date(exception.end_datetime),
    ]);
  }

  const now = options.now ? new Date(options.now) : new Date();
  const slots = [];
  for (const clinician of clinicians) {
    const periods = hoursByClinician.get(clinician.profile_id) || [];
    const busyPeriods = busyByClinician.get(clinician.profile_id) || [];

    for (let date = from; date <= to; date = addUtcDays(date, 1)) {
      const weekday = WEEKDAYS[new Date(`${date}T12:00:00.000Z`).getUTCDay()];
      for (const period of periods.filter((item) => item.day_of_week === weekday)) {
        const duration = Number(period.slot_duration_minutes)
          || Number(clinician.consultation_duration)
          || 30;
        let cursor = new Date(slotIso(date, period.start_time));
        const periodEnd = new Date(slotIso(date, period.end_time));

        while (cursor.getTime() + duration * 60000 <= periodEnd.getTime()) {
          const end = new Date(cursor.getTime() + duration * 60000);
          const busy = busyPeriods.some(([busyStart, busyEnd]) => (
            overlaps(cursor, end, busyStart, busyEnd)
          ));
          if (!busy && cursor > now) {
            slots.push({
              physiotherapist_id: clinician.profile_id,
              starts_at: cursor.toISOString(),
              ends_at: end.toISOString(),
            });
          }
          cursor = end;
        }
      }
    }
  }

  return slots.sort((left, right) => (
    left.starts_at.localeCompare(right.starts_at)
    || left.physiotherapist_id.localeCompare(right.physiotherapist_id)
  ));
}

export function groupSlotsByDay(slots, from, to) {
  const days = {};
  for (let date = from; date <= to; date = addUtcDays(date, 1)) days[date] = [];

  for (const slot of slots) {
    const date = slot.starts_at.slice(0, 10);
    const existing = days[date]?.find((item) => item.starts_at === slot.starts_at);
    if (existing) {
      existing.doctor_ids.push(slot.physiotherapist_id);
      existing.available_doctor_count = existing.doctor_ids.length;
      if (slot.ends_at < existing.ends_at) existing.ends_at = slot.ends_at;
    } else if (days[date]) {
      days[date].push({
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
        doctor_ids: [slot.physiotherapist_id],
        available_doctor_count: 1,
      });
    }
  }

  return days;
}

export function shuffled(values, random = Math.random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
