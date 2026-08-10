import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api.js'
import DashboardLayout from '../dashboards/DashboardLayout.jsx'
import { bodyChartViews, normalizePainLocations } from './bodyChartRegions.js'
import {
  aggravating, documentCategories, functionalLimitations, goals, irritabilityLevels,
  painCauses, painEvolution, painImpactFields, painPatterns, painSchedules, painScoreFields,
  painTypes, redFlags, relieving, steps, symptoms, treatmentsTried,
} from './medicalFields.js'
import './MedicalIntake.css'

const sectionKeys = [
  ['personal_data', ...steps[0]], ['medical_history', ...steps[1]],
  ['risk_factors', ...steps[2]], ['screening', ...steps[4]],
]

const names = {
  first_name:'First name / الاسم الأول', last_name:'Last name / اسم العائلة',
  date_of_birth:'Date of birth / تاريخ الولادة', age:'Age / العمر', sex:'Sex / الجنس',
  marital_status:'Marital status / الحالة الاجتماعية', height_cm:'Height (cm) / الطول',
  weight_kg:'Weight (kg) / الوزن', bmi:'BMI / مؤشر كتلة الجسم',
  dominant_hand:'Dominant hand / اليد المسيطرة', profession:'Occupation / المهنة',
  activity_level:'Physical activity / النشاط البدني', sport:'Sport / الرياضة',
  phone:'Phone / الهاتف', address:'Address / العنوان',
  referring_doctor:'Referring physician / الطبيب المُحوِّل',
  medical_conditions:'Medical history / الأمراض السابقة', allergies:'Allergies / الحساسية',
  allergy_details:'Type of allergy / نوع الحساسية',
}

const onsetOptions = [['sudden','Suddenly','فجأة'],['gradual','Gradually','تدريجياً'],['unknown','Not sure','لست متأكداً']]
const sideOptions = [['left','Left','يسار'],['right','Right','يمين'],['bilateral','Both sides','الجهتان'],['varies','Varies','تتغير']]
const depthOptions = [['superficial','Superficial','سطحي'],['deep','Deep','عميق'],['both','Both','كلاهما'],['unsure','Not sure','غير متأكد']]

const painFieldOptions = {
  onset_type:onsetOptions, causes:painCauses, pain_side:sideOptions, pain_depth:depthOptions,
  pain_types:painTypes, irritability:painPatterns, irritability_level:irritabilityLevels,
  evolution:painEvolution, aggravating, relieving, schedule:painSchedules, symptoms,
  functional_limitations:functionalLimitations, treatments_tried:treatmentsTried, goals,
}

const painGroups = [
  ['History and onset','تاريخ الألم وبدايته',[
    ['onset_date','Start date / تاريخ البداية'], ['onset_type','How it started / كيفية البداية'],
    ['causes','Possible causes / الأسباب المحتملة'], ['causes_other','Other possible cause / سبب محتمل آخر'],
    ['prior_episodes','Same problem before / حدوث المشكلة سابقاً'],
    ['prior_episode_details','Previous episodes / النوبات السابقة'],
    ['complaint_details','Main complaint / الشكوى الرئيسية'],
  ]],
  ['Location and sensation','مكان الألم وطبيعته',[
    ['primary_pain_location','Main painful area / منطقة الألم الرئيسية'],
    ['pain_side','Painful side / جهة الألم'], ['pain_depth','Pain depth / عمق الألم'],
    ['pain_locations','Body-chart regions / المناطق المحددة على مخطط الجسم'],
    ['pain_types','Pain description / وصف الألم'], ['radiation','Pain spreads / انتشار الألم'],
    ['radiation_location','Where it spreads / منطقة انتشار الألم'],
  ]],
  ['Pain intensity — 0 to 10','شدة الألم — من ٠ إلى ١٠',
    painScoreFields.map(([key,fr,ar])=>[`pain_scores.${key}`,`${fr} / ${ar}`])],
  ['Pattern and behaviour','نمط الألم وسلوكه',[
    ['irritability','Frequency / التكرار'], ['irritability_level','Irritability / قابلية الاستثارة'],
    ['episode_duration','Usual episode duration / مدة النوبة المعتادة'],
    ['evolution','Change since onset / التغير منذ البداية'],
    ['aggravating','Aggravating factors / العوامل التي تزيد الألم'],
    ['aggravating_other','Other aggravating factors / عوامل أخرى تزيد الألم'],
    ['relieving','Relieving factors / العوامل التي تخفف الألم'],
    ['relieving_other','Other relieving factors / عوامل أخرى تخفف الألم'],
    ['schedule','Usual timing / التوقيت المعتاد'],
    ['morning_stiffness','Morning stiffness / التيبس الصباحي'],
    ['stiffness_duration','Morning stiffness duration / مدة التيبس الصباحي'],
    ['night_pain','Pain at night / الألم الليلي'],
    ['wakes_from_pain','Wakes from sleep / الاستيقاظ بسبب الألم'],
  ]],
  ['Associated symptoms and daily impact','الأعراض المرافقة والتأثير اليومي',[
    ['symptoms','Associated symptoms / الأعراض المرافقة'],
    ['symptoms_other','Other symptoms / أعراض أخرى'],
    ['functional_limitations','Limited activities / الأنشطة المحدودة'],
    ['functional_limitations_other','Other limited activities / أنشطة محدودة أخرى'],
    ...painImpactFields.map(([key,fr,ar])=>[`pain_impact.${key}`,`Impact on ${fr.toLowerCase()} / تأثير الألم في ${ar}`]),
  ]],
  ['Previous care and goals','العلاجات السابقة والأهداف',[
    ['treatments_tried','Treatments tried / العلاجات المجرّبة'],
    ['treatment_response','Treatment response / الاستجابة للعلاج'],
    ['goals','Treatment goals / أهداف العلاج'], ['personal_goal','Most important goal / الهدف الشخصي الأهم'],
    ['notes','Additional pain notes / ملاحظات إضافية عن الألم'],
  ]],
]

