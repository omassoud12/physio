import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import DashboardLayout from '../dashboards/DashboardLayout.jsx'
import BodyChart from './BodyChart.jsx'
import { normalizePainLocations } from './bodyChartRegions.js'
import {
  aggravating, documentCategories, familyConditions, goals,
  functionalLimitations, irritabilityLevels, medicalConditions, painCauses,
  normalizePainDuration, painDurationOptions, painEvolution, painImpactFields, painPatterns, painSchedules, painScoreFields,
  painTypes, redFlags, relieving, steps, symptoms, treatmentsTried,
} from './medicalFields.js'
import './MedicalIntake.css'

const emptyPersonal = { first_name:'', last_name:'', date_of_birth:'', age:'', sex:'', marital_status:'', height_cm:'', weight_kg:'', bmi:'', dominant_hand:'', profession:'', activity_level:'', sport:'', phone:'', address:'', referring_doctor:'' }
const emptyHistory = { medical_conditions:[], medical_other:'', previous_surgery:false, trauma:{ fractures:false, fractures_details:'', dislocations:false, dislocations_details:'', sprains:false, sprains_details:'' }, family_conditions:[], family_other:'', allergies:false, allergy_details:'' }
const emptyRisk = { smoking:false, cigarettes_per_day:'', coffee:false, coffee_cups_per_day:'', sleep_hours:'', physical_activity:false, activity_hours_per_week:'', work:false, work_hours_per_day:'' }
const emptySubjective = {
  onset_date:'', onset_type:'', causes:[], causes_other:'', complaint_details:'', prior_episodes:null,
  prior_episode_details:'', primary_pain_location:'', pain_side:'', pain_locations:[], pain_depth:'',
  pain_scores:{ current:0, today:0, best:0, average:0, worst:0, rest:0, activity:0, night:0 },
  pain_types:[], irritability:'', irritability_level:'', episode_duration:'', evolution:'',
  aggravating:[], aggravating_other:'', relieving:[], relieving_other:'', schedule:[],
  morning_stiffness:false, stiffness_duration:'', night_pain:null, wakes_from_pain:null,
  radiation:false, radiation_location:'', symptoms:[], symptoms_other:'', activities_limited:null, functional_limitations:[],
  functional_limitations_other:'', pain_impact:{ daily_activities:0, sleep:0, walking:0, work:0, mood:0 },
  treatments_tried:[], treatment_response:'', goals:[], personal_goal:'', notes:'',
}
const emptyForm = { booking_id:'', personal_data:emptyPersonal, medical_history:emptyHistory, risk_factors:emptyRisk, screening:{}, subjective_assessment:emptySubjective, surgeries:[], medications:[] }

