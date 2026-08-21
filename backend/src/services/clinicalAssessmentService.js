import { apiError } from '../utils/http.js';
import { validateElbowAssessmentData } from './elbowAssessmentService.js';
import { validateNeckAssessmentData } from './neckAssessmentService.js';
import { validateLumbarAssessmentData } from './lumbarAssessmentService.js';

export const BODY_REGIONS = new Set([
  'shoulder', 'hip', 'elbow', 'knee', 'ankle', 'cervical', 'wrist', 'lumbar',
]);
export const ASSESSMENT_STATUSES = new Set(['draft', 'completed']);
export const AFFECTED_SIDES = new Set(['right', 'left', 'bilateral']);
export const SHOULDER_ASSESSMENT_TYPE = 'shoulder_quick_assessment';
export const SHOULDER_SCHEMA_VERSION = 1;
export const ELBOW_ASSESSMENT_TYPE = 'elbow_quick_assessment';
export const ELBOW_SCHEMA_VERSION = 1;
export const CERVICAL_ASSESSMENT_TYPE = 'cervical_quick_assessment';
export const CERVICAL_SCHEMA_VERSION = 1;
export const LUMBAR_ASSESSMENT_TYPE = 'lumbar_quick_assessment';
export const LUMBAR_SCHEMA_VERSION = 1;

const SECTION_KEYS = [
  'observation', 'palpation', 'articular', 'muscular', 'neurological',
  'functional', 'specialTests', 'clinicalReasoning', 'outcomeMeasure',
];
const STATIC_FINDINGS = new Set(['posture','shoulder_asymmetry','clavicle_deformity','scapular_position','scapular_winging','muscle_atrophy','swelling','ecchymosis','redness','scar','protective_posture']);
const DYNAMIC_FINDINGS = new Set(['scapular_dyskinesis','shoulder_hiking','painful_arc','limited_movement','compensation']);
const PALPATION_LOCATIONS = new Set(['ac_joint','sc_joint','clavicle','acromion','coracoid','greater_tuberosity','bicipital_groove','deltoid','supraspinatus','infraspinatus','teres_minor','subscapularis','biceps_tendon','pectoralis','upper_trapezius']);
const MOVEMENTS = new Set(['flexion','extension','abduction','adduction','external_rotation','internal_rotation','horizontal_abduction','horizontal_adduction']);
const ACCESSORY_MOBILITY = new Set(['gh_posterior_glide','gh_inferior_glide','gh_anterior_glide','ac_mobility','sc_mobility']);
const MUSCLES = new Set(['deltoid','supraspinatus','external_rotation','internal_rotation','biceps','triceps','serratus_anterior','middle_trapezius','lower_trapezius']);
const MUSCLE_LENGTH = new Set(['pectoralis_minor_tight','pectoralis_major_tight','latissimus_dorsi_tight','posterior_shoulder_tightness']);
const SCAPULAR_CONTROL = new Set(['normal','dyskinesis','winging','excessive_elevation','poor_upward_rotation']);
const DERMATOMES = new Set(['c4','c5','c6','c7','c8','t1']);
const MYOTOMES = new Set(['c5_abduction','c6_wrist_extension','c7_elbow_extension','c8_finger_flexion','t1_finger_abduction']);
const REFLEXES = new Set(['biceps_c5_6','brachioradialis_c6','triceps_c7']);
const CERVICAL_TESTS = new Set(['cervical_rom','spurling','cervical_distraction','ultt1','ultt2','ultt3']);
const PERIPHERAL_NERVES = new Set(['axillary','suprascapular','long_thoracic','spinal_accessory']);
const FUNCTIONAL_ACTIVITIES = new Set(['reaching_overhead','hand_behind_neck','hand_behind_back','dressing','washing_hair','carrying','lifting','pushing','pulling']);
const SPORTS = new Set(['throwing','swimming','tennis','volleyball','weightlifting','boxing','contact_sport']);
const FUNCTIONAL_TESTS = new Set(['wall_push_up','push_up','ckcuest','y_balance_upper_quarter','medicine_ball_throw','closed_chain_stability']);
const HYPOTHESES = new Set(['rotator_cuff_subacromial','possible_rotator_cuff_tear','subscapularis','biceps','ac_joint','instability','labrum','cervical_radiculopathy','scapular_dysfunction','other']);
const SPECIAL_TESTS = new Set(['painful_arc','hawkins_kennedy','neer','empty_can','external_rotation_lag','drop_arm','er_resistance','lift_off','belly_press','bear_hug','speeds','yergasons','cross_body_adduction','ac_shear','apprehension','relocation','surprise_release','obriens','crank','biceps_load_ii','spurling','ultt1','cervical_distraction','scapular_assistance','scapular_retraction','wall_push_up']);
const OUTCOME_MEASURES = new Set(['spadi','quickdash','dash','ases','constant_murley','wosi','worc']);

