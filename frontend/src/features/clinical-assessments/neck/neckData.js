export function createNeckAssessmentData(){return{
  inspection:{staticFindings:[],dynamicFindings:[],notes:''},
  palpation:{locations:{},notes:''},
  articular:{movements:{},movementQuality:[],endFeel:'',segmentalMobility:{},notes:''},
  muscular:{mmt:{},deepNeckFlexor:'',muscleLength:[],muscleControl:[],notes:''},
  neurological:{sensory:{},myotomes:{},reflexes:{},reflexComparison:'',notes:''},
  radicular:{tests:{},notes:''},
  umnScreen:{tests:{},myelopathySymptoms:[],notes:''},
  vascularScreen:{indicated:null,symptoms:[],notes:''},
  functional:{activities:{},tasks:{},notes:''},
  motorControl:{tests:{},notes:''},
  specialTests:{pathways:[],showFull:false,tests:{},notes:''},
  outcomeMeasure:{ndi:'',psfs:[{activity:'',score:''},{activity:'',score:''},{activity:'',score:''}],notes:''},
  clinicalReasoning:{mainHypothesis:'',differentialDiagnosis:[],supportingFindings:[],againstFindings:[],testsNeeded:[],interpretation:''},
}}

function mergeDefaults(defaults,saved){
  if(Array.isArray(defaults))return Array.isArray(saved)?saved:defaults
  if(!defaults||typeof defaults!=='object')return saved===undefined?defaults:saved
  const source=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{}
  return Object.fromEntries(Object.entries({...defaults,...source}).map(([key,value])=>[
    key,
    key in defaults?mergeDefaults(defaults[key],source[key]):value,
  ]))
}

export function mergeNeckAssessmentData(saved={}){return mergeDefaults(createNeckAssessmentData(),saved)}

export function hasNeurologicalConcern(data){
  const sensory=Object.values(data?.neurological?.sensory||{}).some((finding)=>['right','left'].some((side)=>finding?.[side]&&finding[side]!=='normal'))
  const myotomes=Object.values(data?.neurological?.myotomes||{}).some((finding)=>['right','left'].some((side)=>finding?.[side]!==''&&finding?.[side]!==undefined&&Number(finding[side])<5))
  const reflexes=Object.values(data?.neurological?.reflexes||{}).some((finding)=>['right','left'].some((side)=>finding?.[side]&&finding[side]!=='2+'))
  const radicular=Object.values(data?.radicular?.tests||{}).some((finding)=>finding?.result==='positive'||finding?.familiarSymptoms||finding?.sensitizerChange)
  const umn=Object.values(data?.umnScreen?.tests||{}).some((result)=>result==='positive'||result==='abnormal')
  const specialSafety=['spurling','ultt1','hoffmann','babinski','clonus','gait_balance','hand_dexterity'].some((key)=>['positive','abnormal'].includes(data?.specialTests?.tests?.[key]))
  return sensory||myotomes||reflexes||radicular||umn||specialSafety||Boolean(data?.umnScreen?.myelopathySymptoms?.length)
}

export function hasVascularConcern(data){return Boolean(data?.vascularScreen?.symptoms?.length)}
