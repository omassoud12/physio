const lateralRegions = new Set([
  'shoulder', 'arm', 'elbow', 'wrist_hand', 'hip', 'thigh', 'knee', 'leg', 'ankle_foot',
])

const centralRegionViews = {
  head: ['front', 'back', 'left', 'right'],
  neck: ['front', 'back', 'left', 'right'],
  chest: ['front', 'left', 'right'],
  upper_back: ['back', 'left', 'right'],
  lower_back: ['back', 'left', 'right'],
}

const region = (value, label, ar, d) => ({ value, label, ar, d })

const frontBackBodyChartViews = [
  {
    key: 'front',
    label: 'Front',
    ar: 'الأمام',
    regions: [
      region('front_head', 'Head', 'الرأس', 'M92 20 C98 8 142 8 148 20 L146 58 C142 75 132 84 120 84 C108 84 98 75 94 58 Z'),
      region('front_neck', 'Neck', 'الرقبة', 'M106 82 C110 87 130 87 134 82 L137 104 C132 112 108 112 103 104 Z'),
      region('front_right_shoulder', 'Right shoulder', 'الكتف الأيمن', 'M103 101 C91 100 77 105 65 116 L72 142 C83 137 94 133 105 130 L111 108 Z'),
      region('front_left_shoulder', 'Left shoulder', 'الكتف الأيسر', 'M137 101 C149 100 163 105 175 116 L168 142 C157 137 146 133 135 130 L129 108 Z'),
      region('front_chest', 'Chest', 'الصدر', 'M106 108 C113 113 127 113 134 108 L149 132 L143 190 C136 198 104 198 97 190 L91 132 Z'),
      region('front_right_arm', 'Right arm', 'الذراع الأيمن', 'M65 116 C57 122 52 139 49 158 L45 199 L66 202 L73 158 L72 142 Z'),
      region('front_left_arm', 'Left arm', 'الذراع الأيسر', 'M175 116 C183 122 188 139 191 158 L195 199 L174 202 L167 158 L168 142 Z'),
      region('front_right_elbow', 'Right elbow', 'المرفق الأيمن', 'M45 197 L66 199 L65 222 C59 228 48 226 42 219 Z'),
      region('front_left_elbow', 'Left elbow', 'المرفق الأيسر', 'M174 199 L195 197 L198 219 C192 226 181 228 175 222 Z'),
      region('front_right_wrist_hand', 'Right wrist / hand', 'المعصم / اليد اليمنى', 'M42 217 C47 224 60 227 65 220 L62 256 L55 278 L45 275 L38 252 Z'),
      region('front_left_wrist_hand', 'Left wrist / hand', 'المعصم / اليد اليسرى', 'M175 220 C180 227 193 224 198 217 L202 252 L195 275 L185 278 L178 256 Z'),
      region('front_right_hip', 'Right hip', 'الورك الأيمن', 'M98 187 C104 194 112 198 120 198 L117 237 L89 239 L84 207 Z'),
      region('front_left_hip', 'Left hip', 'الورك الأيسر', 'M120 198 C128 198 136 194 142 187 L156 207 L151 239 L123 237 Z'),
      region('front_right_thigh', 'Right thigh', 'الفخذ الأيمن', 'M89 236 L117 235 L115 325 L87 325 L82 274 Z'),
      region('front_left_thigh', 'Left thigh', 'الفخذ الأيسر', 'M123 235 L151 236 L158 274 L153 325 L125 325 Z'),
      region('front_right_knee', 'Right knee', 'الركبة اليمنى', 'M87 322 L115 322 L114 352 C107 360 94 360 86 352 Z'),
      region('front_left_knee', 'Left knee', 'الركبة اليسرى', 'M125 322 L153 322 L154 352 C146 360 133 360 126 352 Z'),
      region('front_right_leg', 'Right leg', 'الساق اليمنى', 'M86 349 C94 357 107 358 114 349 L111 430 L89 430 Z'),
      region('front_left_leg', 'Left leg', 'الساق اليسرى', 'M126 349 C133 358 146 357 154 349 L151 430 L129 430 Z'),
      region('front_right_ankle_foot', 'Right ankle / foot', 'الكاحل / القدم اليمنى', 'M89 427 L111 427 L113 452 L103 468 L72 468 C68 460 75 451 88 446 Z'),
      region('front_left_ankle_foot', 'Left ankle / foot', 'الكاحل / القدم اليسرى', 'M129 427 L151 427 L152 446 C165 451 172 460 168 468 L137 468 L127 452 Z'),
    ],
  },
  {
    key: 'back',
    label: 'Back',
    ar: 'الخلف',
    regions: [
      region('back_head', 'Head', 'الرأس', 'M92 20 C98 8 142 8 148 20 L146 58 C142 75 132 84 120 84 C108 84 98 75 94 58 Z'),
      region('back_neck', 'Neck', 'الرقبة', 'M106 82 C110 87 130 87 134 82 L137 104 C132 112 108 112 103 104 Z'),
      region('back_left_shoulder', 'Left shoulder', 'الكتف الأيسر', 'M103 101 C91 100 77 105 65 116 L72 142 C83 137 94 133 105 130 L111 108 Z'),
      region('back_right_shoulder', 'Right shoulder', 'الكتف الأيمن', 'M137 101 C149 100 163 105 175 116 L168 142 C157 137 146 133 135 130 L129 108 Z'),
      region('back_upper_back', 'Upper back', 'أعلى الظهر', 'M106 108 C113 113 127 113 134 108 L149 132 L145 165 C136 173 104 173 95 165 L91 132 Z'),
      region('back_lower_back', 'Lower back', 'أسفل الظهر', 'M95 162 C104 170 136 170 145 162 L143 201 C136 210 104 210 97 201 Z'),
      region('back_left_arm', 'Left arm', 'الذراع الأيسر', 'M65 116 C57 122 52 139 49 158 L45 199 L66 202 L73 158 L72 142 Z'),
      region('back_right_arm', 'Right arm', 'الذراع الأيمن', 'M175 116 C183 122 188 139 191 158 L195 199 L174 202 L167 158 L168 142 Z'),
      region('back_left_elbow', 'Left elbow', 'المرفق الأيسر', 'M45 197 L66 199 L65 222 C59 228 48 226 42 219 Z'),
      region('back_right_elbow', 'Right elbow', 'المرفق الأيمن', 'M174 199 L195 197 L198 219 C192 226 181 228 175 222 Z'),
      region('back_left_wrist_hand', 'Left wrist / hand', 'المعصم / اليد اليسرى', 'M42 217 C47 224 60 227 65 220 L62 256 L55 278 L45 275 L38 252 Z'),
      region('back_right_wrist_hand', 'Right wrist / hand', 'المعصم / اليد اليمنى', 'M175 220 C180 227 193 224 198 217 L202 252 L195 275 L185 278 L178 256 Z'),
      region('back_left_hip', 'Left hip', 'الورك الأيسر', 'M98 198 C104 205 112 209 120 209 L117 240 L89 242 L84 210 Z'),
      region('back_right_hip', 'Right hip', 'الورك الأيمن', 'M120 209 C128 209 136 205 142 198 L156 210 L151 242 L123 240 Z'),
      region('back_left_thigh', 'Left thigh', 'الفخذ الأيسر', 'M89 239 L117 238 L115 325 L87 325 L82 274 Z'),
      region('back_right_thigh', 'Right thigh', 'الفخذ الأيمن', 'M123 238 L151 239 L158 274 L153 325 L125 325 Z'),
      region('back_left_knee', 'Left knee', 'الركبة اليسرى', 'M87 322 L115 322 L114 352 C107 360 94 360 86 352 Z'),
      region('back_right_knee', 'Right knee', 'الركبة اليمنى', 'M125 322 L153 322 L154 352 C146 360 133 360 126 352 Z'),
      region('back_left_leg', 'Left leg', 'الساق اليسرى', 'M86 349 C94 357 107 358 114 349 L111 430 L89 430 Z'),
      region('back_right_leg', 'Right leg', 'الساق اليمنى', 'M126 349 C133 358 146 357 154 349 L151 430 L129 430 Z'),
      region('back_left_ankle_foot', 'Left ankle / foot', 'الكاحل / القدم اليسرى', 'M89 427 L111 427 L113 452 L103 468 L72 468 C68 460 75 451 88 446 Z'),
      region('back_right_ankle_foot', 'Right ankle / foot', 'الكاحل / القدم اليمنى', 'M129 427 L151 427 L152 446 C165 451 172 460 168 468 L137 468 L127 452 Z'),
    ],
  },
]

