export function createElbowAssessmentData(){return{
  inspection:{staticFindings:[],dynamic:{},notes:''},
  palpation:{locations:{},notes:''},
  articular:{movements:{},endFeel:'',movementQuality:[],notes:''},
  strengthMobility:{carryingAngle:{},circumference:{},accessoryMobility:{},mmt:{},gripStrength:{},muscleLength:[],notes:''},
  neurological:{sensory:{},peripheralNerves:{},reflexes:{},reflexComparison:'',neurodynamic:{},notes:''},
  specialTests:{pathways:[],tests:{},ulnarSymptoms:[],notes:''},
  functional:{activities:{},loading:{push:{activities:[],pain:''},pull:{activities:[],pain:''},carry:{},grip:''},sports:[],specificMovement:'',sportPain:'',gripStrength:{},tests:{},notes:''},
  outcomeMeasure:{prtee:'',quickdash:'',psfs:[{activity:'',score:''},{activity:'',score:''},{activity:'',score:''}],notes:''},
  clinicalReasoning:{primaryHypothesis:'',differentialDiagnosis:[],supportingFindings:[],againstFindings:[],confirmationTests:[],interpretation:''},
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
export function mergeElbowAssessmentData(saved={}){return mergeDefaults(createElbowAssessmentData(),saved)}
