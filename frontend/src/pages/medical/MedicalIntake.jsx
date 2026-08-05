import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import DashboardLayout from '../dashboards/DashboardLayout.jsx'
import {
  aggravating, bodyRegions, documentCategories, familyConditions, goals,
  medicalConditions, painTypes, redFlags, relieving, steps, symptoms,
} from './medicalFields.js'
import './MedicalIntake.css'

const emptyPersonal = { first_name:'', last_name:'', date_of_birth:'', age:'', sex:'', marital_status:'', height_cm:'', weight_kg:'', bmi:'', dominant_hand:'', profession:'', activity_level:'', sport:'', phone:'', address:'', referring_doctor:'' }
const emptyHistory = { medical_conditions:[], medical_other:'', previous_surgery:false, trauma:{ fractures:false, fractures_details:'', dislocations:false, dislocations_details:'', sprains:false, sprains_details:'' }, family_conditions:[], family_other:'', allergies:false, allergy_details:'' }
const emptyRisk = { smoking:false, cigarettes_per_day:'', coffee:false, coffee_cups_per_day:'', sleep_hours:'', physical_activity:false, activity_hours_per_week:'', work:false, work_hours_per_day:'' }
const emptySubjective = { onset_date:'', onset_type:'', causes:[], complaint_details:'', pain_side:'', pain_locations:[], pain_scores:{ current:0, today:0, worst:0, rest:0, activity:0 }, pain_types:[], irritability:'', evolution:'', aggravating:[], aggravating_other:'', relieving:[], relieving_other:'', schedule:[], morning_stiffness:false, stiffness_duration:'', radiation:false, radiation_location:'', symptoms:[], symptoms_other:'', goals:[], personal_goal:'', notes:'' }
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
  return <RadioGroup label={label} ar={ar} value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={(v)=>onChange(v==='yes')} options={[["yes","Oui","نعم"],["no","Non","لا"]]} />
}

function CheckGroup({ label, ar, values=[], onChange, options }) {
  const toggle=(key)=>onChange(values.includes(key) ? values.filter((item)=>item!==key) : [...values,key])
  if (label.startsWith('Body Chart')) return <fieldset className="medical-field medical-fieldset medical-field--wide"><legend><BilingualLabel fr={label} ar={ar}/></legend><div className="body-chart">{[['front','Face','الأمام'],['back','Dos','الخلف']].map(([side,fr,a])=><div className="body-chart__side" key={side}><div className="body-chart__figure" aria-hidden="true"><svg viewBox="0 0 120 260"><circle cx="60" cy="23" r="17"/><path d="M45 45c-8 8-12 30-13 54l-15 59 14 4 17-53 3 52-12 78 16 2 6-63 5 63 16-2-12-78 3-52 17 53 14-4-15-59c-1-24-5-46-13-54z"/></svg><span>{fr}<small dir="rtl" lang="ar">{a}</small></span></div><div className="body-chart__regions">{options.map(([key,regionFr,regionAr])=>{const stored=`${side}:${key}`;const selected=values.includes(stored)||values.includes(key);return <button type="button" aria-pressed={selected} className={selected?'selected':''} key={stored} onClick={()=>{const withoutLegacy=values.filter((item)=>item!==key);onChange(selected?withoutLegacy.filter((item)=>item!==stored):[...withoutLegacy,stored])}}><span>{regionFr}</span><small dir="rtl" lang="ar">{regionAr}</small></button>})}</div></div>)}</div></fieldset>
  return <fieldset className="medical-field medical-fieldset medical-field--wide"><legend><BilingualLabel fr={label} ar={ar}/></legend><div className="medical-options medical-options--grid">{options.map(([key,fr,a])=><label className="medical-choice" key={key}><input type="checkbox" checked={values.includes(key)} onChange={()=>toggle(key)} /><span><span dir="ltr">{fr}</span><span dir="rtl" lang="ar">{a}</span></span></label>)}</div></fieldset>
}

function PainScore({ label, ar, value, onChange }) {
  return <div className="pain-score"><BilingualLabel fr={label} ar={ar}/><div><input aria-label={`${label} / ${ar}`} type="range" min="0" max="10" step="1" value={value} onChange={(e)=>onChange(Number(e.target.value))}/><output>{value}/10</output></div></div>
}