const sideRegionPaths = [
  ['head', 'Head', 'الرأس', 'M91 21 C97 9 124 7 135 21 C141 29 138 37 148 42 L137 49 C136 64 130 75 122 81 C111 87 99 81 94 72 C89 64 87 54 89 50 L84 43 L91 40 C87 33 87 27 91 21 Z'],
  ['neck', 'Neck', 'الرقبة', 'M98 80 C104 86 116 87 122 81 L125 104 C118 112 101 112 94 103 Z'],
  ['shoulder', 'Shoulder', 'الكتف', 'M94 101 C107 99 121 101 132 108 L137 133 C121 137 106 132 92 122 Z'],
  ['chest', 'Chest', 'الصدر', 'M91 119 C105 130 119 136 137 132 L134 179 C124 188 106 188 88 179 Z'],
  ['upper_back', 'Upper back', 'أعلى الظهر', 'M79 113 C84 107 89 103 95 101 L92 122 L88 179 L77 177 Z'],
  ['lower_back', 'Lower back', 'أسفل الظهر', 'M77 174 C94 182 116 188 134 176 L131 207 C116 214 96 213 80 207 Z'],
  ['arm', 'Arm', 'الذراع', 'M132 108 C145 114 153 123 153 138 L150 190 L136 193 L132 151 Z'],
  ['elbow', 'Elbow', 'المرفق', 'M136 188 L150 187 L160 232 L146 238 L138 221 Z'],
  ['wrist_hand', 'Wrist / hand', 'المعصم / اليد', 'M146 232 L160 230 L154 277 L142 273 L138 250 Z'],
  ['hip', 'Hip', 'الورك', 'M80 204 C96 211 116 214 131 205 L137 274 L104 281 L74 274 Z'],
  ['thigh', 'Thigh', 'الفخذ', 'M77 270 C92 277 117 281 137 270 L133 326 C121 337 91 337 77 326 Z'],
  ['knee', 'Knee', 'الركبة', 'M77 323 C91 334 120 335 133 323 L133 353 C120 361 91 361 77 352 Z'],
  ['leg', 'Leg', 'الساق', 'M77 349 C92 358 119 359 133 349 L131 430 L110 451 L94 451 L79 430 Z'],
  ['ankle_foot', 'Ankle / foot', 'الكاحل / القدم', 'M79 427 L94 448 L110 448 L119 468 L84 468 L65 468 Z'],
]

