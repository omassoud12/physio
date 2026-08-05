import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatedPersonal, validatePayload } from '../src/controllers/medicalRecordController.js';

test('calculates BMI from metric source values and ignores a supplied BMI', () => {
  const result = calculatedPersonal({ height_cm: '180', weight_kg: '81', bmi: 99 });
  assert.equal(result.bmi, 25);
});

test('calculates age from date of birth instead of trusting patient input', () => {
  const now = new Date();
  const birthYear = now.getUTCFullYear() - 30;
  const result = calculatedPersonal({ date_of_birth: `${birthYear}-01-01`, age: 99 });
  assert.ok(result.age === 29 || result.age === 30);
});

test('rejects future birth dates and out-of-range pain scores', () => {
  assert.throws(
    () => validatePayload({ personal_data: { date_of_birth: '2999-01-01' } }),
    /naissance/,
  );
  assert.throws(
    () => validatePayload({ subjective_assessment: { pain_scores: { current: 11 } } }),
    /0 et 10/,
  );
});

test('requires every red-flag answer on final submission', () => {
  assert.throws(
    () => validatePayload({
      personal_data: { first_name: 'A', last_name: 'B', date_of_birth: '1990-01-01', sex: 'female' },
      screening: {},
    }, true),
    /dépistage/,
  );
});
