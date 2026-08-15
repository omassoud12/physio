export function createShoulderAssessmentData() {
  return {
    observation: { staticFindings: [], dynamicFindings: [], notes: '' },
    palpation: { locations: {}, notes: '' },
    articular: { movements: {}, endFeel: '', functionalRom: {}, accessoryMobility: {}, notes: '' },
    muscular: { mmt: {}, muscleLength: [], scapularControl: [], notes: '' },
    neurological: { sensory: {}, myotomes: {}, reflexes: {}, cervicalScreen: {}, peripheralNerves: {}, notes: '' },
    functional: { activities: {}, painDuringFunction: '', sports: [], tests: {}, notes: '' },
    specialTests: { hypotheses: [], tests: {}, notes: '' },
    clinicalReasoning: { primaryHypothesis: '', differentialDiagnosis: [], supportingFindings: [], againstFindings: [], confirmationTests: [], interpretation: '' },
    outcomeMeasure: { measure: '', baseline: {}, reassessment: {}, notes: '' },
  }
}

export function mergeShoulderAssessmentData(saved = {}) {
  const blank = createShoulderAssessmentData()
  return Object.fromEntries(Object.entries(blank).map(([key, value]) => [
    key,
    { ...value, ...(saved[key] || {}) },
  ]))
}