const sideView = (key, label, ar, mirrored = false) => ({
  key,
  label,
  ar,
  mirrored,
  regions:sideRegionPaths.map(([name, regionLabel, regionAr, d])=>
    region(`${key}_${name}`, `${label} ${regionLabel.toLowerCase()}`, `${regionAr} ${ar}`, d),
  ),
})

export const bodyChartViews = [
  ...frontBackBodyChartViews,
  sideView('left', 'Left', 'اليسار'),
  sideView('right', 'Right', 'اليمين', true),
]

export const bodyChartRegionValues = new Set(
  bodyChartViews.flatMap((view) => view.regions.map(({ value }) => value)),
)

function expandLegacyLocation(value) {
  if (typeof value !== 'string' || !value) return []
  if (bodyChartRegionValues.has(value)) return [value]

  const colonMatch = value.match(/^(front|back|left|right):(.+)$/)
  if (colonMatch) {
    const [, view, name] = colonMatch
    if (lateralRegions.has(name)) {
      if (view === 'left' || view === 'right') {
        const sideValue = `${view}_${name}`
        return bodyChartRegionValues.has(sideValue) ? [sideValue] : []
      }
      return [`${view}_left_${name}`, `${view}_right_${name}`].filter((item) => bodyChartRegionValues.has(item))
    }
    const direct = `${view}_${name}`
    if (bodyChartRegionValues.has(direct)) return [direct]
    return (centralRegionViews[name] || []).map((item) => `${item}_${name}`)
  }

  if (lateralRegions.has(value)) {
    const frontAndBack = ['front', 'back'].flatMap((view) =>
      ['left', 'right'].map((side) => `${view}_${side}_${value}`),
    )
    return [...frontAndBack, `left_${value}`, `right_${value}`]
  }

  return (centralRegionViews[value] || []).map((view) => `${view}_${value}`)
}

export function normalizePainLocations(values = []) {
  const locations = Array.isArray(values) ? values : []
  return [...new Set(locations.flatMap(expandLegacyLocation).filter((value) => bodyChartRegionValues.has(value)))]
}

export function togglePainLocation(values, value) {
  const normalized = normalizePainLocations(values)
  return normalized.includes(value)
    ? normalized.filter((item) => item !== value)
    : [...normalized, value]
}

const primaryPainAreaRegions = {
  ankle:'ankle_foot',
  knee:'knee',
  elbow:'elbow',
  hip:'hip',
  lumbar_spine:'lower_back',
  wrist:'wrist_hand',
  cervical_spine:'neck',
  shoulder:'shoulder',
}

export function primaryPainAreaRegionValues(area, painSide = '') {
  const regionName = primaryPainAreaRegions[area]
  if (!regionName) return []

  const candidates = [...bodyChartRegionValues].filter((value)=>value.endsWith(`_${regionName}`))
  if (!lateralRegions.has(regionName) || !['left', 'right'].includes(painSide)) return candidates

  return candidates.filter((value)=>
    value.startsWith(`${painSide}_`) ||
    value.startsWith(`front_${painSide}_`) ||
    value.startsWith(`back_${painSide}_`),
  )
}
