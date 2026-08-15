import { primaryPainAreaOptions } from '../../pages/medical/painAreaOptions.js'

const regionKey = { cervical_spine: 'cervical', lumbar_spine: 'lumbar' }

export const bodyRegions = primaryPainAreaOptions.map(([sourceKey,label,labelAr]) => ({
  key: regionKey[sourceKey] || sourceKey,
  sourceKey,
  label,
  labelAr,
  available: sourceKey === 'shoulder',
}))

export const assessmentRegistry = {
  shoulder: {
    bodyRegion: 'shoulder',
    assessmentType: 'shoulder_quick_assessment',
    schemaVersion: 1,
    label: 'Shoulder Clinical Assessment',
    labelAr: 'التقييم السريري للكتف',
    route(patientId, assessmentId) {
      return `/physiotherapist/patients/${patientId}/assessments/${assessmentId}`
    },
  },
}

export function assessmentDefinition(bodyRegion) {
  return assessmentRegistry[bodyRegion] || null
}
