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
const names = { first_name:'Prénom / الاسم الأول',last_name:'Nom / اسم العائلة',date_of_birth:'Date de naissance / تاريخ الولادة',age:'Âge / العمر',sex:'Sexe / الجنس',marital_status:'Situation familiale / الحالة الاجتماعية',height_cm:'Taille (cm) / الطول',weight_kg:'Poids (kg) / الوزن',bmi:'IMC / مؤشر كتلة الجسم',dominant_hand:'Main dominante / اليد المسيطرة',profession:'Profession / المهنة',activity_level:'Activité physique / النشاط البدني',sport:'Sport / الرياضة',phone:'Téléphone / الهاتف',address:'Adresse / العنوان',referring_doctor:'Médecin référent / الطبيب المُحوِّل',medical_conditions:'Antécédents médicaux / الأمراض السابقة',allergies:'Allergies / الحساسية',allergy_details:'Type d’allergie / نوع الحساسية',onset_date:'Date d’apparition / تاريخ البداية',onset_type:'Type de début / نوع البداية',pain_side:'Côté / الجهة',pain_locations:'Régions douloureuses / مناطق الألم',pain_scores:'Scores de douleur / درجات الألم',pain_types:'Type de douleur / نوع الألم',evolution:'Évolution / التطور',irritability:'Irritabilité / طبيعة الألم',notes:'Notes / ملاحظات' }

function display(value) {
  if (value === true) return 'Oui / نعم'
  if (value === false) return 'Non / لا'
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
  useEffect(()=>{let active=true;api.get(`/medical-records/patient/${patientId}`).then((r)=>active&&setRecord(r.data.data)).catch((e)=>active&&setError(e.response?.status===404?'Dossier médical non disponible / الملف الطبي غير متاح':'Accès impossible / تعذّر الوصول')).finally(()=>active&&setLoading(false));return()=>{active=false}},[patientId])
  async function openDocument(id){try{const response=await api.get(`/medical-records/documents/${id}/url`);window.open(response.data.data.url,'_blank','noopener,noreferrer')}catch{setError('Accès au document impossible / تعذّر الوصول إلى المستند')}}
  return <DashboardLayout role="Accès clinique autorisé / وصول سريري مصرح" title="Dossier médical du patient / الملف الطبي للمريض" subtitle="Consultation en lecture seule / عرض للقراءة فقط"><div className="medical-shell"><div><Link className="text-button" to={back}>← Retour / رجوع</Link></div>{loading&&<div className="panel medical-loading">Chargement sécurisé… / جارٍ التحميل الآمن…</div>}{error&&<div className="medical-notice medical-notice--error" role="alert">{error}</div>}{record&&<><header className="panel medical-header"><div className="medical-progress-copy"><strong>{record.completion_percent}% complété / مكتمل</strong><span>{record.completion_status==='submitted'?'Soumis / تم الإرسال':'Brouillon / مسودة'} · {new Date(record.updated_at).toLocaleString()}</span></div><div className="medical-progress" role="progressbar" aria-valuenow={record.completion_percent} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${record.completion_percent}%`}}/></div></header>{redFlags.some(([key])=>record.screening?.[key])&&<div className="medical-emergency"><strong>Signes d’alerte positifs — évaluation clinique requise / علامات تحذيرية إيجابية — يلزم تقييم سريري</strong></div>}{sectionKeys.map(([key,fr,ar])=><section className="panel medical-form-card" key={key}><SectionHeading fr={fr} ar={ar}/><dl className="medical-record-list">{Object.entries(record[key]||{}).map(([field,value])=><div key={field}><dt>{names[field]||field.replaceAll('_',' ')}</dt><dd>{display(value)}</dd></div>)}</dl></section>)}<section className="panel medical-form-card"><SectionHeading fr="Interventions et médicaments" ar="العمليات والأدوية"/><div className="review-grid"><div className="review-card"><strong>Interventions / العمليات</strong>{record.surgeries?.map((row)=><p key={row.id}>{row.surgery_date || '—'} · {row.operated_region} {row.details&&`— ${row.details}`}</p>)}{!record.surgeries?.length&&<p>—</p>}</div><div className="review-card"><strong>Médicaments / الأدوية</strong>{record.medications?.map((row)=><p key={row.id}>{row.medication_name} · {[row.dosage,row.frequency,row.indication].filter(Boolean).join(' · ')}</p>)}{!record.medications?.length&&<p>—</p>}</div></div></section><section className="panel medical-form-card"><SectionHeading fr="Documents médicaux" ar="المستندات الطبية"/><div className="medical-documents">{record.documents?.map((doc)=><article key={doc.id}><div><strong>{doc.original_filename}</strong><span>{documentCategories.find(([key])=>key===doc.category)?.slice(1).join(' / ')}</span></div><button className="text-button" type="button" onClick={()=>openDocument(doc.id)}>Afficher / عرض</button></article>)}{!record.documents?.length&&<p className="medical-empty">Aucun document / لا توجد مستندات</p>}</div></section></>}</div></DashboardLayout>
}