function ageFromBirth(value) {
  if (!value) return ''
  const birth = new Date(`${value}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return ''
  const now = new Date(); let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1
  return age >= 0 && age <= 120 ? age : ''
}

function bmiFrom(height, weight) {
  const h = Number(height) / 100; const w = Number(weight)
  return h >= 0.8 && h <= 2.5 && w >= 20 && w <= 350 ? Number((w / (h * h)).toFixed(1)) : ''
}

function BilingualLabel({ fr, ar, required = false }) {
  return <span className="medical-label"><span dir="ltr">{fr}{required && <i aria-hidden="true"> *</i>}</span><span dir="rtl" lang="ar">{ar}{required && <i aria-hidden="true"> *</i>}</span></span>
}

function Field({ label, ar, required, error, children, className = '' }) {
  return <label className={`medical-field ${className}`}><BilingualLabel fr={label} ar={ar} required={required}/>{children}{error && <span className="medical-error" role="alert">{error}</span>}</label>
}

function TextInput({ value, onChange, type='text', min, max, step, disabled, required, ...labels }) {
  return <Field {...labels} required={required}><input type={type} value={value ?? ''} min={min} max={max} step={step} disabled={disabled} required={required} onChange={(e)=>onChange(e.target.value)} /></Field>
}

function RadioGroup({ label, ar, value, onChange, options, required=false }) {
  return <fieldset className="medical-field medical-fieldset"><legend><BilingualLabel fr={label} ar={ar} required={required}/></legend><div className="medical-options">{options.map(([key,fr,a])=><label className="medical-choice" key={key}><input type="radio" checked={value===key} onChange={()=>onChange(key)} /><span><span dir="ltr">{fr}</span><span dir="rtl" lang="ar">{a}</span></span></label>)}</div></fieldset>
}

function YesNo({ label, ar, value, onChange }) {
  return <RadioGroup label={label} ar={ar} value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={(v)=>onChange(v==='yes')} options={[["yes","Yes","نعم"],["no","No","لا"]]} />
}

function CheckGroup({ label, ar, values=[], onChange, options, exclusiveKeys=[] }) {
  const toggle=(key)=>{
    if (values.includes(key)) return onChange(values.filter((item)=>item!==key))
    if (exclusiveKeys.includes(key)) return onChange([key])
    return onChange([...values.filter((item)=>!exclusiveKeys.includes(item)),key])
  }
  return <fieldset className="medical-field medical-fieldset medical-field--wide"><legend><BilingualLabel fr={label} ar={ar}/></legend><div className="medical-options medical-options--grid">{options.map(([key,fr,a])=><label className="medical-choice" key={key}><input type="checkbox" checked={values.includes(key)} onChange={()=>toggle(key)} /><span><span dir="ltr">{fr}</span><span dir="rtl" lang="ar">{a}</span></span></label>)}</div></fieldset>
}

function PainScore({ label, ar, value, onChange }) {
  return <div className="pain-score"><BilingualLabel fr={label} ar={ar}/><div><input aria-label={`${label} / ${ar}`} type="range" min="0" max="10" step="1" value={value} onChange={(e)=>onChange(Number(e.target.value))}/><output>{value}/10</output></div></div>
}

function PainSubheading({ fr, ar, note }) {
  return <div className="pain-subheading medical-field--wide"><div><strong>{fr}</strong><strong dir="rtl" lang="ar">{ar}</strong></div>{note&&<small>{note}</small>}</div>
}

function SectionTitle({ fr, ar, note }) {
  return <div className="medical-section-title"><h2 dir="ltr">{fr}</h2><h3 dir="rtl" lang="ar">{ar}</h3>{note && <p>{note}</p>}</div>
}

function ReviewBlock({ title, ar, data }) {
  const filled = Object.values(data || {}).filter((v)=>Array.isArray(v) ? v.length : v !== '' && v !== null && v !== false && v !== undefined).length
  return <div className="review-card"><BilingualLabel fr={title} ar={ar}/><strong>{filled} saved answers / {filled} إجابات محفوظة</strong></div>
}

export default function MedicalIntake() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [lastSaved, setLastSaved] = useState('')
  const [status, setStatus] = useState('draft')
  const [message, setMessage] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const [docDraft, setDocDraft] = useState({ category:'', description:'', file:null })
  const saveRef = useRef(null)
  const savingRef = useRef(false)

  const personal = form.personal_data
  const history = form.medical_history
  const risk = form.risk_factors
  const subjective = form.subjective_assessment
  const positiveFlags = redFlags.filter(([key])=>form.screening[key] === true)
  const progress = useMemo(() => {
    const required = [personal.first_name, personal.last_name, personal.date_of_birth, personal.sex, personal.height_cm, personal.weight_kg, personal.phone, subjective.onset_date, subjective.onset_type, subjective.pain_side]
    const answeredFlags = redFlags.filter(([key])=>typeof form.screening[key] === 'boolean').length
    return Math.min(100, Math.round(((required.filter(Boolean).length + answeredFlags) / (required.length + redFlags.length)) * 100))
  }, [form, personal, subjective])

  const updateSection = (section, key, value) => {
    setForm((current)=>({ ...current, [section]:{ ...current[section], [key]:value } }))
    setDirty(true); setInteracted(true)
  }
  const updatePersonal=(key,value)=>updateSection('personal_data',key,value)
  const updateHistory=(key,value)=>updateSection('medical_history',key,value)
  const updateRisk=(key,value)=>updateSection('risk_factors',key,value)
  const updateSubjective=(key,value)=>updateSection('subjective_assessment',key,value)
  const updateActivitiesLimited=(value)=>{
    setForm((current)=>({
      ...current,
      subjective_assessment:{
        ...current.subjective_assessment,
        activities_limited:value,
        ...(value ? {} : { functional_limitations:[], functional_limitations_other:'' }),
      },
    }))
    setDirty(true); setInteracted(true)
  }

  useEffect(()=>{
    let active=true
    api.get('/medical-records/me').then(({data})=>{
      if (!active) return
      const payload=data.data; const record=payload.record
      const latest=payload.appointments?.find((a)=>!['cancelled','rejected'].includes(a.status))
      if (record) {
        const savedSubjective=record.subjective_assessment || {}
        const activitiesLimited=typeof savedSubjective.activities_limited==='boolean' ? savedSubjective.activities_limited : savedSubjective.functional_limitations?.length ? true : null
        setForm({ booking_id:record.booking_id || latest?.id || '', personal_data:{...emptyPersonal,...record.personal_data}, medical_history:{...emptyHistory,...record.medical_history,trauma:{...emptyHistory.trauma,...record.medical_history?.trauma}}, risk_factors:{...emptyRisk,...record.risk_factors}, screening:record.screening || {}, subjective_assessment:{...emptySubjective,...savedSubjective,activities_limited:activitiesLimited,episode_duration:normalizePainDuration(savedSubjective.episode_duration),pain_locations:normalizePainLocations(savedSubjective.pain_locations),pain_scores:{...emptySubjective.pain_scores,...savedSubjective.pain_scores},pain_impact:{...emptySubjective.pain_impact,...savedSubjective.pain_impact}}, surgeries:record.surgeries || [], medications:record.medications || [] })
        setDocuments(record.documents || []); setStatus(record.completion_status); setLastSaved(record.updated_at)
      } else {
        setForm((current)=>({ ...current, booking_id:latest?.id || '', personal_data:{...current.personal_data,first_name:payload.profile?.first_name || '',last_name:payload.profile?.last_name || '',phone:payload.profile?.phone || '',sex:payload.profile?.gender || '',date_of_birth:payload.profile?.date_of_birth || ''} }))
      }
    }).catch(()=>setMessage({error:true,text:'Unable to load the record / تعذّر تحميل الملف'})).finally(()=>active&&setLoading(false))
    return ()=>{active=false}
  },[])

  useEffect(()=>{
    const age=ageFromBirth(personal.date_of_birth); const bmi=bmiFrom(personal.height_cm,personal.weight_kg)
    if (age !== personal.age || bmi !== personal.bmi) setForm((current)=>({ ...current, personal_data:{...current.personal_data,age,bmi} }))
  },[personal.date_of_birth,personal.height_cm,personal.weight_kg,personal.age,personal.bmi])

  const save = useCallback(async (submit=false, quiet=false)=>{
    if (savingRef.current) return false
    savingRef.current=true; setSaving(true); if (!quiet) setMessage(null)
    try {
      const response=await api.put('/medical-records/me',{...form,completion_percent:progress,completion_status:submit?'submitted':'draft'})
      setLastSaved(response.data.data.updated_at); setStatus(response.data.data.completion_status); setDirty(false)
      if (!quiet) setMessage({error:false,text:submit?'Record submitted successfully / تم إرسال الملف بنجاح':'Draft saved / تم حفظ المسودة'})
      return true
    } catch (error) {
      setMessage({error:true,text:error.response?.data?.message || 'Save failed / تعذّر الحفظ'}); return false
    } finally { savingRef.current=false; setSaving(false) }
  },[form,progress])
  saveRef.current=save

  useEffect(()=>{
    if (!dirty || !interacted || saving || loading) return undefined
    const timer=setTimeout(()=>saveRef.current?.(false,true),3000)
    return ()=>clearTimeout(timer)
  },[dirty,interacted,saving,loading,form])

  useEffect(()=>{
    const warn=(event)=>{ if (dirty) { event.preventDefault(); event.returnValue='' } }
    window.addEventListener('beforeunload',warn); return()=>window.removeEventListener('beforeunload',warn)
  },[dirty])

  async function uploadDocument(event) {
    event.preventDefault(); if (!docDraft.file || !docDraft.category) return
    if (docDraft.file.size > 8*1024*1024 || !['application/pdf','image/jpeg','image/png','image/webp'].includes(docDraft.file.type)) { setMessage({error:true,text:'PDF/JPG/PNG/WEBP only, 8 MB max. / الملفات المسموحة PDF/JPG/PNG/WEBP وبحد أقصى 8 ميغابايت'}); return }
    setUploading(true); setUploadProgress(0); const payload=new FormData(); payload.append('category',docDraft.category); payload.append('description',docDraft.description); payload.append('file',docDraft.file)
    try { const response=await api.post('/medical-records/documents',payload,{headers:{'Content-Type':'multipart/form-data'},onUploadProgress:(e)=>setUploadProgress(e.total?Math.round(e.loaded/e.total*100):0)}); setDocuments((items)=>[response.data.data,...items]); setDocDraft({category:'',description:'',file:null}); setMessage({error:false,text:'Document uploaded / تم رفع المستند'}) }
    catch(error){setMessage({error:true,text:error.response?.data?.message || 'Upload failed / تعذّر رفع الملف'})} finally{setUploading(false)}
  }
  async function openDocument(id){ try{const r=await api.get(`/medical-records/documents/${id}/url`); window.open(r.data.data.url,'_blank','noopener,noreferrer')}catch{setMessage({error:true,text:'Unable to access the document / تعذّر الوصول إلى المستند'})} }
  async function removeDocument(id){ if(!window.confirm('Delete this document? / هل تريد حذف هذا المستند؟'))return; try{await api.delete(`/medical-records/documents/${id}`);setDocuments((items)=>items.filter((d)=>d.id!==id))}catch{setMessage({error:true,text:'Unable to delete / تعذّر الحذف'})} }

  function validateSubmit(){
    if(!personal.first_name.trim()||!personal.last_name.trim()||!personal.date_of_birth||!personal.sex){setStep(0);setMessage({error:true,text:'Complete the required personal fields / يرجى إكمال الحقول الشخصية المطلوبة'});return false}
    if(new Date(`${personal.date_of_birth}T00:00:00`)>new Date()||!bmiFrom(personal.height_cm,personal.weight_kg)){setStep(0);setMessage({error:true,text:'Check the date of birth, height, and weight / يرجى التحقق من تاريخ الميلاد والطول والوزن'});return false}
    if(!subjective.episode_duration){setStep(5);setMessage({error:true,text:'Choose how long the pain usually lasts / يرجى اختيار مدة الألم المعتادة'});return false}
    return true
  }
  async function submitFinal(){if(!validateSubmit()||!window.confirm('Confirm submission of the medical record? You can still update it later.\n\nهل تؤكد إرسال الملف الطبي؟ سيبقى بإمكانك تحديثه.'))return;await save(true)}

  if(loading)return <DashboardLayout role="Patient / مريض" title="Medical record / الملف الطبي" subtitle="Secure loading… / جارٍ التحميل الآمن…"><div className="panel medical-loading" role="status">Loading… / جارٍ التحميل…</div></DashboardLayout>

  return <DashboardLayout role="Patient / مريض" title="Medical record / الملف الطبي" subtitle="Medical form and physiotherapy assessment / الاستمارة الطبية وتقييم العلاج الفيزيائي">
    <div className="medical-shell">
      <header className="panel medical-header">
        <button className="text-button" type="button" onClick={()=>navigate('/patient/dashboard')}>← Dashboard / لوحة التحكم</button>
        <div className="medical-progress-copy"><strong>{progress}% complete / مكتمل</strong><span>{status==='submitted'?'Submitted / تم الإرسال':'Draft / مسودة'}{lastSaved?` · Last saved / آخر حفظ: ${new Date(lastSaved).toLocaleString()}`:''}</span></div>
        <div className="medical-progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${progress}%`}}/></div>
      </header>
      {message&&<div className={`medical-notice ${message.error?'medical-notice--error':''}`} role={message.error?'alert':'status'}>{message.text}</div>}
      <nav className="medical-steps" aria-label="Steps / الخطوات">{steps.map(([fr,ar],index)=><button type="button" key={fr} className={step===index?'active':''} aria-current={step===index?'step':undefined} onClick={()=>setStep(index)}><span>{index+1}</span><b dir="ltr">{fr}</b><small dir="rtl" lang="ar">{ar}</small></button>)}</nav>
      <main className="panel medical-form-card">
        {step===0&&<section><SectionTitle fr="Personal information" ar="المعلومات الشخصية" note="Fields marked with an asterisk are required. / الحقول المعلّمة بنجمة مطلوبة."/><div className="medical-grid">
          <TextInput label="Last name" ar="اسم العائلة" required value={personal.last_name} onChange={(v)=>updatePersonal('last_name',v)}/><TextInput label="First name" ar="الاسم الأول" required value={personal.first_name} onChange={(v)=>updatePersonal('first_name',v)}/>
          <TextInput label="Date of birth" ar="تاريخ الولادة" required type="date" max={new Date().toISOString().slice(0,10)} value={personal.date_of_birth} onChange={(v)=>updatePersonal('date_of_birth',v)}/><TextInput label="Age — calculated automatically" ar="العمر — يُحسب تلقائياً" value={personal.age} disabled onChange={()=>{}}/>
          <RadioGroup label="Sex" ar="الجنس" required value={personal.sex} onChange={(v)=>updatePersonal('sex',v)} options={[["female","Female","أنثى"],["male","Male","ذكر"],["other","Other / prefer not to say","آخر / أفضل عدم التحديد"]]}/><RadioGroup label="Marital status" ar="الحالة الاجتماعية" value={personal.marital_status} onChange={(v)=>updatePersonal('marital_status',v)} options={[["single","Single","أعزب/عزباء"],["married","Married","متزوج/ة"],["other","Other","أخرى"]]}/>
          <TextInput label="Height in cm" ar="الطول بالسنتيمتر" required type="number" min="80" max="250" value={personal.height_cm} onChange={(v)=>updatePersonal('height_cm',v)}/><TextInput label="Weight in kg" ar="الوزن بالكيلوغرام" required type="number" min="20" max="350" step="0.1" value={personal.weight_kg} onChange={(v)=>updatePersonal('weight_kg',v)}/>
          <TextInput label="BMI — calculated automatically" ar="مؤشر كتلة الجسم — يُحسب تلقائياً" value={personal.bmi} disabled onChange={()=>{}}/><RadioGroup label="Dominant hand" ar="اليد المسيطرة" value={personal.dominant_hand} onChange={(v)=>updatePersonal('dominant_hand',v)} options={[["right","Right","اليمنى"],["left","Left","اليسرى"],["both","Ambidextrous","كلتاهما"]]}/>
          <TextInput label="Occupation" ar="المهنة" value={personal.profession} onChange={(v)=>updatePersonal('profession',v)}/><RadioGroup label="Physical activity level" ar="مستوى النشاط البدني" value={personal.activity_level} onChange={(v)=>updatePersonal('activity_level',v)} options={[["low","Low","منخفض"],["moderate","Moderate","متوسط"],["high","High","مرتفع"]]}/>
          <TextInput label="Sport practiced" ar="الرياضة التي يمارسها" value={personal.sport} onChange={(v)=>updatePersonal('sport',v)}/><TextInput label="Phone" ar="رقم الهاتف" required type="tel" value={personal.phone} onChange={(v)=>updatePersonal('phone',v)}/>
          <TextInput label="Address" ar="العنوان" value={personal.address} onChange={(v)=>updatePersonal('address',v)}/><TextInput label="Referring physician's name, if applicable" ar="اسم الطبيب المُحوِّل، إن وجد" value={personal.referring_doctor} onChange={(v)=>updatePersonal('referring_doctor',v)}/>
        </div></section>}
        {step===1&&<section><SectionTitle fr="Medical history" ar="التاريخ الطبي"/><div className="medical-grid">
          <CheckGroup label="Medical history" ar="الأمراض السابقة" values={history.medical_conditions} onChange={(v)=>updateHistory('medical_conditions',v)} options={medicalConditions}/>{history.medical_conditions.includes('other')&&<Field label="Other — details" ar="أخرى — يرجى التوضيح"><textarea value={history.medical_other} onChange={(e)=>updateHistory('medical_other',e.target.value)}/></Field>}
          <YesNo label="Previous surgery?" ar="هل أُجريت عملية جراحية سابقة؟" value={history.previous_surgery} onChange={(v)=>updateHistory('previous_surgery',v)}/>
          {history.previous_surgery&&<div className="medical-repeat medical-field--wide"><div className="medical-repeat__header"><BilingualLabel fr="Surgeries" ar="العمليات الجراحية"/><button type="button" className="text-button" onClick={()=>{setForm({...form,surgeries:[...form.surgeries,{surgery_date:'',operated_region:'',details:''}]});setDirty(true);setInteracted(true)}}>+ Add / إضافة</button></div>{form.surgeries.map((row,index)=><div className="medical-repeat__row" key={index}><TextInput label="Date" ar="التاريخ" type="date" max={new Date().toISOString().slice(0,10)} value={row.surgery_date} onChange={(v)=>{const next=[...form.surgeries];next[index]={...row,surgery_date:v};setForm({...form,surgeries:next});setDirty(true);setInteracted(true)}}/><TextInput label="Operated region" ar="المنطقة التي أُجريت عليها العملية" value={row.operated_region} onChange={(v)=>{const next=[...form.surgeries];next[index]={...row,operated_region:v};setForm({...form,surgeries:next});setDirty(true);setInteracted(true)}}/><Field label="Additional information" ar="معلومات إضافية"><textarea value={row.details} onChange={(e)=>{const next=[...form.surgeries];next[index]={...row,details:e.target.value};setForm({...form,surgeries:next});setDirty(true);setInteracted(true)}}/></Field><button className="text-button medical-remove" type="button" onClick={()=>{setForm({...form,surgeries:form.surgeries.filter((_,i)=>i!==index)});setDirty(true);setInteracted(true)}}>Remove / إزالة</button></div>)}</div>}
          <fieldset className="medical-field medical-fieldset medical-field--wide"><legend><BilingualLabel fr="Trauma history" ar="الإصابات السابقة"/></legend>{[['fractures','Fractures','كسور'],['dislocations','Dislocations','خلع'],['sprains','Sprains','التواءات']].map(([key,fr,ar])=><div className="medical-conditional" key={key}><label className="medical-choice"><input type="checkbox" checked={history.trauma[key]} onChange={(e)=>updateHistory('trauma',{...history.trauma,[key]:e.target.checked})}/><span><span>{fr}</span><span dir="rtl">{ar}</span></span></label>{history.trauma[key]&&<textarea aria-label={`${fr} / ${ar}`} placeholder="Details / التفاصيل" value={history.trauma[`${key}_details`]} onChange={(e)=>updateHistory('trauma',{...history.trauma,[`${key}_details`]:e.target.value})}/>}</div>)}</fieldset>
          <CheckGroup label="Family history" ar="التاريخ العائلي" values={history.family_conditions} onChange={(v)=>updateHistory('family_conditions',v)} options={familyConditions}/>{history.family_conditions.includes('other')&&<Field label="Other family history" ar="تاريخ عائلي آخر"><textarea value={history.family_other} onChange={(e)=>updateHistory('family_other',e.target.value)}/></Field>}
          <div className="medical-repeat medical-field--wide"><div className="medical-repeat__header"><BilingualLabel fr="Current medications" ar="الأدوية الحالية"/><button type="button" className="text-button" onClick={()=>{setForm({...form,medications:[...form.medications,{medication_name:'',indication:'',dosage:'',frequency:''}]});setDirty(true);setInteracted(true)}}>+ Add medication / إضافة دواء</button></div>{form.medications.map((row,index)=><div className="medical-repeat__row medical-repeat__row--medication" key={index}>{[['medication_name','Medication name','اسم الدواء'],['indication','Indication','سبب الاستخدام'],['dosage','Dosage','الجرعة'],['frequency','Frequency','تكرار الاستخدام']].map(([key,fr,ar])=><TextInput key={key} label={fr} ar={ar} value={row[key]} onChange={(v)=>{const next=[...form.medications];next[index]={...row,[key]:v};setForm({...form,medications:next});setDirty(true);setInteracted(true)}}/>)}<button className="text-button medical-remove" type="button" onClick={()=>{setForm({...form,medications:form.medications.filter((_,i)=>i!==index)});setDirty(true);setInteracted(true)}}>Remove / إزالة</button></div>)}</div>
          <YesNo label="Allergies?" ar="هل توجد حساسية؟" value={history.allergies} onChange={(v)=>updateHistory('allergies',v)}/>{history.allergies&&<Field label="Type of allergy" ar="نوع الحساسية"><textarea value={history.allergy_details} required onChange={(e)=>updateHistory('allergy_details',e.target.value)}/></Field>}
        </div></section>}
        {step===2&&<section><SectionTitle fr="Risk factors" ar="عوامل الخطورة"/><div className="medical-grid">
          <YesNo label="Smoking" ar="التدخين" value={risk.smoking} onChange={(v)=>updateRisk('smoking',v)}/>{risk.smoking&&<TextInput label="Cigarettes per day" ar="عدد السجائر يومياً" type="number" min="0" max="100" value={risk.cigarettes_per_day} onChange={(v)=>updateRisk('cigarettes_per_day',v)}/>}<YesNo label="Coffee" ar="القهوة" value={risk.coffee} onChange={(v)=>updateRisk('coffee',v)}/>{risk.coffee&&<TextInput label="Cups per day" ar="عدد الأكواب يومياً" type="number" min="0" max="30" value={risk.coffee_cups_per_day} onChange={(v)=>updateRisk('coffee_cups_per_day',v)}/>}<TextInput label="Sleep — hours per night" ar="النوم — عدد الساعات ليلاً" type="number" min="0" max="24" step="0.5" value={risk.sleep_hours} onChange={(v)=>updateRisk('sleep_hours',v)}/><YesNo label="Physical activity" ar="النشاط البدني" value={risk.physical_activity} onChange={(v)=>updateRisk('physical_activity',v)}/>{risk.physical_activity&&<TextInput label="Hours per week" ar="ساعات أسبوعياً" type="number" min="0" max="100" step="0.5" value={risk.activity_hours_per_week} onChange={(v)=>updateRisk('activity_hours_per_week',v)}/>}<YesNo label="Currently working" ar="هل تعمل حالياً؟" value={risk.work} onChange={(v)=>updateRisk('work',v)}/>{risk.work&&<TextInput label="Work — hours per day" ar="العمل — ساعات يومياً" type="number" min="0" max="24" step="0.5" value={risk.work_hours_per_day} onChange={(v)=>updateRisk('work_hours_per_day',v)}/>}</div></section>}
        {step===3&&<section><SectionTitle fr="Medical documents" ar="المستندات الطبية" note="Private PDF, JPG, PNG, or WEBP files — 8 MB maximum. / ملفات خاصة بحد أقصى 8 ميغابايت."/><form className="medical-upload" onSubmit={uploadDocument}><Field label="Category" ar="فئة المستند"><select value={docDraft.category} required onChange={(e)=>setDocDraft({...docDraft,category:e.target.value})}><option value="">Select / اختر</option>{documentCategories.map(([key,fr,ar])=><option value={key} key={key}>{fr} / {ar}</option>)}</select></Field><Field label="Optional description" ar="وصف اختياري"><input value={docDraft.description} onChange={(e)=>setDocDraft({...docDraft,description:e.target.value})}/></Field><Field label="File" ar="الملف"><input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(e)=>setDocDraft({...docDraft,file:e.target.files?.[0] || null})}/></Field><button className="button" disabled={uploading}>{uploading?`Uploading ${uploadProgress}% / جارٍ الرفع`:'Upload / رفع المستند'}</button></form><div className="medical-documents">{documents.map((doc)=><article key={doc.id}><div><strong>{doc.original_filename}</strong><span>{documentCategories.find(([key])=>key===doc.category)?.slice(1).join(' / ')} · {(doc.file_size/1024/1024).toFixed(2)} MB</span></div><div><button className="text-button" type="button" onClick={()=>openDocument(doc.id)}>View / عرض</button><button className="text-button medical-remove" type="button" onClick={()=>removeDocument(doc.id)}>Delete / حذف</button></div></article>)}{!documents.length&&<p className="medical-empty">No documents / لا توجد مستندات</p>}</div></section>}
        {step===4&&<section><SectionTitle fr="Screening: warning signs" ar="الفحص الأولي: العلامات التحذيرية" note="This questionnaire does not replace a professional medical evaluation. / هذه الاستمارة لا تحل محل التقييم الطبي المهني."/><div className="red-flag-grid">{redFlags.map(([key,fr,ar])=><div className={form.screening[key]?'red-flag red-flag--positive':'red-flag'} key={key}><YesNo label={fr} ar={ar} value={form.screening[key]} onChange={(v)=>updateSection('screening',key,v)}/></div>)}</div>{positiveFlags.length>0&&<div className="medical-emergency" role="alert"><strong>Warning signs reported / تم الإبلاغ عن علامات تحذيرية</strong><p>Contact a qualified healthcare professional promptly. In an emergency or if symptoms are severe, contact your local emergency services immediately. No automatic diagnosis is provided.</p><p dir="rtl" lang="ar">تواصل سريعاً مع اختصاصي رعاية صحية مؤهل. في حالات الطوارئ أو الأعراض الشديدة، اتصل فوراً بخدمات الطوارئ المحلية. لا يتم تقديم أي تشخيص آلي.</p></div>}</section>}
        {step===5&&<section><SectionTitle fr="Subjective assessment: pain" ar="التقييم الذاتي: الألم" note="Tell us how the pain started, feels, behaves, and affects your life. / أخبرنا كيف بدأ الألم، وما طبيعته، وكيف يتغير، ومدى تأثيره في حياتك."/><div className="medical-grid">
          <PainSubheading fr="1. History and onset" ar="١. تاريخ الألم وبدايته"/>
          <TextInput label="When did the pain or symptoms start?" ar="متى بدأ الألم أو الأعراض؟" type="date" max={new Date().toISOString().slice(0,10)} value={subjective.onset_date} onChange={(v)=>updateSubjective('onset_date',v)}/><RadioGroup label="How did it start?" ar="كيف بدأ الألم؟" value={subjective.onset_type} onChange={(v)=>updateSubjective('onset_type',v)} options={[["sudden","Suddenly","فجأة"],["gradual","Gradually","تدريجياً"],["unknown","Not sure","لست متأكداً"]]}/>
          <CheckGroup label="What may have caused it?" ar="ما الأسباب المحتملة؟" values={subjective.causes} onChange={(v)=>updateSubjective('causes',v)} options={painCauses} exclusiveKeys={['no_clear_cause']}/>{subjective.causes.includes('other')&&<Field label="Other possible cause" ar="سبب محتمل آخر"><textarea value={subjective.causes_other} onChange={(e)=>updateSubjective('causes_other',e.target.value)}/></Field>}
          <YesNo label="Have you had the same problem before?" ar="هل عانيت المشكلة نفسها من قبل؟" value={subjective.prior_episodes} onChange={(v)=>updateSubjective('prior_episodes',v)}/>{subjective.prior_episodes&&<Field label="Describe previous episodes and when they occurred" ar="صف النوبات السابقة ومتى حدثت"><textarea value={subjective.prior_episode_details} onChange={(e)=>updateSubjective('prior_episode_details',e.target.value)}/></Field>}
          <Field label="Describe the main complaint in your own words" ar="صف الشكوى الرئيسية بكلماتك"><textarea value={subjective.complaint_details} onChange={(e)=>updateSubjective('complaint_details',e.target.value)}/></Field>

          <PainSubheading fr="2. Location and sensation" ar="٢. مكان الألم وطبيعته"/>
          <TextInput label="Main painful area" ar="منطقة الألم الرئيسية" value={subjective.primary_pain_location} onChange={(v)=>updateSubjective('primary_pain_location',v)}/><RadioGroup label="Painful side" ar="جهة الألم" value={subjective.pain_side} onChange={(v)=>updateSubjective('pain_side',v)} options={[["left","Left","يسار"],["right","Right","يمين"],["bilateral","Both sides","الجهتان"],["varies","Varies","تتغير"]]}/>
          <RadioGroup label="Does the pain feel superficial or deep?" ar="هل يبدو الألم سطحياً أم عميقاً؟" value={subjective.pain_depth} onChange={(v)=>updateSubjective('pain_depth',v)} options={[["superficial","Superficial","سطحي"],["deep","Deep","عميق"],["both","Both","كلاهما"],["unsure","Not sure","غير متأكد"]]}/><BodyChart label="Mark every painful area on the body chart" ar="حدّد جميع مناطق الألم على مخطط الجسم" values={subjective.pain_locations} onChange={(v)=>updateSubjective('pain_locations',v)}/>
          <CheckGroup label="How would you describe the pain?" ar="كيف تصف طبيعة الألم؟" values={subjective.pain_types} onChange={(v)=>updateSubjective('pain_types',v)} options={painTypes}/>
          <YesNo label="Does the pain spread to another area?" ar="هل ينتشر الألم إلى منطقة أخرى؟" value={subjective.radiation} onChange={(v)=>updateSubjective('radiation',v)}/>{subjective.radiation&&<Field label="Where does it spread?" ar="إلى أين ينتشر الألم؟"><textarea required value={subjective.radiation_location} onChange={(e)=>updateSubjective('radiation_location',e.target.value)}/></Field>}

          <PainSubheading fr="3. Pain intensity" ar="٣. شدة الألم" note="Use 0 for no pain and 10 for the worst pain imaginable. / استخدم ٠ لعدم وجود ألم و١٠ لأشد ألم يمكن تصوره."/>
          <div className="pain-panel medical-field--wide"><div className="pain-scale-note">0 = no pain / لا يوجد ألم <span>10 = worst imaginable pain / أشد ألم يمكن تصوره</span></div>{painScoreFields.map(([key,fr,ar])=><PainScore key={key} label={fr} ar={ar} value={subjective.pain_scores[key] ?? 0} onChange={(v)=>updateSubjective('pain_scores',{...subjective.pain_scores,[key]:v})}/>)}</div>

          <PainSubheading fr="4. Pattern and behaviour" ar="٤. نمط الألم وسلوكه"/>
          <RadioGroup label="How often is the pain present?" ar="كم مرة يكون الألم موجوداً؟" value={subjective.irritability} onChange={(v)=>updateSubjective('irritability',v)} options={painPatterns}/><RadioGroup label="How easily is the pain triggered and how quickly does it settle?" ar="ما مدى سهولة استثارة الألم وسرعة هدوئه؟" value={subjective.irritability_level} onChange={(v)=>updateSubjective('irritability_level',v)} options={irritabilityLevels}/>
          <Field label="When pain starts, how long does it usually last?" ar="عندما يبدأ الألم، كم يستمر عادةً؟" required className="medical-field--wide"><select required value={subjective.episode_duration} onChange={(e)=>updateSubjective('episode_duration',e.target.value)}><option value="">Select a duration / اختر المدة</option>{painDurationOptions.map(([key,fr,ar])=><option key={key} value={key}>{fr} / {ar}</option>)}</select></Field><RadioGroup label="How has the condition changed since it began?" ar="كيف تغيرت الحالة منذ بدايتها؟" value={subjective.evolution} onChange={(v)=>updateSubjective('evolution',v)} options={painEvolution}/>
          <CheckGroup label="What makes the pain worse?" ar="ما الذي يزيد الألم؟" values={subjective.aggravating} onChange={(v)=>updateSubjective('aggravating',v)} options={aggravating}/>{subjective.aggravating.includes('other')&&<Field label="Other aggravating factors" ar="عوامل أخرى تزيد الألم"><textarea value={subjective.aggravating_other} onChange={(e)=>updateSubjective('aggravating_other',e.target.value)}/></Field>}
          <CheckGroup label="What reduces the pain?" ar="ما الذي يخفف الألم؟" values={subjective.relieving} onChange={(v)=>updateSubjective('relieving',v)} options={relieving}/>{subjective.relieving.includes('other')&&<Field label="Other relieving factors" ar="عوامل أخرى تخفف الألم"><textarea value={subjective.relieving_other} onChange={(e)=>updateSubjective('relieving_other',e.target.value)}/></Field>}
          <CheckGroup label="When is the pain usually present?" ar="متى يظهر الألم عادةً؟" values={subjective.schedule} onChange={(v)=>updateSubjective('schedule',v)} options={painSchedules}/>
          <YesNo label="Do you have morning stiffness?" ar="هل تعاني من تيبس صباحي؟" value={subjective.morning_stiffness} onChange={(v)=>updateSubjective('morning_stiffness',v)}/>
          {subjective.morning_stiffness&&<TextInput label="How long does the morning stiffness last?" ar="كم يستمر التيبس الصباحي؟" value={subjective.stiffness_duration} onChange={(v)=>updateSubjective('stiffness_duration',v)}/>}<YesNo label="Do you have pain at night?" ar="هل تعاني من الألم ليلاً؟" value={subjective.night_pain} onChange={(v)=>updateSubjective('night_pain',v)}/>
          {subjective.night_pain&&<YesNo label="Does the pain wake you from sleep?" ar="هل يوقظك الألم من النوم؟" value={subjective.wakes_from_pain} onChange={(v)=>updateSubjective('wakes_from_pain',v)}/>}

          <PainSubheading fr="5. Associated symptoms and daily impact" ar="٥. الأعراض المرافقة والتأثير اليومي"/>
          <CheckGroup label="Which symptoms occur with the pain?" ar="ما الأعراض التي ترافق الألم؟" values={subjective.symptoms} onChange={(v)=>updateSubjective('symptoms',v)} options={symptoms}/>{subjective.symptoms.includes('other')&&<Field label="Other symptoms" ar="أعراض أخرى"><textarea value={subjective.symptoms_other} onChange={(e)=>updateSubjective('symptoms_other',e.target.value)}/></Field>}
          <YesNo label="Does pain limit any of your activities?" ar="هل يحدّ الألم من أي من أنشطتك؟" value={subjective.activities_limited} onChange={updateActivitiesLimited}/>{subjective.activities_limited&&<CheckGroup label="Which activities are limited by the pain?" ar="ما الأنشطة التي يحدّ منها الألم؟" values={subjective.functional_limitations} onChange={(v)=>updateSubjective('functional_limitations',v)} options={functionalLimitations}/>} {subjective.activities_limited&&subjective.functional_limitations.includes('other')&&<Field label="Other limited activities" ar="أنشطة محدودة أخرى"><textarea value={subjective.functional_limitations_other} onChange={(e)=>updateSubjective('functional_limitations_other',e.target.value)}/></Field>}
          <div className="pain-panel medical-field--wide"><div className="pain-scale-note">0 = no interference / لا تأثير <span>10 = completely prevents it / يمنعه تماماً</span></div>{painImpactFields.map(([key,fr,ar])=><PainScore key={key} label={`Impact on ${fr.toLowerCase()}`} ar={`تأثير الألم في ${ar}`} value={subjective.pain_impact[key] ?? 0} onChange={(v)=>updateSubjective('pain_impact',{...subjective.pain_impact,[key]:v})}/>)}</div>

          <PainSubheading fr="6. Previous care and goals" ar="٦. العلاجات السابقة والأهداف"/>
          <CheckGroup label="What have you tried for this pain?" ar="ما العلاجات التي جرّبتها لهذا الألم؟" values={subjective.treatments_tried} onChange={(v)=>updateSubjective('treatments_tried',v)} options={treatmentsTried} exclusiveKeys={['none']}/><Field label="What helped, and by how much?" ar="ما الذي ساعدك، وما مقدار التحسن؟"><textarea value={subjective.treatment_response} onChange={(e)=>updateSubjective('treatment_response',e.target.value)}/></Field>
          <CheckGroup label="What would you like treatment to help you achieve?" ar="ما الذي ترغب في تحقيقه من العلاج؟" values={subjective.goals} onChange={(v)=>updateSubjective('goals',v)} options={goals}/><Field label="Your most important personal goal" ar="هدفك الشخصي الأهم"><textarea value={subjective.personal_goal} onChange={(e)=>updateSubjective('personal_goal',e.target.value)}/></Field><Field label="Anything else we should know about your pain?" ar="هل هناك أي معلومات أخرى ينبغي أن نعرفها عن ألمك؟"><textarea value={subjective.notes} onChange={(e)=>updateSubjective('notes',e.target.value)}/></Field>
        </div></section>}
        {step===6&&<section><SectionTitle fr="Review and confirmation" ar="المراجعة والتأكيد" note="Review each section before submitting. You can update your record later. / راجع الأقسام قبل الإرسال. يمكنك تحديث ملفك لاحقاً."/><div className="review-grid"><ReviewBlock title={steps[0][0]} ar={steps[0][1]} data={personal}/><ReviewBlock title={steps[1][0]} ar={steps[1][1]} data={history}/><ReviewBlock title={steps[2][0]} ar={steps[2][1]} data={risk}/><ReviewBlock title={steps[3][0]} ar={steps[3][1]} data={{documents}}/><ReviewBlock title={steps[4][0]} ar={steps[4][1]} data={form.screening}/><ReviewBlock title={steps[5][0]} ar={steps[5][1]} data={subjective}/></div>{positiveFlags.length>0&&<div className="medical-emergency"><strong>{positiveFlags.length} positive warning sign(s) / {positiveFlags.length} علامة/علامات تحذيرية إيجابية</strong></div>}<label className="medical-confirm"><input type="checkbox" required/><span><span dir="ltr">I confirm that this information is accurate to the best of my knowledge.</span><span dir="rtl" lang="ar">أؤكد أن هذه المعلومات صحيحة حسب معرفتي.</span></span></label><button className="button medical-submit" type="button" disabled={saving} onClick={submitFinal}>{saving?'Submitting… / جارٍ الإرسال…':'Submit record / إرسال الملف'}</button></section>}
        <footer className="medical-actions"><button type="button" className="text-button" disabled={step===0} onClick={()=>setStep((v)=>v-1)}>Previous / السابق</button><button type="button" className="button button--secondary" disabled={saving} onClick={()=>save(false)}>{saving?'Saving… / جارٍ الحفظ…':'Save draft / حفظ المسودة'}</button>{step<6&&<button type="button" className="button" onClick={()=>setStep((v)=>v+1)}>Next / التالي</button>}</footer>
      </main>
    </div>
  </DashboardLayout>
}