function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw apiError(`${path} must be an object`, 400);
  return value;
}

function knownKeys(value, allowed, path) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw apiError(`${path} contains unsupported fields`, 400, unknown.map((field) => ({ field: `${path}.${field}`, message: 'Unsupported field' })));
}

function text(value, path, maximum = 2000) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || value.length > maximum) throw apiError(`${path} must be text of at most ${maximum} characters`, 400);
}

function number(value, path, minimum, maximum) {
  if (value === undefined || value === null || value === '') return;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) throw apiError(`${path} must be between ${minimum} and ${maximum}`, 400);
}

function boolean(value, path) {
  if (value !== undefined && value !== null && typeof value !== 'boolean') throw apiError(`${path} must be true, false, or empty`, 400);
}

function enumeration(value, allowed, path) {
  if (value === undefined || value === null || value === '') return;
  if (!allowed.has(value)) throw apiError(`${path} is invalid`, 400);
}

function stringArray(value, allowed, path, maximum = 30) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => typeof item !== 'string' || (allowed && !allowed.has(item)))) {
    throw apiError(`${path} contains invalid selections`, 400);
  }
}

function notesArray(value, path) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 20) throw apiError(`${path} must be a list`, 400);
  value.forEach((item, index) => text(item, `${path}.${index}`, 500));
}

function validateObservation(section) {
  section = object(section, 'observation');
  knownKeys(section, new Set(['staticFindings','dynamicFindings','notes']), 'observation');
  stringArray(section.staticFindings, STATIC_FINDINGS, 'observation.staticFindings');
  stringArray(section.dynamicFindings, DYNAMIC_FINDINGS, 'observation.dynamicFindings');
  text(section.notes, 'observation.notes');
}

function validatePalpation(section) {
  section = object(section, 'palpation');
  knownKeys(section, new Set(['locations','notes']), 'palpation');
  const locations = object(section.locations || {}, 'palpation.locations');
  knownKeys(locations, PALPATION_LOCATIONS, 'palpation.locations');
  for (const [key, finding] of Object.entries(locations)) {
    object(finding, `palpation.locations.${key}`);
    knownKeys(finding, new Set(['tenderness','swelling','temperature']), `palpation.locations.${key}`);
    number(finding.tenderness, `${key}.tenderness`, 0, 3);
    enumeration(finding.swelling, new Set(['yes','no']), `${key}.swelling`);
    enumeration(finding.temperature, new Set(['normal','increased']), `${key}.temperature`);
  }
  text(section.notes, 'palpation.notes');
}

function validateArticular(section) {
  section = object(section, 'articular');
  knownKeys(section, new Set(['movements','endFeel','functionalRom','accessoryMobility','notes']), 'articular');
  const movements = object(section.movements || {}, 'articular.movements');
  knownKeys(movements, MOVEMENTS, 'articular.movements');
  for (const [key, finding] of Object.entries(movements)) {
    object(finding, `articular.movements.${key}`);
    knownKeys(finding, new Set(['arom','prom','pain','limitation']), `articular.movements.${key}`);
    number(finding.arom, `${key}.arom`, 0, 360);
    number(finding.prom, `${key}.prom`, 0, 360);
    boolean(finding.pain, `${key}.pain`);
    boolean(finding.limitation, `${key}.limitation`);
  }
  enumeration(section.endFeel, new Set(['normal','firm','hard','empty','pain_limited']), 'articular.endFeel');
  const functional = object(section.functionalRom || {}, 'articular.functionalRom');
  knownKeys(functional, new Set(['handBehindNeck','handBehindBack','oppositeShoulder']), 'articular.functionalRom');
  text(functional.handBehindNeck, 'articular.functionalRom.handBehindNeck', 500);
  text(functional.handBehindBack, 'articular.functionalRom.handBehindBack', 500);
  boolean(functional.oppositeShoulder, 'articular.functionalRom.oppositeShoulder');
  const mobility = object(section.accessoryMobility || {}, 'articular.accessoryMobility');
  knownKeys(mobility, ACCESSORY_MOBILITY, 'articular.accessoryMobility');
  for (const [key, value] of Object.entries(mobility)) enumeration(value, new Set(['hypomobile','normal','hypermobile']), `articular.accessoryMobility.${key}`);
  text(section.notes, 'articular.notes');
}

