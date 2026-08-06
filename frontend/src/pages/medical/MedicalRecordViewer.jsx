import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api.js'
import DashboardLayout from '../dashboards/DashboardLayout.jsx'
import { documentCategories, redFlags, steps } from './medicalFields.js'
import './MedicalIntake.css'

const sectionKeys = [
  ['personal_data', ...steps[0]], ['medical_history', ...steps[1]],
  ['risk_factors', ...steps[2]], ['screening', ...steps[4]],
  ['subjective_assessment', ...steps[5]],
]
const names = { first_name:'First name / الاسم الأول',last_name:'Last name / اسم العائلة',date_of_birth:'Date of birth / تاريخ الولادة',age:'Age / العمر',sex:'Sex / الجنس',marital_status:'Marital status / الحالة الاجتماعية',height_cm:'Height (cm) / الطول',weight_kg:'Weight (kg) / الوزن',bmi:'BMI / مؤشر كتلة الجسم',dominant_hand:'Dominant hand / اليد المسيطرة',profession:'Occupation / المهنة',activity_level:'Physical activity / النشاط البدني',sport:'Sport / الرياضة',phone:'Phone / الهاتف',address:'Address / العنوان',referring_doctor:'Referring physician / الطبيب المُحوِّل',medical_conditions:'Medical history / الأمراض السابقة',allergies:'Allergies / الحساسية',allergy_details:'Type of allergy / نوع الحساسية',onset_date:'Onset date / تاريخ البداية',onset_type:'Onset type / نوع البداية',pain_side:'Side / الجهة',pain_locations:'Painful regions / مناطق الألم',pain_scores:'Pain scores / درجات الألم',pain_types:'Type of pain / نوع الألم',evolution:'Progression / التطور',irritability:'Irritability / طبيعة الألم',notes:'Notes / ملاحظات' }

function display(value) {
  if (value === true) return 'Yes / نعم'
  if (value === false) return 'No / لا'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (value && typeof value === 'object') return Object.entries(value).map(([key,item])=>`${names[key] || key}: ${display(item)}`).join(' · ')
  return value === '' || value === null || value === undefined ? '—' : String(value)
}
function SectionHeading({fr,ar}) { return <div className="medical-section-title"><h2>{fr}</h2><h3 dir="rtl" lang="ar">{ar}</h3></div> }

export default function MedicalRecordViewer() {
  const { patientId } = useParams()
  const [record,setRecord]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  let profile={}; try{profile=JSON.parse(localStorage.getItem('user_profile')||'{}')}catch{profile={}}
  const back=profile.role==='admin'?'/admin/dashboard':'/physiotherapist/dashboard'
  useEffect(()=>{let active=true;api.get(`/medical-records/patient/${patientId}`).then((r)=>active&&setRecord(r.data.data)).catch((e)=>active&&setError(e.response?.status===404?'Medical record unavailable / الملف الطبي غير متاح':'Unable to access / تعذّر الوصول')).finally(()=>active&&setLoading(false));return()=>{active=false}},[patientId])
  async function openDocument(id){try{const response=await api.get(`/medical-records/documents/${id}/url`);window.open(response.data.data.url,'_blank','noopener,noreferrer')}catch{setError('Unable to access the document / تعذّر الوصول إلى المستند')}}
  return <DashboardLayout role="Authorized clinical access / وصول سريري مصرح" title="Patient medical record / الملف الطبي للمريض" subtitle="Read-only view / عرض للقراءة فقط"><div className="medical-shell"><div><Link className="text-button" to={back}>← Back / رجوع</Link></div>{loading&&<div className="panel medical-loading">Secure loading… / جارٍ التحميل الآمن…</div>}{error&&<div className="medical-notice medical-notice--error" role="alert">{error}</div>}{record&&<><header className="panel medical-header"><div className="medical-progress-copy"><strong>{record.completion_percent}% complete / مكتمل</strong><span>{record.completion_status==='submitted'?'Submitted / تم الإرسال':'Draft / مسودة'} · {new Date(record.updated_at).toLocaleString()}</span></div><div className="medical-progress" role="progressbar" aria-valuenow={record.completion_percent} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${record.completion_percent}%`}}/></div></header>{redFlags.some(([key])=>record.screening?.[key])&&<div className="medical-emergency"><strong>Positive warning signs — clinical evaluation required / علامات تحذيرية إيجابية — يلزم تقييم سريري</strong></div>}{sectionKeys.map(([key,fr,ar])=><section className="panel medical-form-card" key={key}><SectionHeading fr={fr} ar={ar}/><dl className="medical-record-list">{Object.entries(record[key]||{}).map(([field,value])=><div key={field}><dt>{names[field]||field.replaceAll('_',' ')}</dt><dd>{display(value)}</dd></div>)}</dl></section>)}<section className="panel medical-form-card"><SectionHeading fr="Surgeries and medications" ar="العمليات والأدوية"/><div className="review-grid"><div className="review-card"><strong>Surgeries / العمليات</strong>{record.surgeries?.map((row)=><p key={row.id}>{row.surgery_date || '—'} · {row.operated_region} {row.details&&`— ${row.details}`}</p>)}{!record.surgeries?.length&&<p>—</p>}</div><div className="review-card"><strong>Medications / الأدوية</strong>{record.medications?.map((row)=><p key={row.id}>{row.medication_name} · {[row.dosage,row.frequency,row.indication].filter(Boolean).join(' · ')}</p>)}{!record.medications?.length&&<p>—</p>}</div></div></section><section className="panel medical-form-card"><SectionHeading fr="Medical documents" ar="المستندات الطبية"/><div className="medical-documents">{record.documents?.map((doc)=><article key={doc.id}><div><strong>{doc.original_filename}</strong><span>{documentCategories.find(([key])=>key===doc.category)?.slice(1).join(' / ')}</span></div><button className="text-button" type="button" onClick={()=>openDocument(doc.id)}>View / عرض</button></article>)}{!record.documents?.length&&<p className="medical-empty">No documents / لا توجد مستندات</p>}</div></section></>}</div></DashboardLayout>
}
