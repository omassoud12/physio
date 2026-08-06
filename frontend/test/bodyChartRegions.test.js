import assert from 'node:assert/strict'
import test from 'node:test'
import {
  bodyChartRegionValues,
  bodyChartViews,
  normalizePainLocations,
  togglePainLocation,
} from '../src/pages/medical/bodyChartRegions.js'

test('uses unique stable English database values for every anatomical path', () => {
  const regions = bodyChartViews.flatMap((view) => view.regions)
  assert.equal(bodyChartRegionValues.size, regions.length)
  assert.ok(bodyChartRegionValues.has('front_head'))
  assert.ok(bodyChartRegionValues.has('front_left_shoulder'))
  assert.ok(bodyChartRegionValues.has('back_upper_back'))
  assert.ok(bodyChartRegionValues.has('back_lower_back'))
  for (const region of regions) {
    assert.match(region.value, /^(front|back)_[a-z_]+$/)
    assert.ok(region.label)
    assert.match(region.ar, /[\u0600-\u06ff]/)
    assert.ok(region.d)
  }
})

test('distinguishes every applicable left and right region on front and back views', () => {
  const lateralRegions = [
    'shoulder', 'arm', 'elbow', 'wrist_hand', 'hip', 'thigh', 'knee', 'leg', 'ankle_foot',
  ]
  for (const view of ['front', 'back']) {
    for (const region of lateralRegions) {
      assert.ok(bodyChartRegionValues.has(`${view}_left_${region}`))
      assert.ok(bodyChartRegionValues.has(`${view}_right_${region}`))
    }
  }
})

test('selects and deselects multiple independent regions on both views', () => {
  let selected = []
  selected = togglePainLocation(selected, 'front_left_shoulder')
  selected = togglePainLocation(selected, 'front_right_shoulder')
  selected = togglePainLocation(selected, 'back_left_shoulder')
  selected = togglePainLocation(selected, 'back_lower_back')

  assert.deepEqual(selected, [
    'front_left_shoulder',
    'front_right_shoulder',
    'back_left_shoulder',
    'back_lower_back',
  ])

  selected = togglePainLocation(selected, 'front_right_shoulder')
  assert.deepEqual(selected, [
    'front_left_shoulder',
    'back_left_shoulder',
    'back_lower_back',
  ])
})

test('restores multiple saved regions after a patient record round trip', () => {
  const savedRecord = JSON.stringify({
    subjective_assessment: {
      pain_locations: ['front_head', 'front_left_knee', 'back_right_arm', 'back_lower_back'],
    },
  })
  const reopenedRecord = JSON.parse(savedRecord)

  assert.deepEqual(
    normalizePainLocations(reopenedRecord.subjective_assessment.pain_locations),
    ['front_head', 'front_left_knee', 'back_right_arm', 'back_lower_back'],
  )
})

test('restores legacy body-chart values using the new stable regions', () => {
  assert.deepEqual(normalizePainLocations(['front:head', 'back:lower_back']), [
    'front_head',
    'back_lower_back',
  ])
  assert.deepEqual(normalizePainLocations(['front:shoulder']), [
    'front_left_shoulder',
    'front_right_shoulder',
  ])
})
