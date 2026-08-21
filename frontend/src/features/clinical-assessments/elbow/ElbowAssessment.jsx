import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../../services/api.js'
import DashboardLayout from '../../../pages/dashboards/DashboardLayout.jsx'
import { formatUtcDate } from '../../../i18n/formatters.js'
import { DualLabel, SectionIntro } from '../components/AssessmentControls.jsx'
import { elbowSteps } from './elbowConfig.js'
import { mergeElbowAssessmentData } from './elbowData.js'
import { InspectionSection, PalpationSection, ArticularSection } from './sections/PhysicalSections.jsx'
import { StrengthMobilitySection } from './sections/StrengthSection.jsx'
import { NeurologicalSection } from './sections/NeurologicalSection.jsx'
import { ClinicalReasoningSection, FunctionalSection, OutcomeSection, SpecialTestsSection } from './sections/FinalSections.jsx'
import '../clinicalAssessments.css'

const sectionComponents = [InspectionSection, PalpationSection, ArticularSection, StrengthMobilitySection, NeurologicalSection, SpecialTestsSection, FunctionalSection, OutcomeSection, ClinicalReasoningSection]

function patientName(patient) {
  return [patient?.first_name, patient?.last_name].filter(Boolean).join(' ')
}

export default function ElbowAssessment() {
  const { patientId, assessmentId } = useParams()
  const { t, i18n } = useTranslation('clinical')
  const navigate = useNavigate()
  const topRef = useRef(null)
  const editVersion = useRef(0)
  const savingRef = useRef(false)
  const [context, setContext] = useState(null)
  const [data, setData] = useState(null)
  const [side, setSide] = useState('')
  const [appointmentId, setAppointmentId] = useState('')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.get(`/physiotherapist/patients/${patientId}/assessments/${assessmentId}`)
      .then((response) => {
        if (!active) return
        const loaded = response.data.data
        if (loaded.assessment.body_region !== 'elbow') throw new Error('Incorrect assessment type')
        setContext(loaded)
        setData(mergeElbowAssessmentData(loaded.assessment.assessment_data))
        setSide(loaded.assessment.affected_side || '')
        setAppointmentId(loaded.assessment.appointment_id || '')
      })
      .catch(() => active && setError(t('assessment.loadError')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [assessmentId, patientId, t])

  const readOnly = context?.assessment?.status === 'completed'
  const currentStep = elbowSteps[step]
  const Section = sectionComponents[step]
  const percent = Math.round(((step + 1) / elbowSteps.length) * 100)

  const save = useCallback(async (status = 'draft', { automatic = false } = {}) => {
    if (!context || !data || readOnly || savingRef.current) return false
    const capturedVersion = editVersion.current
    savingRef.current = true
    setSaveState('saving')
    setError('')
    setNotice('')
    try {
      const response = await api.patch(`/physiotherapist/patients/${patientId}/assessments/${assessmentId}`, {
        status,
        affected_side: side || null,
        appointment_id: appointmentId || null,
        assessment_data: data,
      })
      setContext((current) => ({ ...current, assessment: response.data.data }))
      if (capturedVersion === editVersion.current) setDirty(false)
      setSaveState('saved')
      if (status === 'completed') setNotice(t('assessment.completed'))
      return true
    } catch {
      setSaveState('')
      setError(t(status === 'completed' ? 'assessment.completeError' : 'assessment.saveError'))
      return false
    } finally {
      savingRef.current = false
      if (automatic) setTimeout(() => setSaveState((current) => current === 'saved' ? '' : current), 1800)
    }
  }, [appointmentId, assessmentId, context, data, patientId, readOnly, side, t])

  useEffect(() => {
    if (!dirty || readOnly || !data) return undefined
    const timer = setTimeout(() => void save('draft', { automatic: true }), 1400)
    return () => clearTimeout(timer)
  }, [appointmentId, data, dirty, readOnly, save, side])

  function changed(callback) {
    callback()
    editVersion.current += 1
    setDirty(true)
    setSaveState('')
    setNotice('')
  }
  function updateSection(next) { changed(() => setData((current) => ({ ...current, [currentStep.key]: next }))) }
  function changeSide(next) { changed(() => setSide(next)) }
  function changeAppointment(next) { changed(() => setAppointmentId(next)) }
  function go(next) {
    setStep(next)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const formattedAppointments = useMemo(() => (context?.appointments || []).map((appointment) => ({
    ...appointment,
    label: `${formatUtcDate(appointment.starts_at, i18n.resolvedLanguage, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${appointment.treatment_type}`,
  })), [context?.appointments, i18n.resolvedLanguage])

  return <DashboardLayout role={t('assessment.role')} title={t('elbow.title')} subtitle={t('elbow.subtitle')}>
    <main className="clinical-assessment-shell" ref={topRef}>
      <Link className="text-button" to={`/physiotherapist/patients/${patientId}`}>← {t('assessment.back')}</Link>
      {loading && <div className="panel clinical-profile-loading" role="status"><span/><span/><span/></div>}
      {!loading && error && !context && <section className="panel clinical-error" role="alert"><p>{error}</p><button className="button" type="button" onClick={() => navigate(0)}>{t('profile.retry')}</button></section>}
      {context && data && <>
        <header className="panel assessment-workspace-header">
          <div><p className="eyebrow">{context.assessment.parent_assessment_id ? 'Elbow Reassessment / إعادة تقييم المرفق' : 'Elbow Assessment / تقييم المرفق'}</p><h2>{patientName(context.patient)}</h2><p>{t('assessment.step', { current: step + 1, total: elbowSteps.length })} · {currentStep.label}</p></div>
          <span className={`assessment-save-state assessment-save-state--${readOnly ? 'locked' : saveState || 'idle'}`}>{readOnly ? t('assessment.readOnly') : saveState === 'saving' ? t('assessment.saving') : saveState === 'saved' ? t('assessment.saved') : dirty ? t('assessment.unsaved') : t('assessment.saved')}</span>
        </header>

        <section className="panel assessment-progress" aria-label={t('assessment.completion')}>
          <div className="assessment-progress__mobile"><strong>{String(step + 1).padStart(2, '0')} / {String(elbowSteps.length).padStart(2, '0')}</strong><DualLabel label={currentStep.label} labelAr={currentStep.labelAr}/></div>
          <nav aria-label={t('assessment.completion')}>{elbowSteps.map((item, index) => <button type="button" key={item.key} className={index === step ? 'is-current' : index < step ? 'is-passed' : ''} aria-current={index === step ? 'step' : undefined} onClick={() => go(index)}><span>{String(index + 1).padStart(2, '0')}</span><small>{item.label}</small></button>)}</nav>
          <div className="assessment-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><span style={{ width: `${percent}%` }}/></div>
        </section>

        {context.previous_assessment && <div className="clinical-previous-banner"><span>{t('assessment.previousAssessment')}</span><Link to={`/physiotherapist/patients/${patientId}/assessments/elbow/${context.previous_assessment.id}`}>{t('profile.view')}</Link></div>}

        <fieldset className="clinical-assessment-fieldset" disabled={readOnly}>
          <section className="panel assessment-metadata">
            <fieldset><legend>{t('assessment.affectedSide')}</legend><div className="assessment-side-options">{['right', 'left', 'bilateral'].map((option) => <label className={side === option ? 'is-selected' : ''} key={option}><input type="radio" checked={side === option} onChange={() => changeSide(option)}/><span>{t(`elbow.${option}`)}</span></label>)}</div></fieldset>
            <label><span>{t('assessment.linkedSession')}</span><select value={appointmentId} onChange={(event) => changeAppointment(event.target.value)}><option value="">{t('assessment.noSession')}</option>{formattedAppointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.label}</option>)}</select></label>
          </section>

          <section className="panel assessment-section">
            <SectionIntro number={step + 1} title={currentStep.label} titleAr={currentStep.labelAr} description={currentStep.description}/>
            <Section value={data[currentStep.key]} onChange={updateSection}/>
          </section>
        </fieldset>

        {error && <div className="clinical-save-message clinical-save-message--error" role="alert">{error}</div>}
        {notice && <div className="clinical-save-message" role="status">{notice}</div>}
        <footer className="panel assessment-actions">
          <button className="button button--quiet" type="button" disabled={step === 0} onClick={() => go(step - 1)}>← {t('assessment.previous')}</button>
          {!readOnly && <button className="button button--quiet" type="button" disabled={saveState === 'saving'} onClick={() => void save('draft')}>{t('assessment.saveDraft')}</button>}
          {step < elbowSteps.length - 1 ? <button className="button" type="button" onClick={() => go(step + 1)}>{t('assessment.next')} →</button> : !readOnly && <button className="button" type="button" disabled={saveState === 'saving'} onClick={() => void save('completed')}>{t('assessment.complete')}</button>}
        </footer>
      </>}
    </main>
  </DashboardLayout>
}
