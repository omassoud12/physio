import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateAssessmentMetadata,
  validateShoulderAssessmentData,
} from '../src/services/clinicalAssessmentService.js';

const completeShape = {
  observation: { staticFindings: [], dynamicFindings: [], notes: '' },
  palpation: { locations: {}, notes: '' },
  articular: { movements: {}, endFeel: '', functionalRom: {}, accessoryMobility: {}, notes: '' },
  muscular: { mmt: {}, muscleLength: [], scapularControl: [], notes: '' },
  neurological: { sensory: {}, myotomes: {}, reflexes: {}, cervicalScreen: {}, peripheralNerves: {}, notes: '' },
  functional: { activities: {}, painDuringFunction: '', sports: [], tests: {}, notes: '' },
  specialTests: { hypotheses: [], tests: {}, notes: '' },
  clinicalReasoning: { primaryHypothesis: '', differentialDiagnosis: [], supportingFindings: [], againstFindings: [], confirmationTests: [], interpretation: '' },
  outcomeMeasure: { measure: '', baseline: {}, reassessment: {}, notes: '' },
};

test('accepts the version-one shoulder assessment shape', () => {
  assert.equal(validateShoulderAssessmentData(completeShape, { completed: true }), completeShape);
});

test('rejects unsupported assessment fields and body regions', () => {
  assert.throws(() => validateShoulderAssessmentData({ ...completeShape, diagnosis: 'automatic' }), /unsupported/);
  assert.throws(() => validateAssessmentMetadata({ body_region: 'knee' }), /not available/);
});

test('requires an affected side when completing', () => {
  assert.throws(
    () => validateAssessmentMetadata({ status: 'completed', affected_side: '' }, { completing: true }),
    /affected shoulder/,
  );
  assert.equal(validateAssessmentMetadata({ status: 'completed', affected_side: 'bilateral' }).side, 'bilateral');
});

test('validates clinical ranges without generating a diagnosis', () => {
  assert.throws(() => validateShoulderAssessmentData({
    ...completeShape,
    muscular: { ...completeShape.muscular, mmt: { deltoid: { right: 6, left: 5, pain: false } } },
  }), /between 0 and 5/);
  assert.throws(() => validateShoulderAssessmentData({
    ...completeShape,
    functional: { ...completeShape.functional, painDuringFunction: 11 },
  }), /between 0 and 10/);
  assert.throws(() => validateShoulderAssessmentData({
    ...completeShape,
    palpation: { locations: { supraspinatus: { tenderness: 4 } }, notes: '' },
  }), /between 0 and 3/);
});

test('allows only known targeted special tests', () => {
  assert.doesNotThrow(() => validateShoulderAssessmentData({
    ...completeShape,
    specialTests: {
      hypotheses: ['rotator_cuff_subacromial'],
      tests: { hawkins_kennedy: { result: 'positive', pain: '', notes: '' } },
      notes: '',
    },
  }));
  assert.throws(() => validateShoulderAssessmentData({
    ...completeShape,
    specialTests: { hypotheses: [], tests: { invented_test: { result: 'positive' } }, notes: '' },
  }), /unsupported/);
});