function validateMuscular(section) {
  section = object(section, 'muscular');
  knownKeys(section, new Set(['mmt','muscleLength','scapularControl','notes']), 'muscular');
  const mmt = object(section.mmt || {}, 'muscular.mmt');
  knownKeys(mmt, MUSCLES, 'muscular.mmt');
  for (const [key, finding] of Object.entries(mmt)) {
    object(finding, `muscular.mmt.${key}`);
    knownKeys(finding, new Set(['right','left','pain']), `muscular.mmt.${key}`);
    number(finding.right, `${key}.right`, 0, 5);
    number(finding.left, `${key}.left`, 0, 5);
    boolean(finding.pain, `${key}.pain`);
  }
  stringArray(section.muscleLength, MUSCLE_LENGTH, 'muscular.muscleLength');
  stringArray(section.scapularControl, SCAPULAR_CONTROL, 'muscular.scapularControl');
  text(section.notes, 'muscular.notes');
}

function validateNeurological(section) {
  section = object(section, 'neurological');
  knownKeys(section, new Set(['sensory','myotomes','reflexes','cervicalScreen','peripheralNerves','notes']), 'neurological');
  const sensory = object(section.sensory || {}, 'neurological.sensory');
  knownKeys(sensory, DERMATOMES, 'neurological.sensory');
  for (const [key, finding] of Object.entries(sensory)) {
    object(finding, `neurological.sensory.${key}`);
    knownKeys(finding, new Set(['right','left']), `neurological.sensory.${key}`);
    for (const side of ['right','left']) enumeration(finding[side], new Set(['normal','hypoesthesia','paresthesia','numbness','dysesthesia']), `${key}.${side}`);
  }
  const myotomes = object(section.myotomes || {}, 'neurological.myotomes');
  knownKeys(myotomes, MYOTOMES, 'neurological.myotomes');
  for (const [key, finding] of Object.entries(myotomes)) {
    object(finding, `neurological.myotomes.${key}`);
    knownKeys(finding, new Set(['right','left']), `neurological.myotomes.${key}`);
    number(finding.right, `${key}.right`, 0, 5); number(finding.left, `${key}.left`, 0, 5);
  }
  const reflexes = object(section.reflexes || {}, 'neurological.reflexes');
  knownKeys(reflexes, REFLEXES, 'neurological.reflexes');
  for (const [key, finding] of Object.entries(reflexes)) {
    object(finding, `neurological.reflexes.${key}`);
    knownKeys(finding, new Set(['right','left']), `neurological.reflexes.${key}`);
    for (const side of ['right','left']) enumeration(finding[side], new Set(['0','1+','2+','3+','4+']), `${key}.${side}`);
  }
  for (const [field, allowed] of [['cervicalScreen',CERVICAL_TESTS],['peripheralNerves',PERIPHERAL_NERVES]]) {
    const findings = object(section[field] || {}, `neurological.${field}`);
    knownKeys(findings, allowed, `neurological.${field}`);
    for (const [key, value] of Object.entries(findings)) text(value, `neurological.${field}.${key}`, 500);
  }
  text(section.notes, 'neurological.notes');
}

function validateFunctional(section) {
  section = object(section, 'functional');
  knownKeys(section, new Set(['activities','painDuringFunction','sports','tests','notes']), 'functional');
  const activities = object(section.activities || {}, 'functional.activities');
  knownKeys(activities, FUNCTIONAL_ACTIVITIES, 'functional.activities');
  for (const [key, finding] of Object.entries(activities)) {
    object(finding, `functional.activities.${key}`);
    knownKeys(finding, new Set(['difficulty','symptoms']), `functional.activities.${key}`);
    enumeration(finding.difficulty, new Set(['none','mild','moderate','severe','unable']), `${key}.difficulty`);
    text(finding.symptoms, `${key}.symptoms`, 500);
  }
  number(section.painDuringFunction, 'functional.painDuringFunction', 0, 10);
  stringArray(section.sports, SPORTS, 'functional.sports');
  const tests = object(section.tests || {}, 'functional.tests');
  knownKeys(tests, FUNCTIONAL_TESTS, 'functional.tests');
  for (const [key, finding] of Object.entries(tests)) {
    object(finding, `functional.tests.${key}`);
    knownKeys(finding, new Set(['performed','result','notes']), `functional.tests.${key}`);
    boolean(finding.performed, `${key}.performed`); text(finding.result, `${key}.result`, 500); text(finding.notes, `${key}.notes`, 1000);
  }
  text(section.notes, 'functional.notes');
}

