import assert from 'node:assert/strict';
import test from 'node:test';
import { bookAppointment } from '../src/controllers/clinicController.js';
import { eligibleClinicians } from '../src/services/availabilityService.js';

function nextMondayAtNine() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  date.setUTCHours(9);
  return date;
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function bookingDb(doctors, insertedAppointments) {
  return {
    from(table) {
      const state = { operation: 'select', inserted: null };
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        lt: () => query,
        gt: () => query,
        neq: () => query,
        insert(values) {
          state.operation = 'insert';
          state.inserted = values;
          return query;
        },
        single() {
          return Promise.resolve(resolveResult());
        },
        then(resolve, reject) {
          return Promise.resolve(resolveResult()).then(resolve, reject);
        },
      };

      function resolveResult() {
        if (table === 'physiotherapists') return { data: doctors, error: null };
        if (table === 'physiotherapist_working_hours') {
          return {
            data: doctors.map((doctor) => ({
              physiotherapist_id: doctor.profile_id,
              day_of_week: 'monday',
              start_time: '09:00:00',
              end_time: '10:00:00',
              slot_duration_minutes: 30,
            })),
            error: null,
          };
        }
        if (table === 'physiotherapist_time_off') return { data: [], error: null };
        if (table === 'appointments' && state.operation === 'select') {
          return { data: [], error: null };
        }
        if (table === 'appointments' && state.operation === 'insert') {
          insertedAppointments.push(state.inserted);
          if (insertedAppointments.length === 1) {
            return { data: null, error: { code: '23P01' } };
          }
          return {
            data: {
              id: 'appointment-1',
              physiotherapist_id: state.inserted.physiotherapist_id,
              treatment_type: state.inserted.treatment_type,
              starts_at: state.inserted.starts_at,
              ends_at: state.inserted.ends_at,
              status: 'pending',
            },
            error: null,
          };
        }
        return { data: [], error: null };
      }

      return query;
    },
  };
}

test('female patient directory queries require female clinician profiles', async () => {
  const filters = [];
  const query = {
    select: () => query,
    eq(column, value) {
      filters.push([column, value]);
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    },
  };
  const req = {
    auth: { profile: { role: 'patient', gender: 'female' } },
    db: { from: () => query },
  };

  await eligibleClinicians(req);

  assert.deepEqual(filters.find(([column]) => column === 'profiles.gender'), [
    'profiles.gender',
    'female',
  ]);
});

test('any-doctor booking retries another random eligible clinician after a race', async () => {
  const doctors = [
    {
      profile_id: 'doctor-a',
      professional_title: 'Physiotherapist',
      specialization: 'Sports',
      biography: '',
      years_of_experience: 4,
      consultation_duration: 30,
      profile_image: null,
      is_accepting_patients: true,
      profiles: {
        first_name: 'Ava',
        last_name: 'One',
        gender: 'female',
        is_active: true,
      },
    },
    {
      profile_id: 'doctor-b',
      professional_title: 'Physiotherapist',
      specialization: 'Rehabilitation',
      biography: '',
      years_of_experience: 7,
      consultation_duration: 30,
      profile_image: null,
      is_accepting_patients: true,
      profiles: {
        first_name: 'Maya',
        last_name: 'Two',
        gender: 'female',
        is_active: true,
      },
    },
  ];
  const insertedAppointments = [];
  const startsAt = nextMondayAtNine().toISOString();
  const req = {
    auth: {
      user: { id: 'patient-1' },
      profile: { role: 'patient', gender: 'female' },
    },
    body: {
      treatment_type: 'Initial assessment',
      starts_at: startsAt,
      notes: 'Knee pain',
    },
    db: bookingDb(doctors, insertedAppointments),
  };
  const res = responseRecorder();

  await bookAppointment(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.auto_assigned, true);
  assert.equal(insertedAppointments.length, 2);
  assert.notEqual(
    insertedAppointments[0].physiotherapist_id,
    insertedAppointments[1].physiotherapist_id,
  );
  assert.equal(insertedAppointments[1].patient_notes, 'Knee pain');
});