const bodyLocationLabels = new Map(bodyChartViews.flatMap((view)=>
  view.regions.map((region)=>[region.value, `${region.label} (${view.label}) / ${region.ar} (${view.ar})`]),
))

function optionLabel(options, value) {
  const option = options?.find(([key])=>key===value)
  return option ? `${option[1]} / ${option[2]}` : String(value).replaceAll('_',' ')
}

function display(value) {
  if (value === true) return 'Yes / نعم'
  if (value === false) return 'No / لا'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (value && typeof value === 'object') return Object.entries(value).map(([key,item])=>`${names[key] || key}: ${display(item)}`).join(' · ')
  return value === '' || value === null || value === undefined ? '—' : String(value)
}

function getPainValue(pain, key) {
  return key.split('.').reduce((value, part)=>value?.[part], pain)
}

function displayPainValue(field, value) {
  if (field.startsWith('pain_scores.') || field.startsWith('pain_impact.')) {
    return value === '' || value === null || value === undefined ? '—' : <span className="pain-record-score">{value}/10</span>
  }
  if (field === 'pain_locations') {
    const locations = normalizePainLocations(value)
    return locations.length ? locations.map((item)=>bodyLocationLabels.get(item) || item).join(' · ') : '—'
  }
  if (Array.isArray(value)) return value.length ? value.map((item)=>optionLabel(painFieldOptions[field],item)).join(' · ') : '—'
  if (painFieldOptions[field] && value) return optionLabel(painFieldOptions[field],value)
  return display(value)
}

function SectionHeading({fr,ar}) {
  return <div className="medical-section-title"><h2>{fr}</h2><h3 dir="rtl" lang="ar">{ar}</h3></div>
}

function PainSection({ pain = {} }) {
  const knownTopLevelFields = new Set(painGroups.flatMap(([, , fields])=>fields.map(([key])=>key.split('.')[0])))
  const additionalFields = Object.entries(pain).filter(([key])=>!knownTopLevelFields.has(key))
  return <section className="panel medical-form-card pain-record-section">
    <SectionHeading fr="Pain" ar="الألم"/>
    <dl className="medical-record-list">
      {painGroups.flatMap(([fr,ar,fields])=>[
        <div className="pain-record-group" key={`group-${fr}`}><span>{fr}</span><span dir="rtl" lang="ar">{ar}</span></div>,
        ...fields.map(([field,label])=><div key={field}><dt>{label}</dt><dd>{displayPainValue(field,getPainValue(pain,field))}</dd></div>),
      ])}
      {additionalFields.length>0&&<div className="pain-record-group"><span>Additional stored answers</span><span dir="rtl" lang="ar">إجابات إضافية محفوظة</span></div>}
      {additionalFields.map(([field,value])=><div key={field}><dt>{field.replaceAll('_',' ')}</dt><dd>{display(value)}</dd></div>)}
    </dl>
  </section>
}