function SectionTitle({ fr, ar, note }) {
  return <div className="medical-section-title"><h2 dir="ltr">{fr}</h2><h3 dir="rtl" lang="ar">{ar}</h3>{note && <p>{note}</p>}</div>
}

function ReviewBlock({ title, ar, data }) {
  const filled = Object.values(data || {}).filter((v)=>Array.isArray(v) ? v.length : v !== '' && v !== null && v !== false && v !== undefined).length
  return <div className="review-card"><BilingualLabel fr={title} ar={ar}/><strong>{filled} réponses enregistrées / {filled} إجابات محفوظة</strong></div>
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

  useEffect(()=>{
    let active=true
    api.get('/medical-records/me').then(({data})=>{
      if (!active) return
      const payload=data.data; const record=payload.record
      const latest=payload.appointments?.find((a)=>!['cancelled','rejected'].includes(a.status))
      if (record) {
        setForm({ booking_id:record.booking_id || latest?.id || '', personal_data:{...emptyPersonal,...record.personal_data}, medical_history:{...emptyHistory,...record.medical_history,trauma:{...emptyHistory.trauma,...record.medical_history?.trauma}}, risk_factors:{...emptyRisk,...record.risk_factors}, screening:record.screening || {}, subjective_assessment:{...emptySubjective,...record.subjective_assessment,pain_scores:{...emptySubjective.pain_scores,...record.subjective_assessment?.pain_scores}}, surgeries:record.surgeries || [], medications:record.medications || [] })
        setDocuments(record.documents || []); setStatus(record.completion_status); setLastSaved(record.updated_at)
      } else {
        setForm((current)=>({ ...current, booking_id:latest?.id || '', personal_data:{...current.personal_data,first_name:payload.profile?.first_name || '',last_name:payload.profile?.last_name || '',phone:payload.profile?.phone || '',sex:payload.profile?.gender || '',date_of_birth:payload.profile?.date_of_birth || ''} }))
      }
    }).catch(()=>setMessage({error:true,text:'Impossible de charger le dossier / تعذّر تحميل الملف'})).finally(()=>active&&setLoading(false))
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
      if (!quiet) setMessage({error:false,text:submit?'Dossier soumis avec succès / تم إرسال الملف بنجاح':'Brouillon enregistré / تم حفظ المسودة'})
      return true
    } catch (error) {
      setMessage({error:true,text:error.response?.data?.message || 'Échec de l’enregistrement / تعذّر الحفظ'}); return false
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
    if (docDraft.file.size > 8*1024*1024 || !['application/pdf','image/jpeg','image/png','image/webp'].includes(docDraft.file.type)) { setMessage({error:true,text:'PDF/JPG/PNG/WEBP uniquement, 8 Mo max. / الملفات المسموحة PDF/JPG/PNG/WEBP وبحد أقصى 8 ميغابايت'}); return }
    setUploading(true); setUploadProgress(0); const payload=new FormData(); payload.append('category',docDraft.category); payload.append('description',docDraft.description); payload.append('file',docDraft.file)
    try { const response=await api.post('/medical-records/documents',payload,{headers:{'Content-Type':'multipart/form-data'},onUploadProgress:(e)=>setUploadProgress(e.total?Math.round(e.loaded/e.total*100):0)}); setDocuments((items)=>[response.data.data,...items]); setDocDraft({category:'',description:'',file:null}); setMessage({error:false,text:'Document téléversé / تم رفع المستند'}) }
    catch(error){setMessage({error:true,text:error.response?.data?.message || 'Échec du téléversement / تعذّر رفع الملف'})} finally{setUploading(false)}
  }
  async function openDocument(id){ try{const r=await api.get(`/medical-records/documents/${id}/url`); window.open(r.data.data.url,'_blank','noopener,noreferrer')}catch{setMessage({error:true,text:'Accès au document impossible / تعذّر الوصول إلى المستند'})} }
  async function removeDocument(id){ if(!window.confirm('Supprimer ce document ? / هل تريد حذف هذا المستند؟'))return; try{await api.delete(`/medical-records/documents/${id}`);setDocuments((items)=>items.filter((d)=>d.id!==id))}catch{setMessage({error:true,text:'Suppression impossible / تعذّر الحذف'})} }

  function validateSubmit(){
    if(!personal.first_name.trim()||!personal.last_name.trim()||!personal.date_of_birth||!personal.sex){setStep(0);setMessage({error:true,text:'Complétez les champs personnels obligatoires / يرجى إكمال الحقول الشخصية المطلوبة'});return false}
    if(new Date(`${personal.date_of_birth}T00:00:00`)>new Date()||!bmiFrom(personal.height_cm,personal.weight_kg)){setStep(0);setMessage({error:true,text:'Vérifiez la date de naissance, la taille et le poids / يرجى التحقق من تاريخ الميلاد والطول والوزن'});return false}
    return true
  }
  async function submitFinal(){if(!validateSubmit()||!window.confirm('Confirmer l’envoi du dossier médical ? Vous pourrez encore le mettre à jour.\n\nهل تؤكد إرسال الملف الطبي؟ سيبقى بإمكانك تحديثه.'))return;await save(true)}

  if(loading)return <DashboardLayout role="Patient / مريض" title="Dossier médical / الملف الطبي" subtitle="Chargement sécurisé… / جارٍ التحميل الآمن…"><div className="panel medical-loading" role="status">Chargement… / جارٍ التحميل…</div></DashboardLayout>

  return <DashboardLayout role="Patient / مريض" title="Dossier médical / الملف الطبي" subtitle="Formulaire médical et bilan de physiothérapie / الاستمارة الطبية وتقييم العلاج الفيزيائي">
    <div className="medical-shell">
      <header className="panel medical-header">
        <button className="text-button" type="button" onClick={()=>navigate('/patient/dashboard')}>← Tableau de bord / لوحة التحكم</button>
        <div className="medical-progress-copy"><strong>{progress}% complété / مكتمل</strong><span>{status==='submitted'?'Soumis / تم الإرسال':'Brouillon / مسودة'}{lastSaved?` · Dernière sauvegarde / آخر حفظ: ${new Date(lastSaved).toLocaleString()}`:''}</span></div>
        <div className="medical-progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${progress}%`}}/></div>
      </header>
      {message&&<div className={`medical-notice ${message.error?'medical-notice--error':''}`} role={message.error?'alert':'status'}>{message.text}</div>}
      <nav className="medical-steps" aria-label="Étapes / الخطوات">{steps.map(([fr,ar],index)=><button type="button" key={fr} className={step===index?'active':''} aria-current={step===index?'step':undefined} onClick={()=>setStep(index)}><span>{index+1}</span><b dir="ltr">{fr}</b><small dir="rtl" lang="ar">{ar}</small></button>)}</nav>
      <main className="panel medical-form-card">
        {step===0&&<section><SectionTitle fr="Informations personnelles" ar="المعلومات الشخصية" note="Les champs marqués d’un astérisque sont obligatoires. / الحقول المعلّمة بنجمة مطلوبة."/><div className="medical-grid">
          <TextInput label="Nom" ar="اسم العائلة" required value={personal.last_name} onChange={(v)=>updatePersonal('last_name',v)}/><TextInput label="Prénom" ar="الاسم الأول" required value={personal.first_name} onChange={(v)=>updatePersonal('first_name',v)}/>
          <TextInput label="Date de naissance" ar="تاريخ الولادة" required type="date" max={new Date().toISOString().slice(0,10)} value={personal.date_of_birth} onChange={(v)=>updatePersonal('date_of_birth',v)}/><TextInput label="Âge — calcul automatique" ar="العمر — يُحسب تلقائياً" value={personal.age} disabled onChange={()=>{}}/>
          <RadioGroup label="Sexe" ar="الجنس" required value={personal.sex} onChange={(v)=>updatePersonal('sex',v)} options={[["female","Femme","أنثى"],["male","Homme","ذكر"],["other","Autre / préfère ne pas préciser","آخر / أفضل عدم التحديد"]]}/><RadioGroup label="Situation familiale" ar="الحالة الاجتماعية" value={personal.marital_status} onChange={(v)=>updatePersonal('marital_status',v)} options={[["single","Célibataire","أعزب/عزباء"],["married","Marié(e)","متزوج/ة"],["other","Autre","أخرى"]]}/>
          <TextInput label="Taille en cm" ar="الطول بالسنتيمتر" required type="number" min="80" max="250" value={personal.height_cm} onChange={(v)=>updatePersonal('height_cm',v)}/><TextInput label="Poids en kg" ar="الوزن بالكيلوغرام" required type="number" min="20" max="350" step="0.1" value={personal.weight_kg} onChange={(v)=>updatePersonal('weight_kg',v)}/>
          <TextInput label="IMC — calcul automatique" ar="مؤشر كتلة الجسم — يُحسب تلقائياً" value={personal.bmi} disabled onChange={()=>{}}/><RadioGroup label="Main dominante" ar="اليد المسيطرة" value={personal.dominant_hand} onChange={(v)=>updatePersonal('dominant_hand',v)} options={[["right","Droite","اليمنى"],["left","Gauche","اليسرى"],["both","Ambidextre","كلتاهما"]]}/>
          <TextInput label="Profession" ar="المهنة" value={personal.profession} onChange={(v)=>updatePersonal('profession',v)}/><RadioGroup label="Niveau d’activité physique" ar="مستوى النشاط البدني" value={personal.activity_level} onChange={(v)=>updatePersonal('activity_level',v)} options={[["low","Faible","منخفض"],["moderate","Modéré","متوسط"],["high","Élevé","مرتفع"]]}/>
          <TextInput label="Sport pratiqué" ar="الرياضة التي يمارسها" value={personal.sport} onChange={(v)=>updatePersonal('sport',v)}/><TextInput label="Téléphone" ar="رقم الهاتف" required type="tel" value={personal.phone} onChange={(v)=>updatePersonal('phone',v)}/>
          <TextInput label="Adresse" ar="العنوان" value={personal.address} onChange={(v)=>updatePersonal('address',v)}/><TextInput label="Nom du médecin référent, si applicable" ar="اسم الطبيب المُحوِّل، إن وجد" value={personal.referring_doctor} onChange={(v)=>updatePersonal('referring_doctor',v)}/>
        </div></section>}
        {step===1&&<section><SectionTitle fr="Antécédents médicaux" ar="التاريخ الطبي"/><div className="medical-grid">
          <CheckGroup label="Antécédents médicaux" ar="الأمراض السابقة" values={history.medical_conditions} onChange={(v)=>updateHistory('medical_conditions',v)} options={medicalConditions}/>{history.medical_conditions.includes('other')&&<Field label="Autres — précisions" ar="أخرى — يرجى التوضيح"><textarea value={history.medical_other} onChange={(e)=>updateHistory('medical_other',e.target.value)}/></Field>}
          <YesNo label="Intervention chirurgicale antérieure ?" ar="هل أُجريت عملية جراحية سابقة؟" value={history.previous_surgery} onChange={(v)=>updateHistory('previous_surgery',v)}/>
          {history.previous_surgery&&<div className="medical-repeat medical-field--wide"><div className="medical-repeat__header"><BilingualLabel fr="Interventions chirurgicales" ar="العمليات الجراحية"/><button type="button" className="text-button" onClick={()=>{setForm({...form,surgeries:[...form.surgeries,{surgery_date:'',operated_region:'',details:''}]});setDirty(true);setInteracted(true)}}>+ Ajouter / إضافة</button></div>{form.surgeries.map((row,index)=><div className="medical-repeat__row" key={index}><TextInput label="Date" ar="التاريخ" type="date" max={new Date().toISOString().slice(0,10)} value={row.surgery_date} onChange={(v)=>{const next=[...form.surgeries];next[index]={...row,surgery_date:v};setForm({...form,surgeries:next});setDirty(true);setInteracted(true)}}/><TextInput label="Région opérée" ar="المنطقة التي أُجريت عليها العملية" value={row.operated_region} onChange={(v)=>{const next=[...form.surgeries];next[index]={...row,operated_region:v};setForm({...form,surgeries:next});setDirty(true);setInteracted(true)}}/><Field label="Informations complémentaires" ar="معلومات إضافية"><textarea value={row.details} onChange={(e)=>{const next=[...form.surgeries];next[index]={...row,details:e.target.value};setForm({...form,surgeries:next});setDirty(true);setInteracted(true)}}/></Field><button className="text-button medical-remove" type="button" onClick={()=>{setForm({...form,surgeries:form.surgeries.filter((_,i)=>i!==index)});setDirty(true);setInteracted(true)}}>Retirer / إزالة</button></div>)}</div>}
          <fieldset className="medical-field medical-fieldset medical-field--wide"><legend><BilingualLabel fr="Antécédents traumatiques" ar="الإصابات السابقة"/></legend>{[['fractures','Fractures','كسور'],['dislocations','Luxations','خلع'],['sprains','Entorses','التواءات']].map(([key,fr,ar])=><div className="medical-conditional" key={key}><label className="medical-choice"><input type="checkbox" checked={history.trauma[key]} onChange={(e)=>updateHistory('trauma',{...history.trauma,[key]:e.target.checked})}/><span><span>{fr}</span><span dir="rtl">{ar}</span></span></label>{history.trauma[key]&&<textarea aria-label={`${fr} / ${ar}`} placeholder="Précisions / التفاصيل" value={history.trauma[`${key}_details`]} onChange={(e)=>updateHistory('trauma',{...history.trauma,[`${key}_details`]:e.target.value})}/>}</div>)}</fieldset>
          <CheckGroup label="Antécédents familiaux" ar="التاريخ العائلي" values={history.family_conditions} onChange={(v)=>updateHistory('family_conditions',v)} options={familyConditions}/>{history.family_conditions.includes('other')&&<Field label="Autres antécédents familiaux" ar="تاريخ عائلي آخر"><textarea value={history.family_other} onChange={(e)=>updateHistory('family_other',e.target.value)}/></Field>}
          <div className="medical-repeat medical-field--wide"><div className="medical-repeat__header"><BilingualLabel fr="Médicaments actuels" ar="الأدوية الحالية"/><button type="button" className="text-button" onClick={()=>{setForm({...form,medications:[...form.medications,{medication_name:'',indication:'',dosage:'',frequency:''}]});setDirty(true);setInteracted(true)}}>+ Ajouter un médicament / إضافة دواء</button></div>{form.medications.map((row,index)=><div className="medical-repeat__row medical-repeat__row--medication" key={index}>{[['medication_name','Nom du médicament','اسم الدواء'],['indication','Indication','سبب الاستخدام'],['dosage','Dosage','الجرعة'],['frequency','Fréquence','تكرار الاستخدام']].map(([key,fr,ar])=><TextInput key={key} label={fr} ar={ar} value={row[key]} onChange={(v)=>{const next=[...form.medications];next[index]={...row,[key]:v};setForm({...form,medications:next});setDirty(true);setInteracted(true)}}/>)}<button className="text-button medical-remove" type="button" onClick={()=>{setForm({...form,medications:form.medications.filter((_,i)=>i!==index)});setDirty(true);setInteracted(true)}}>Retirer / إزالة</button></div>)}</div>
          <YesNo label="Allergies ?" ar="هل توجد حساسية؟" value={history.allergies} onChange={(v)=>updateHistory('allergies',v)}/>{history.allergies&&<Field label="Type d’allergie" ar="نوع الحساسية"><textarea value={history.allergy_details} required onChange={(e)=>updateHistory('allergy_details',e.target.value)}/></Field>}
        </div></section>}
        {step===2&&<section><SectionTitle fr="Facteurs de risque" ar="عوامل الخطورة"/><div className="medical-grid">
          <YesNo label="Tabac" ar="التدخين" value={risk.smoking} onChange={(v)=>updateRisk('smoking',v)}/>{risk.smoking&&<TextInput label="Cigarettes par jour" ar="عدد السجائر يومياً" type="number" min="0" max="100" value={risk.cigarettes_per_day} onChange={(v)=>updateRisk('cigarettes_per_day',v)}/>}<YesNo label="Café" ar="القهوة" value={risk.coffee} onChange={(v)=>updateRisk('coffee',v)}/>{risk.coffee&&<TextInput label="Tasses par jour" ar="عدد الأكواب يومياً" type="number" min="0" max="30" value={risk.coffee_cups_per_day} onChange={(v)=>updateRisk('coffee_cups_per_day',v)}/>}<TextInput label="Sommeil — heures par nuit" ar="النوم — عدد الساعات ليلاً" type="number" min="0" max="24" step="0.5" value={risk.sleep_hours} onChange={(v)=>updateRisk('sleep_hours',v)}/><YesNo label="Activité physique" ar="النشاط البدني" value={risk.physical_activity} onChange={(v)=>updateRisk('physical_activity',v)}/>{risk.physical_activity&&<TextInput label="Heures par semaine" ar="ساعات أسبوعياً" type="number" min="0" max="100" step="0.5" value={risk.activity_hours_per_week} onChange={(v)=>updateRisk('activity_hours_per_week',v)}/>}<YesNo label="Travail actuellement" ar="هل تعمل حالياً؟" value={risk.work} onChange={(v)=>updateRisk('work',v)}/>{risk.work&&<TextInput label="Travail — heures par jour" ar="العمل — ساعات يومياً" type="number" min="0" max="24" step="0.5" value={risk.work_hours_per_day} onChange={(v)=>updateRisk('work_hours_per_day',v)}/>}</div></section>}
        {step===3&&<section><SectionTitle fr="Documents médicaux" ar="المستندات الطبية" note="Fichiers privés PDF, JPG, PNG ou WEBP — 8 Mo maximum. / ملفات خاصة بحد أقصى 8 ميغابايت."/><form className="medical-upload" onSubmit={uploadDocument}><Field label="Catégorie" ar="فئة المستند"><select value={docDraft.category} required onChange={(e)=>setDocDraft({...docDraft,category:e.target.value})}><option value="">Sélectionner / اختر</option>{documentCategories.map(([key,fr,ar])=><option value={key} key={key}>{fr} / {ar}</option>)}</select></Field><Field label="Description facultative" ar="وصف اختياري"><input value={docDraft.description} onChange={(e)=>setDocDraft({...docDraft,description:e.target.value})}/></Field><Field label="Fichier" ar="الملف"><input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(e)=>setDocDraft({...docDraft,file:e.target.files?.[0] || null})}/></Field><button className="button" disabled={uploading}>{uploading?`Téléversement ${uploadProgress}% / جارٍ الرفع`:'Téléverser / رفع المستند'}</button></form><div className="medical-documents">{documents.map((doc)=><article key={doc.id}><div><strong>{doc.original_filename}</strong><span>{documentCategories.find(([key])=>key===doc.category)?.slice(1).join(' / ')} · {(doc.file_size/1024/1024).toFixed(2)} Mo</span></div><div><button className="text-button" type="button" onClick={()=>openDocument(doc.id)}>Afficher / عرض</button><button className="text-button medical-remove" type="button" onClick={()=>removeDocument(doc.id)}>Supprimer / حذف</button></div></article>)}{!documents.length&&<p className="medical-empty">Aucun document / لا توجد مستندات</p>}</div></section>}
        {step===4&&<section><SectionTitle fr="Dépistage : signes d’alerte" ar="الفحص الأولي: العلامات التحذيرية" note="Ce questionnaire ne remplace pas une évaluation médicale professionnelle. / هذه الاستمارة لا تحل محل التقييم الطبي المهني."/><div className="red-flag-grid">{redFlags.map(([key,fr,ar])=><div className={form.screening[key]?'red-flag red-flag--positive':'red-flag'} key={key}><YesNo label={fr} ar={ar} value={form.screening[key]} onChange={(v)=>updateSection('screening',key,v)}/></div>)}</div>{positiveFlags.length>0&&<div className="medical-emergency" role="alert"><strong>Signes d’alerte signalés / تم الإبلاغ عن علامات تحذيرية</strong><p>Contactez rapidement un professionnel de santé qualifié. En cas d’urgence ou de symptômes graves, contactez immédiatement les services d’urgence locaux. Aucun diagnostic automatique n’est établi.</p><p dir="rtl" lang="ar">تواصل سريعاً مع اختصاصي رعاية صحية مؤهل. في حالات الطوارئ أو الأعراض الشديدة، اتصل فوراً بخدمات الطوارئ المحلية. لا يتم تقديم أي تشخيص آلي.</p></div>}</section>}
        {step===5&&<section><SectionTitle fr="Bilan subjectif : douleur" ar="التقييم الذاتي: الألم"/><div className="medical-grid">
          <TextInput label="Date d’apparition" ar="تاريخ بداية الأعراض" type="date" max={new Date().toISOString().slice(0,10)} value={subjective.onset_date} onChange={(v)=>updateSubjective('onset_date',v)}/><RadioGroup label="Début" ar="البداية" value={subjective.onset_type} onChange={(v)=>updateSubjective('onset_type',v)} options={[["sudden","Brutal","مفاجئة"],["gradual","Progressif","تدريجية"]]}/><CheckGroup label="Causes possibles" ar="الأسباب المحتملة" values={subjective.causes} onChange={(v)=>updateSubjective('causes',v)} options={[["trauma","Traumatique","إصابة"],["accident","Accident","حادث"],["work","Travail","العمل"],["sport","Sport","الرياضة"]]}/><Field label="Description complémentaire" ar="وصف إضافي"><textarea value={subjective.complaint_details} onChange={(e)=>updateSubjective('complaint_details',e.target.value)}/></Field>
          <RadioGroup label="Côté douloureux" ar="جهة الألم" value={subjective.pain_side} onChange={(v)=>updateSubjective('pain_side',v)} options={[["left","Gauche","يسار"],["right","Droite","يمين"],["bilateral","Bilatéral","الجهتان"]]}/><CheckGroup label="Body Chart — régions douloureuses (face et dos)" ar="مخطط الجسم — مناطق الألم (الأمام والخلف)" values={subjective.pain_locations} onChange={(v)=>updateSubjective('pain_locations',v)} options={bodyRegions}/>
          <div className="pain-panel medical-field--wide"><div className="pain-scale-note">0 = aucune douleur / لا يوجد ألم <span>10 = douleur maximale / أقصى ألم</span></div>{[['current','EVA actuelle','شدة الألم الحالية'],['today','Douleur aujourd’hui','ألم اليوم'],['worst','Douleur au pire','أسوأ ألم'],['rest','Douleur au repos','ألم أثناء الراحة'],['activity','Douleur à l’effort','ألم أثناء النشاط']].map(([key,fr,ar])=><PainScore key={key} label={fr} ar={ar} value={subjective.pain_scores[key]} onChange={(v)=>updateSubjective('pain_scores',{...subjective.pain_scores,[key]:v})}/>)}</div>
          <CheckGroup label="Type de douleur" ar="نوع الألم" values={subjective.pain_types} onChange={(v)=>updateSubjective('pain_types',v)} options={painTypes}/><RadioGroup label="Irritabilité" ar="طبيعة الألم" value={subjective.irritability} onChange={(v)=>updateSubjective('irritability',v)} options={[["constant","Constante","مستمر"],["intermittent","Intermittente","متقطع"]]}/><RadioGroup label="Évolution" ar="تطور الحالة" value={subjective.evolution} onChange={(v)=>updateSubjective('evolution',v)} options={[["worse","Aggravation","يزداد سوءاً"],["stable","Stable","ثابت"],["better","Amélioration","يتحسن"]]}/>
          <CheckGroup label="Facteurs aggravants" ar="العوامل التي تزيد الألم" values={subjective.aggravating} onChange={(v)=>updateSubjective('aggravating',v)} options={aggravating}/>{subjective.aggravating.includes('other')&&<Field label="Autres facteurs aggravants" ar="عوامل أخرى تزيد الألم"><textarea value={subjective.aggravating_other} onChange={(e)=>updateSubjective('aggravating_other',e.target.value)}/></Field>}<CheckGroup label="Facteurs soulageants" ar="العوامل التي تخفف الألم" values={subjective.relieving} onChange={(v)=>updateSubjective('relieving',v)} options={relieving}/>{subjective.relieving.includes('other')&&<Field label="Autres facteurs soulageants" ar="عوامل أخرى تخفف الألم"><textarea value={subjective.relieving_other} onChange={(e)=>updateSubjective('relieving_other',e.target.value)}/></Field>}
          <CheckGroup label="Horaire de la douleur" ar="توقيت الألم" values={subjective.schedule} onChange={(v)=>updateSubjective('schedule',v)} options={[["morning","Matin","صباحاً"],["midday","Midi","ظهراً"],["evening","Soir","مساءً"],["night","Nuit","ليلاً"]]}/><YesNo label="Raideur matinale" ar="التيبس الصباحي" value={subjective.morning_stiffness} onChange={(v)=>updateSubjective('morning_stiffness',v)}/>{subjective.morning_stiffness&&<TextInput label="Durée" ar="المدة" value={subjective.stiffness_duration} onChange={(v)=>updateSubjective('stiffness_duration',v)}/>}<YesNo label="Irradiation" ar="انتشار الألم" value={subjective.radiation} onChange={(v)=>updateSubjective('radiation',v)}/>{subjective.radiation&&<Field label="Vers quelle région ?" ar="إلى أين ينتشر الألم؟"><textarea required value={subjective.radiation_location} onChange={(e)=>updateSubjective('radiation_location',e.target.value)}/></Field>}
          <CheckGroup label="Symptômes associés" ar="الأعراض المرافقة" values={subjective.symptoms} onChange={(v)=>updateSubjective('symptoms',v)} options={symptoms}/>{subjective.symptoms.includes('other')&&<Field label="Autres symptômes" ar="أعراض أخرى"><textarea value={subjective.symptoms_other} onChange={(e)=>updateSubjective('symptoms_other',e.target.value)}/></Field>}<CheckGroup label="Objectifs du patient" ar="أهداف المريض" values={subjective.goals} onChange={(v)=>updateSubjective('goals',v)} options={goals}/><Field label="Objectif personnel facultatif" ar="هدف شخصي اختياري"><textarea value={subjective.personal_goal} onChange={(e)=>updateSubjective('personal_goal',e.target.value)}/></Field><Field label="Notes supplémentaires" ar="ملاحظات إضافية"><textarea value={subjective.notes} onChange={(e)=>updateSubjective('notes',e.target.value)}/></Field>
        </div></section>}
        {step===6&&<section><SectionTitle fr="Révision et confirmation" ar="المراجعة والتأكيد" note="Relisez les sections avant l’envoi. Vous pourrez mettre à jour votre dossier ultérieurement. / راجع الأقسام قبل الإرسال. يمكنك تحديث ملفك لاحقاً."/><div className="review-grid"><ReviewBlock title={steps[0][0]} ar={steps[0][1]} data={personal}/><ReviewBlock title={steps[1][0]} ar={steps[1][1]} data={history}/><ReviewBlock title={steps[2][0]} ar={steps[2][1]} data={risk}/><ReviewBlock title={steps[3][0]} ar={steps[3][1]} data={{documents}}/><ReviewBlock title={steps[4][0]} ar={steps[4][1]} data={form.screening}/><ReviewBlock title={steps[5][0]} ar={steps[5][1]} data={subjective}/></div>{positiveFlags.length>0&&<div className="medical-emergency"><strong>{positiveFlags.length} signe(s) d’alerte positif(s) / {positiveFlags.length} علامة/علامات تحذيرية إيجابية</strong></div>}<label className="medical-confirm"><input type="checkbox" required/><span><span dir="ltr">Je confirme que ces informations sont exactes au mieux de ma connaissance.</span><span dir="rtl" lang="ar">أؤكد أن هذه المعلومات صحيحة حسب معرفتي.</span></span></label><button className="button medical-submit" type="button" disabled={saving} onClick={submitFinal}>{saving?'Envoi… / جارٍ الإرسال…':'Soumettre le dossier / إرسال الملف'}</button></section>}
        <footer className="medical-actions"><button type="button" className="text-button" disabled={step===0} onClick={()=>setStep((v)=>v-1)}>Précédent / السابق</button><button type="button" className="button button--secondary" disabled={saving} onClick={()=>save(false)}>{saving?'Enregistrement… / جارٍ الحفظ…':'Enregistrer le brouillon / حفظ المسودة'}</button>{step<6&&<button type="button" className="button" onClick={()=>setStep((v)=>v+1)}>Suivant / التالي</button>}</footer>
      </main>
    </div>
  </DashboardLayout>
}
