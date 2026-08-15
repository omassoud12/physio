import { BooleanChoice, ChoiceButtons, DualLabel, FindingCard, MultiCheck, NotesField, NumberField } from '../../components/AssessmentControls.jsx'
import { accessoryMobility, dynamicFindings, movements, palpationBones, palpationSoft, staticFindings } from '../shoulderConfig.js'

const options = {
  tenderness: ['0','1','2','3'].map((key)=>({key,label:key,labelAr:key})),
  swelling: [{key:'yes',label:'Yes',labelAr:'نعم'},{key:'no',label:'No',labelAr:'لا'}],
  temperature: [{key:'normal',label:'Normal',labelAr:'طبيعية'},{key:'increased',label:'Increased',labelAr:'مرتفعة'}],
  mobility: [{key:'hypomobile',label:'Hypomobile',labelAr:'ناقصة الحركة'},{key:'normal',label:'Normal',labelAr:'طبيعية'},{key:'hypermobile',label:'Hypermobile',labelAr:'مفرطة الحركة'}],
}

export function ObservationSection({ value, onChange }) {
  return <div className="assessment-section__body"><MultiCheck label="Static Observation" labelAr="الملاحظة الثابتة" options={staticFindings} value={value.staticFindings} onChange={(next)=>onChange({...value,staticFindings:next})}/><MultiCheck label="Dynamic Observation — Flexion + Abduction" labelAr="الملاحظة الحركية — الثني والتبعيد" options={dynamicFindings} value={value.dynamicFindings} onChange={(next)=>onChange({...value,dynamicFindings:next})}/><NotesField value={value.notes} onChange={(notes)=>onChange({...value,notes})}/></div>
}

function PalpationGroup({ title, titleAr, locations, value, onChange }) {
  function toggle(key, active) {
    const next = {...value}
    if (active) next[key] = {tenderness:'',swelling:'',temperature:''}
    else delete next[key]
    onChange(next)
  }
  function update(key, field, nextValue) { onChange({...value,[key]:{...value[key],[field]:nextValue}}) }
  return <section className="clinical-subsection"><DualLabel as="h3" label={title} labelAr={titleAr}/><div className="clinical-finding-grid">{locations.map((location)=>{
    const finding = value[location.key]
    return <FindingCard item={location} key={location.key} active={Boolean(finding)} onToggle={(active)=>toggle(location.key,active)}>{finding&&<div className="clinical-finding-controls"><ChoiceButtons label="Tenderness" labelAr="الإيلام" options={options.tenderness} value={String(finding.tenderness??'')} onChange={(next)=>update(location.key,'tenderness',next===''?'':Number(next))}/><ChoiceButtons label="Swelling" labelAr="التورّم" options={options.swelling} value={finding.swelling} onChange={(next)=>update(location.key,'swelling',next)}/><ChoiceButtons label="Temperature" labelAr="درجة الحرارة" options={options.temperature} value={finding.temperature} onChange={(next)=>update(location.key,'temperature',next)}/></div>}</FindingCard>
  })}</div></section>
}

export function PalpationSection({ value, onChange }) {
  return <div className="assessment-section__body"><p className="clinical-guidance">Select only locations examined, then record their findings. / حدّد فقط المواقع التي تم فحصها ثم سجّل النتائج.</p><PalpationGroup title="Bones / Joints" titleAr="العظام / المفاصل" locations={palpationBones} value={value.locations} onChange={(locations)=>onChange({...value,locations})}/><PalpationGroup title="Soft Tissue" titleAr="الأنسجة الرخوة" locations={palpationSoft} value={value.locations} onChange={(locations)=>onChange({...value,locations})}/><NotesField value={value.notes} onChange={(notes)=>onChange({...value,notes})}/></div>
}

export function ArticularSection({ value, onChange }) {
  function movement(key) { return value.movements[key] || {arom:'',prom:'',pain:null,limitation:null} }
  function updateMovement(key, field, nextValue) { onChange({...value,movements:{...value.movements,[key]:{...movement(key),[field]:nextValue}}}) }
  return <div className="assessment-section__body">
    <section className="clinical-subsection"><DualLabel as="h3" label="AROM / PROM" labelAr="مدى الحركة الفعّال / السلبي"/><div className="rom-grid">{movements.map((item)=>{const finding=movement(item.key);return <article className="rom-card" key={item.key}><DualLabel as="h4" label={item.label} labelAr={item.labelAr}/><div className="rom-card__numbers"><NumberField label="AROM" labelAr="المدى الفعّال" min="0" max="360" suffix="°" value={finding.arom} onChange={(next)=>updateMovement(item.key,'arom',next)}/><NumberField label="PROM" labelAr="المدى السلبي" min="0" max="360" suffix="°" value={finding.prom} onChange={(next)=>updateMovement(item.key,'prom',next)}/></div><div className="rom-card__flags"><BooleanChoice label="Pain" labelAr="ألم" value={finding.pain} onChange={(next)=>updateMovement(item.key,'pain',next)}/><BooleanChoice label="Limitation" labelAr="محدودية" value={finding.limitation} onChange={(next)=>updateMovement(item.key,'limitation',next)}/></div></article>})}</div></section>
    <ChoiceButtons label="End Feel" labelAr="الإحساس النهائي للحركة" value={value.endFeel} onChange={(endFeel)=>onChange({...value,endFeel})} options={[{key:'normal',label:'Normal',labelAr:'طبيعي'},{key:'firm',label:'Firm',labelAr:'متماسك'},{key:'hard',label:'Hard',labelAr:'صلب'},{key:'empty',label:'Empty',labelAr:'فارغ'},{key:'pain_limited',label:'Pain-limited',labelAr:'محدود بالألم'}]}/>
    <section className="clinical-subsection"><DualLabel as="h3" label="Functional ROM" labelAr="مدى الحركة الوظيفي"/><div className="clinical-field-grid"><label className="clinical-text-field"><DualLabel label="Hand behind neck" labelAr="اليد خلف الرقبة"/><input value={value.functionalRom.handBehindNeck||''} onChange={(event)=>onChange({...value,functionalRom:{...value.functionalRom,handBehindNeck:event.target.value}})}/></label><label className="clinical-text-field"><DualLabel label="Hand behind back" labelAr="اليد خلف الظهر"/><input value={value.functionalRom.handBehindBack||''} onChange={(event)=>onChange({...value,functionalRom:{...value.functionalRom,handBehindBack:event.target.value}})}/></label><BooleanChoice label="Opposite shoulder" labelAr="الكتف المقابل" value={value.functionalRom.oppositeShoulder} onChange={(next)=>onChange({...value,functionalRom:{...value.functionalRom,oppositeShoulder:next}})}/></div></section>
    <section className="clinical-subsection"><DualLabel as="h3" label="Accessory Mobility" labelAr="الحركة الإضافية"/><div className="clinical-finding-grid">{accessoryMobility.map((item)=><ChoiceButtons key={item.key} label={item.label} labelAr={item.labelAr} options={options.mobility} value={value.accessoryMobility[item.key]||''} onChange={(next)=>onChange({...value,accessoryMobility:{...value.accessoryMobility,[item.key]:next}})}/>)}</div></section>
    <NotesField value={value.notes} onChange={(notes)=>onChange({...value,notes})}/>
  </div>
}