function validateSpecialTests(section) {
  section = object(section, 'specialTests');
  knownKeys(section, new Set(['hypotheses','tests','notes']), 'specialTests');
  stringArray(section.hypotheses, HYPOTHESES, 'specialTests.hypotheses', 10);
  const tests = object(section.tests || {}, 'specialTests.tests');
  knownKeys(tests, SPECIAL_TESTS, 'specialTests.tests');
  for (const [key, finding] of Object.entries(tests)) {
    object(finding, `specialTests.tests.${key}`);
    knownKeys(finding, new Set(['result','pain','notes']), `specialTests.tests.${key}`);
    enumeration(finding.result, new Set(['positive','negative','not_performed']), `${key}.result`);
    text(finding.pain, `${key}.pain`, 500); text(finding.notes, `${key}.notes`, 1000);
  }
  text(section.notes, 'specialTests.notes');
}

function validateReasoning(section) {
  section = object(section, 'clinicalReasoning');
  knownKeys(section, new Set(['primaryHypothesis','differentialDiagnosis','supportingFindings','againstFindings','confirmationTests','interpretation']), 'clinicalReasoning');
  text(section.primaryHypothesis, 'clinicalReasoning.primaryHypothesis', 3000);
  text(section.interpretation, 'clinicalReasoning.interpretation', 5000);
  for (const key of ['differentialDiagnosis','supportingFindings','againstFindings','confirmationTests']) notesArray(section[key], `clinicalReasoning.${key}`);
}

function validateOutcome(section) {
  section = object(section, 'outcomeMeasure');
  knownKeys(section, new Set(['measure','baseline','reassessment','notes']), 'outcomeMeasure');
  enumeration(section.measure, OUTCOME_MEASURES, 'outcomeMeasure.measure');
  for (const key of ['baseline','reassessment']) {
    const score = object(section[key] || {}, `outcomeMeasure.${key}`);
    knownKeys(score, new Set(['score','denominator']), `outcomeMeasure.${key}`);
    number(score.score, `outcomeMeasure.${key}.score`, 0, 100000);
    number(score.denominator, `outcomeMeasure.${key}.denominator`, 1, 100000);
  }
  text(section.notes, 'outcomeMeasure.notes');
}

export function validateShoulderAssessmentData(value, { completed = false } = {}) {
  const data = object(value, 'assessment_data');
  if (JSON.stringify(data).length > 250000) throw apiError('Assessment data is too large', 413);
  knownKeys(data, new Set(SECTION_KEYS), 'assessment_data');
  if (completed) {
    const missing = SECTION_KEYS.filter((key) => !data[key]);
    if (missing.length) throw apiError('All assessment sections must be present before completion', 400);
  }
  const validators = [validateObservation, validatePalpation, validateArticular, validateMuscular, validateNeurological, validateFunctional, validateSpecialTests, validateReasoning, validateOutcome];
  SECTION_KEYS.forEach((key, index) => { if (data[key] !== undefined) validators[index](data[key]); });
  return data;
}

export function validateAssessmentData(bodyRegion, value, options) {
  if (bodyRegion === 'shoulder') return validateShoulderAssessmentData(value, options);
  if (bodyRegion === 'elbow') return validateElbowAssessmentData(value, options);
  if (bodyRegion === 'cervical') return validateNeckAssessmentData(value, options);
  if (bodyRegion === 'lumbar') return validateLumbarAssessmentData(value, options);
  throw apiError('This body-region assessment is not available yet', 400);
}

export function validateAssessmentMetadata(body, { completing = false } = {}) {
  const bodyRegion = String(body.body_region || 'shoulder');
  const typeByRegion = { shoulder: SHOULDER_ASSESSMENT_TYPE, elbow: ELBOW_ASSESSMENT_TYPE, cervical: CERVICAL_ASSESSMENT_TYPE, lumbar: LUMBAR_ASSESSMENT_TYPE };
  const defaultType = typeByRegion[bodyRegion] || SHOULDER_ASSESSMENT_TYPE;
  const assessmentType = String(body.assessment_type || defaultType);
  const status = String(body.status || 'draft');
  const side = body.affected_side || null;
  if (!BODY_REGIONS.has(bodyRegion) || !['shoulder','elbow','cervical','lumbar'].includes(bodyRegion)) throw apiError('This body-region assessment is not available yet', 400);
  const expectedType = typeByRegion[bodyRegion];
  if (assessmentType !== expectedType) throw apiError('Invalid assessment type', 400);
  if (!ASSESSMENT_STATUSES.has(status)) throw apiError('Invalid assessment status', 400);
  if (side && !AFFECTED_SIDES.has(side)) throw apiError('Choose a valid affected side', 400);
  if ((completing || status === 'completed') && !side) throw apiError(`Choose the affected ${bodyRegion} before completion`, 400);
  return { bodyRegion, assessmentType, status, side };
}
