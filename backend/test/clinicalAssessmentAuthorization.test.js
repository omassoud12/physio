import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizedPatient, medicalRecordHasRegion } from '../src/controllers/clinicalAssessmentController.js';

function requestWith(results) {
  return {
    auth: { user: { id: 'doctor-1' } },
    db: {
      from(table) {
        const query = {
          select() { return query; },
          eq() { return query; },
          limit() { return query; },
          maybeSingle() { return Promise.resolve(results[table]); },
        };
        return query;
      },
    },
  };
}

const patient = { id: 'patient-1', first_name: 'Test', last_name: 'Patient' };

test('allows a clinician with an active assignment to open the clinical profile', async () => {
  const result = await authorizedPatient(requestWith({
    profiles: { data: patient, error: null },
    patient_physiotherapist_assignments: { data: { id: 'assignment-1' }, error: null },
    appointments: { data: null, error: null },
  }), patient.id);
  assert.equal(result.id, patient.id);
});

test('allows a clinician with a shared appointment to open the clinical profile', async () => {
  const result = await authorizedPatient(requestWith({
    profiles: { data: patient, error: null },
    patient_physiotherapist_assignments: { data: null, error: null },
    appointments: { data: { id: 'appointment-1' }, error: null },
  }), patient.id);
  assert.equal(result.id, patient.id);
});

test('conceals an unrelated patient clinical profile', async () => {
  await assert.rejects(
    authorizedPatient(requestWith({
      profiles: { data: patient, error: null },
      patient_physiotherapist_assignments: { data: null, error: null },
      appointments: { data: null, error: null },
    }), patient.id),
    (error) => error.statusCode === 404,
  );
});

test('maps cervical medical-record selections to the cervical assessment', () => {
  assert.equal(medicalRecordHasRegion({ primary_pain_location: 'cervical_spine' }, 'cervical'), true);
  assert.equal(medicalRecordHasRegion({ pain_locations: ['front_neck'] }, 'cervical'), true);
  assert.equal(medicalRecordHasRegion({ primary_pain_location: 'shoulder' }, 'cervical'), false);
});

test('maps lumbar medical-record selections to the lumbar assessment', () => {
  assert.equal(medicalRecordHasRegion({ primary_pain_location: 'lumbar_spine' }, 'lumbar'), true);
  assert.equal(medicalRecordHasRegion({ pain_locations: ['back_lower_back'] }, 'lumbar'), true);
  assert.equal(medicalRecordHasRegion({ primary_pain_location: 'hip' }, 'lumbar'), false);
});
