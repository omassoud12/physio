import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../../services/api.js'
import DashboardLayout from '../../../pages/dashboards/DashboardLayout.jsx'
import { formatUtcDate } from '../../../i18n/formatters.js'
import { DualLabel, MultiCheck, SectionIntro } from '../components/AssessmentControls.jsx'
import { neckSteps, pathways } from './neckConfig.js'
import { hasNeurologicalConcern, hasVascularConcern, mergeNeckAssessmentData } from './neckData.js'
import { ArticularSection, InspectionSection, PalpationSection } from './sections/PhysicalSections.jsx'
import { MuscularSection } from './sections/MuscularSection.jsx'
import { NeurologicalSection, RadicularSection, UmnSection, VascularSection } from './sections/NeuroSections.jsx'
import { ClinicalReasoningSection, FunctionalSection, MotorControlSection, OutcomeSection, SpecialTestsSection } from './sections/FinalSections.jsx'
import '../clinicalAssessments.css'

const sectionComponents={inspection:InspectionSection,palpation:PalpationSection,articular:ArticularSection,muscular:MuscularSection,neurological:NeurologicalSection,radicular:RadicularSection,umnScreen:UmnSection,vascularScreen:VascularSection,functional:FunctionalSection,motorControl:MotorControlSection,specialTests:SpecialTestsSection,outcomeMeasure:OutcomeSection,clinicalReasoning:ClinicalReasoningSection}
const baseSteps=new Set(['inspection','palpation','articular','muscular','functional','specialTests','outcomeMeasure','clinicalReasoning'])

function patientName(patient){return[patient?.first_name,patient?.last_name].filter(Boolean).join(' ')}
function visibleNeckSteps(data){
  if(!data)return neckSteps
  const selected=new Set(data.specialTests.pathways||[])
  if(data.specialTests.showFull)return neckSteps
  return neckSteps.filter((step)=>baseSteps.has(step.key)
    || (step.key==='neurological'&&['red_flags','radicular','vascular'].some((key)=>selected.has(key)))
    || (step.key==='radicular'&&selected.has('radicular'))
    || (step.key==='umnScreen'&&selected.has('red_flags'))
    || (step.key==='vascularScreen'&&['red_flags','vascular'].some((key)=>selected.has(key)))
    || (step.key==='motorControl'&&selected.has('motor_control')))
}

