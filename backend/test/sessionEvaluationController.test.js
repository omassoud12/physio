import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSessionEvaluation } from '../src/controllers/physiotherapistController.js';

const validEvaluation = {
  session_performance_score: 8,
  estimated_sessions_remaining: 6,
  pain_improvement_percent: 35,
  progress_vs_previous_percent: 15,
  progress_note: 'Movement improved.',
};

test('accepts a valid post-session evaluation', () => {
  assert.deepEqual(validateSessionEvaluation(validEvaluation, false), validEvaluation);
});

test('stores no comparison for the first evaluated session', () => {
  const result = validateSessionEvaluation({
    ...validEvaluation,
    progress_vs_previous_percent: 80,
  }, true);

  assert.equal(result.progress_vs_previous_percent, null);
});

test('requires every clinical metric', () => {
  for (const field of [
    'session_performance_score',
    'estimated_sessions_remaining',
    'pain_improvement_percent',
  ]) {
    assert.throws(
      () => validateSessionEvaluation({ ...validEvaluation, [field]: '' }, false),
      /required|invalid/,
    );
  }
  assert.throws(
    () => validateSessionEvaluation({ ...validEvaluation, progress_vs_previous_percent: '' }, false),
    /required|invalid/,
  );
});

test('rejects out-of-range and non-integer values', () => {
  assert.throws(
    () => validateSessionEvaluation({ ...validEvaluation, session_performance_score: 11 }, false),
    /invalid/,
  );
  assert.throws(
    () => validateSessionEvaluation({ ...validEvaluation, estimated_sessions_remaining: -1 }, false),
    /invalid/,
  );
  assert.throws(
    () => validateSessionEvaluation({ ...validEvaluation, estimated_sessions_remaining: 1.5 }, false),
    /invalid/,
  );
  assert.throws(
    () => validateSessionEvaluation({ ...validEvaluation, pain_improvement_percent: 101 }, false),
    /invalid/,
  );
  assert.throws(
    () => validateSessionEvaluation({ ...validEvaluation, progress_vs_previous_percent: -101 }, false),
    /invalid/,
  );
});

test('trims notes and enforces the storage limit', () => {
  const result = validateSessionEvaluation({
    ...validEvaluation,
    progress_note: '  Improved mobility.  ',
  }, false);
  assert.equal(result.progress_note, 'Improved mobility.');
  assert.throws(
    () => validateSessionEvaluation({ ...validEvaluation, progress_note: 'x'.repeat(2001) }, false),
    /too long/,
  );
});
