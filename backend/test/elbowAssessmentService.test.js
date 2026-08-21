import assert from 'node:assert/strict';
import test from 'node:test';
import { validateElbowAssessmentData } from '../src/services/elbowAssessmentService.js';

const completeShape = {
  inspection: { staticFindings: [], dynamic: {}, notes: '' },
  palpation: { locations: {}, notes: '' },
  articular: { movements: {}, endFeel: '', movementQuality: [], notes: '' },
  strengthMobility: { carryingAngle: {}, circumference: {}, accessoryMobility: {}, mmt: {}, gripStrength: {}, muscleLength: [], notes: '' },
  neurological: { sensory: {}, peripheralNerves: {}, reflexes: {}, reflexComparison: '', neurodynamic: {}, notes: '' },
  specialTests: { pathways: [], tests: {}, ulnarSymptoms: [], notes: '' },
  functional: { activities: {}, loading: { push: { activities: [], pain: '' }, pull: { activities: [], pain: '' }, carry: {}, grip: '' }, sports: [], specificMovement: '', sportPain: '', gripStrength: {}, tests: {}, notes: '' },
  outcomeMeasure: { prtee: '', quickdash: '', psfs: [{ activity: '', score: '' }, { activity: '', score: '' }, { activity: '', score: '' }], notes: '' },
  clinicalReasoning: { primaryHypothesis: '', differentialDiagnosis: [], supportingFindings: [], againstFindings: [], confirmationTests: [], interpretation: '' },
};

test('accepts the complete elbow assessment schema', () => {
  assert.equal(validateElbowAssessmentData(completeShape, { completed: true }), completeShape);
});

test('validates elbow clinical measurement ranges', () => {
  assert.throws(() => validateElbowAssessmentData({
    ...completeShape,
    palpation: { locations: { olecranon: { tenderness: 4, findings: [] } }, notes: '' },
  }), /between 0 and 3/);
  assert.throws(() => validateElbowAssessmentData({
    ...completeShape,
    strengthMobility: { ...completeShape.strengthMobility, mmt: { biceps: { right: 6, left: 5, pain: false } } },
  }), /between 0 and 5/);
  assert.throws(() => validateElbowAssessmentData({
    ...completeShape,
    functional: { ...completeShape.functional, sportPain: 11 },
  }), /between 0 and 10/);
  assert.throws(() => validateElbowAssessmentData({
    ...completeShape,
    outcomeMeasure: { ...completeShape.outcomeMeasure, prtee: 101 },
  }), /between 0 and 100/);
});

test('allows only known hypothesis-led elbow special tests', () => {
  assert.doesNotThrow(() => validateElbowAssessmentData({
    ...completeShape,
    specialTests: { pathways: ['lateral'], tests: { cozens: 'positive' }, ulnarSymptoms: [], notes: '' },
  }));
  assert.throws(() => validateElbowAssessmentData({
    ...completeShape,
    specialTests: { pathways: [], tests: { invented_test: 'positive' }, ulnarSymptoms: [], notes: '' },
  }), /unsupported/);
});

test('requires every elbow section before completion', () => {
  const { clinicalReasoning, ...incomplete } = completeShape;
  assert.equal(clinicalReasoning.primaryHypothesis, '');
  assert.throws(() => validateElbowAssessmentData(incomplete, { completed: true }), /All assessment sections/);
});