export default function NeckAssessment(){
  const{patientId,assessmentId}=useParams()
  const{t,i18n}=useTranslation('clinical')
  const navigate=useNavigate()
  const topRef=useRef(null)
  const editVersion=useRef(0)
  const savingRef=useRef(false)
  const[context,setContext]=useState(null)
  const[data,setData]=useState(null)
  const[side,setSide]=useState('')
  const[appointmentId,setAppointmentId]=useState('')
  const[activeKey,setActiveKey]=useState('inspection')
  const[loading,setLoading]=useState(true)
  const[dirty,setDirty]=useState(false)
  const[saveState,setSaveState]=useState('')
  const[error,setError]=useState('')
  const[notice,setNotice]=useState('')

  useEffect(()=>{
    let active=true
    setLoading(true);setError('')
    api.get(`/physiotherapist/patients/${patientId}/assessments/${assessmentId}`)
      .then((response)=>{if(!active)return;const loaded=response.data.data;if(loaded.assessment.body_region!=='cervical')throw new Error('Incorrect assessment type');setContext(loaded);setData(mergeNeckAssessmentData(loaded.assessment.assessment_data));setSide(loaded.assessment.affected_side||'');setAppointmentId(loaded.assessment.appointment_id||'')})
      .catch(()=>active&&setError(t('assessment.loadError')))
      .finally(()=>active&&setLoading(false))
    return()=>{active=false}
  },[assessmentId,patientId,t])

  const readOnly=context?.assessment?.status==='completed'
  const visibleSteps=useMemo(()=>visibleNeckSteps(data),[data])
  const activeIndex=Math.max(0,visibleSteps.findIndex((step)=>step.key===activeKey))
  const currentStep=visibleSteps[activeIndex]||visibleSteps[0]
  const Section=sectionComponents[currentStep?.key]
  const percent=Math.round(((activeIndex+1)/visibleSteps.length)*100)

  useEffect(()=>{if(data&&!visibleSteps.some((step)=>step.key===activeKey))setActiveKey('inspection')},[activeKey,data,visibleSteps])

  const save=useCallback(async(status='draft',{automatic=false}={})=>{
    if(!context||!data||readOnly||savingRef.current)return false
    const capturedVersion=editVersion.current
    savingRef.current=true;setSaveState('saving');setError('');setNotice('')
    try{
      const response=await api.patch(`/physiotherapist/patients/${patientId}/assessments/${assessmentId}`,{status,affected_side:side||null,appointment_id:appointmentId||null,assessment_data:data})
      setContext((current)=>({...current,assessment:response.data.data}))
      if(capturedVersion===editVersion.current)setDirty(false)
      setSaveState('saved')
      if(status==='completed')setNotice(t('assessment.completed'))
      return true
    }catch{
      setSaveState('');setError(t(status==='completed'?'assessment.completeError':'assessment.saveError'));return false
    }finally{
      savingRef.current=false
      if(automatic)setTimeout(()=>setSaveState((current)=>current==='saved'?'':current),1800)
    }
  },[appointmentId,assessmentId,context,data,patientId,readOnly,side,t])

  useEffect(()=>{if(!dirty||readOnly||!data)return undefined;const timer=setTimeout(()=>void save('draft',{automatic:true}),1400);return()=>clearTimeout(timer)},[appointmentId,data,dirty,readOnly,save,side])

  function changed(callback){callback();editVersion.current+=1;setDirty(true);setSaveState('');setNotice('')}
  function updateSection(next){changed(()=>setData((current)=>({...current,[currentStep.key]:next})))}
  function updatePathways(next){changed(()=>setData((current)=>({...current,specialTests:{...current.specialTests,pathways:next}})))}
  function toggleFull(){changed(()=>setData((current)=>({...current,specialTests:{...current.specialTests,showFull:!current.specialTests.showFull}})))}
  function changeSide(next){changed(()=>setSide(next))}
  function changeAppointment(next){changed(()=>setAppointmentId(next))}
  function go(index){setActiveKey(visibleSteps[index].key);requestAnimationFrame(()=>topRef.current?.scrollIntoView({behavior:'smooth',block:'start'}))}

  const formattedAppointments=useMemo(()=>(context?.appointments||[]).map((appointment)=>({...appointment,label:`${formatUtcDate(appointment.starts_at,i18n.resolvedLanguage,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})} · ${appointment.treatment_type}`})),[context?.appointments,i18n.resolvedLanguage])
  const neurologicalConcern=hasNeurologicalConcern(data)
  const vascularConcern=hasVascularConcern(data)

  return <DashboardLayout role={t('assessment.role')} title={t('neck.title')} subtitle={t('neck.subtitle')}>
    <main className="clinical-assessment-shell neck-assessment" ref={topRef}>
      <Link className="text-button" to={`/physiotherapist/patients/${patientId}`}>← {t('assessment.back')}</Link>
      {loading&&<div className="panel clinical-profile-loading" role="status"><span/><span/><span/></div>}
      {!loading&&error&&!context&&<section className="panel clinical-error" role="alert"><p>{error}</p><button className="button" type="button" onClick={()=>navigate(0)}>{t('profile.retry')}</button></section>}
      {context&&data&&<>
        <header className="panel assessment-workspace-header"><div><p className="eyebrow">{context.assessment.parent_assessment_id?'Neck Reassessment / إعادة تقييم الرقبة':'Neck / Cervical Spine Assessment / تقييم الرقبة والعمود الفقري العنقي'}</p><h2>{patientName(context.patient)}</h2><p>{t('assessment.step',{current:activeIndex+1,total:visibleSteps.length})} · {currentStep.label}</p></div><span className={`assessment-save-state assessment-save-state--${readOnly?'locked':saveState||'idle'}`}>{readOnly?t('assessment.readOnly'):saveState==='saving'?t('assessment.saving'):saveState==='saved'?t('assessment.saved'):dirty?t('assessment.unsaved'):t('assessment.saved')}</span></header>

        {(neurologicalConcern||vascularConcern)&&<section className="clinical-global-alerts">{neurologicalConcern&&<div className="clinical-safety-alert" role="alert"><strong>Neurological warning — medical referral pathway should be considered.</strong><span dir="rtl" lang="ar">تحذير عصبي — يجب النظر في مسار الإحالة الطبية.</span><p>No automatic diagnosis has been generated.</p></div>}{vascularConcern&&<div className="clinical-safety-alert clinical-safety-alert--vascular" role="alert"><strong>Potential vascular / neurological concern — clinical review or referral may be required.</strong><span dir="rtl" lang="ar">اشتباه وعائي / عصبي — قد تلزم المراجعة السريرية أو الإحالة.</span></div>}</section>}

        <fieldset className="clinical-assessment-fieldset" disabled={readOnly}>
          <section className="panel neck-pathway-panel"><div><DualLabel as="h2" label="Clinical Decision Pathway" labelAr="مسار القرار السريري"/><p>Select the presentation patterns that are clinically relevant. The questionnaire will reveal targeted screens while preserving manual access.</p></div><MultiCheck label="Presentation / Findings" labelAr="العرض / النتائج" options={pathways} value={data.specialTests.pathways} onChange={updatePathways}/><button className={`button ${data.specialTests.showFull?'':'button--quiet'}`} type="button" aria-pressed={data.specialTests.showFull} onClick={toggleFull}>{data.specialTests.showFull?'Use Targeted View / استخدام العرض الموجّه':'View Full Assessment / عرض التقييم الكامل'}</button></section>
        </fieldset>

        <section className="panel assessment-progress" aria-label={t('assessment.completion')}><div className="assessment-progress__mobile"><strong>{String(activeIndex+1).padStart(2,'0')} / {String(visibleSteps.length).padStart(2,'0')}</strong><DualLabel label={currentStep.label} labelAr={currentStep.labelAr}/></div><nav aria-label={t('assessment.completion')}>{visibleSteps.map((item,index)=><button type="button" key={item.key} className={index===activeIndex?'is-current':index<activeIndex?'is-passed':''} aria-current={index===activeIndex?'step':undefined} onClick={()=>go(index)}><span>{String(neckSteps.findIndex((step)=>step.key===item.key)+1).padStart(2,'0')}</span><small>{item.label}</small></button>)}</nav><div className="assessment-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><span style={{width:`${percent}%`}}/></div></section>

        {context.previous_assessment&&<div className="clinical-previous-banner"><span>{t('assessment.previousAssessment')}</span><Link to={`/physiotherapist/patients/${patientId}/assessments/cervical/${context.previous_assessment.id}`}>{t('profile.view')}</Link></div>}

        <fieldset className="clinical-assessment-fieldset" disabled={readOnly}>
          <section className="panel assessment-metadata"><fieldset><legend>{t('assessment.affectedSide')}</legend><div className="assessment-side-options">{['right','left','bilateral'].map((option)=><label className={side===option?'is-selected':''} key={option}><input type="radio" checked={side===option} onChange={()=>changeSide(option)}/><span>{t(`neck.${option}`)}</span></label>)}</div></fieldset><label><span>{t('assessment.linkedSession')}</span><select value={appointmentId} onChange={(event)=>changeAppointment(event.target.value)}><option value="">{t('assessment.noSession')}</option>{formattedAppointments.map((appointment)=><option key={appointment.id} value={appointment.id}>{appointment.label}</option>)}</select></label></section>
          <section className="panel assessment-section"><SectionIntro number={neckSteps.findIndex((step)=>step.key===currentStep.key)+1} title={currentStep.label} titleAr={currentStep.labelAr}/><Section value={data[currentStep.key]} onChange={updateSection} assessmentData={data}/></section>
        </fieldset>

        {error&&<div className="clinical-save-message clinical-save-message--error" role="alert">{error}</div>}{notice&&<div className="clinical-save-message" role="status">{notice}</div>}
        <footer className="panel assessment-actions"><button className="button button--quiet" type="button" disabled={activeIndex===0} onClick={()=>go(activeIndex-1)}>← {t('assessment.previous')}</button>{!readOnly&&<button className="button button--quiet" type="button" disabled={saveState==='saving'} onClick={()=>void save('draft')}>{t('assessment.saveDraft')}</button>}{activeIndex<visibleSteps.length-1?<button className="button" type="button" onClick={()=>go(activeIndex+1)}>{t('assessment.next')} →</button>:!readOnly&&<button className="button" type="button" disabled={saveState==='saving'} onClick={()=>void save('completed')}>{t('assessment.complete')}</button>}</footer>
      </>}
    </main>
  </DashboardLayout>
}