export default function MedicalRecordViewer() {
  const { patientId } = useParams()
  const [record,setRecord]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  let profile={}
  try { profile=JSON.parse(localStorage.getItem('user_profile')||'{}') } catch { profile={} }
  const back=profile.role==='admin'?'/admin/dashboard':'/physiotherapist/dashboard'

  useEffect(()=>{
    let active=true
    api.get(`/medical-records/patient/${patientId}`)
      .then((response)=>active&&setRecord(response.data.data))
      .catch((requestError)=>active&&setError(requestError.response?.status===404?'Medical record unavailable / الملف الطبي غير متاح':'Unable to access / تعذّر الوصول'))
      .finally(()=>active&&setLoading(false))
    return()=>{active=false}
  },[patientId])

  async function openDocument(id) {
    try {
      const response=await api.get(`/medical-records/documents/${id}/url`)
      window.open(response.data.data.url,'_blank','noopener,noreferrer')
    } catch { setError('Unable to access the document / تعذّر الوصول إلى المستند') }
  }

  return <DashboardLayout role="Authorized clinical access / وصول سريري مصرح" title="Patient medical record / الملف الطبي للمريض" subtitle="Read-only view / عرض للقراءة فقط">
    <div className="medical-shell">
      <div><Link className="text-button" to={back}>← Back / رجوع</Link></div>
      {loading&&<div className="panel medical-loading">Secure loading… / جارٍ التحميل الآمن…</div>}
      {error&&<div className="medical-notice medical-notice--error" role="alert">{error}</div>}
      {record&&<>
        <header className="panel medical-header"><div className="medical-progress-copy"><strong>{record.completion_percent}% complete / مكتمل</strong><span>{record.completion_status==='submitted'?'Submitted / تم الإرسال':'Draft / مسودة'} · {new Date(record.updated_at).toLocaleString()}</span></div><div className="medical-progress" role="progressbar" aria-valuenow={record.completion_percent} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${record.completion_percent}%`}}/></div></header>
        {redFlags.some(([key])=>record.screening?.[key])&&<div className="medical-emergency"><strong>Positive warning signs — clinical evaluation required / علامات تحذيرية إيجابية — يلزم تقييم سريري</strong></div>}
        {sectionKeys.map(([key,fr,ar])=><section className="panel medical-form-card" key={key}><SectionHeading fr={fr} ar={ar}/><dl className="medical-record-list">{Object.entries(record[key]||{}).map(([field,value])=><div key={field}><dt>{names[field]||field.replaceAll('_',' ')}</dt><dd>{display(value)}</dd></div>)}</dl></section>)}
        <PainSection pain={record.subjective_assessment}/>
        <section className="panel medical-form-card"><SectionHeading fr="Surgeries and medications" ar="العمليات والأدوية"/><div className="review-grid"><div className="review-card"><strong>Surgeries / العمليات</strong>{record.surgeries?.map((row)=><p key={row.id}>{row.surgery_date || '—'} · {row.operated_region} {row.details&&`— ${row.details}`}</p>)}{!record.surgeries?.length&&<p>—</p>}</div><div className="review-card"><strong>Medications / الأدوية</strong>{record.medications?.map((row)=><p key={row.id}>{row.medication_name} · {[row.dosage,row.frequency,row.indication].filter(Boolean).join(' · ')}</p>)}{!record.medications?.length&&<p>—</p>}</div></div></section>
        <section className="panel medical-form-card"><SectionHeading fr="Medical documents" ar="المستندات الطبية"/><div className="medical-documents">{record.documents?.map((doc)=><article key={doc.id}><div><strong>{doc.original_filename}</strong><span>{documentCategories.find(([key])=>key===doc.category)?.slice(1).join(' / ')}</span></div><button className="text-button" type="button" onClick={()=>openDocument(doc.id)}>View / عرض</button></article>)}{!record.documents?.length&&<p className="medical-empty">No documents / لا توجد مستندات</p>}</div></section>
      </>}
    </div>
  </DashboardLayout>
}
