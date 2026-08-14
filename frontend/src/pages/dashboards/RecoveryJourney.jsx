import { useTranslation } from 'react-i18next'
import { formatUtcDate } from '../../i18n/formatters.js'

function name(profile) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
}

function ProgressRing({ value, t }) {
  const hasComparison = value !== null && value !== undefined
  const numeric = hasComparison ? Number(value) : null
  const magnitude = numeric === null ? 0 : Math.min(100, Math.abs(numeric))
  const status = numeric === null ? 'first' : numeric > 0 ? 'improving' : numeric < 0 ? 'review' : 'stable'
  const display = numeric === null ? '—' : numeric > 0 ? `+${numeric}%` : `${numeric}%`
  return <div className={`recovery-ring recovery-ring--${status}`} style={{'--progress':magnitude}} role="img" aria-label={`${display} ${t(`recovery.status.${status}`)}`}>
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50"/><circle className="recovery-ring__value" cx="60" cy="60" r="50" pathLength="100"/></svg>
    <div><strong>{display}</strong><span>{t(`recovery.status.${status}`)}</span></div>
  </div>
}

function Metric({ label, value }) {
  return <article className="recovery-metric"><span>{label}</span><strong>{value}</strong></article>
}

export default function RecoveryJourney({ data, error, loading, language }) {
  const { t } = useTranslation('patient')
  if (loading) return <section className="panel recovery-journey recovery-journey--loading" aria-label={t('recovery.loading')}><span/><span/><span/><span/></section>

  if (error) return <section className="panel recovery-journey recovery-journey--error" role="alert"><div><p className="eyebrow">{t('recovery.eyebrow')}</p><h2>{t('recovery.title')}</h2><p>{t('recovery.error')}</p></div></section>

  const evaluation = data?.latest_evaluation
  const next = data?.next_appointment
  const doctor = evaluation?.appointments?.profiles
  const nextDoctor = next?.profiles
  const progressStatus = evaluation?.progress_vs_previous_percent === null
    ? 'first'
    : evaluation?.progress_vs_previous_percent < 0
      ? 'review'
      : evaluation?.progress_vs_previous_percent > 0
        ? 'improving'
        : 'stable'

  return <section className="panel recovery-journey" aria-labelledby="recovery-journey-title">
    <header className="recovery-journey__header"><div><p className="eyebrow">{t('recovery.eyebrow')}</p><h2 id="recovery-journey-title">{t('recovery.title')}</h2><p>{t('recovery.disclaimer')}</p></div>{evaluation&&<span className={`recovery-status recovery-status--${progressStatus}`}>{t(`recovery.status.${progressStatus}`)}</span>}</header>

    {evaluation?<div className="recovery-journey__content">
      <div className="recovery-progress"><ProgressRing value={evaluation.progress_vs_previous_percent} t={t}/><div><strong>{t('recovery.progressLabel')}</strong><span>{evaluation.appointments?.treatment_type}</span>{doctor&&<small>{t('recovery.recordedBy',{name:name(doctor)})}</small>}</div></div>
      <div className="recovery-metrics"><Metric label={t('recovery.performance')} value={`${evaluation.session_performance_score} / 10`}/><Metric label={t('recovery.pain')} value={`${evaluation.pain_improvement_percent}%`}/><Metric label={t('recovery.remaining')} value={evaluation.estimated_sessions_remaining}/><Metric label={t('recovery.progress')} value={evaluation.progress_vs_previous_percent===null?'—':`${evaluation.progress_vs_previous_percent>0?'+':''}${evaluation.progress_vs_previous_percent}%`}/></div>
      {evaluation.progress_note&&<blockquote className="recovery-note"><span>{t('recovery.note')}</span><p>{evaluation.progress_note}</p></blockquote>}
    </div>:<div className="recovery-empty"><strong>{t('recovery.emptyTitle')}</strong><span>{t('recovery.emptyDescription')}</span></div>}

    <div className="recovery-next"><div><span>{t('recovery.nextAppointment')}</span>{next?<><strong>{formatUtcDate(next.starts_at,language,{weekday:'long',month:'long',day:'numeric'})}</strong><small>{formatUtcDate(next.starts_at,language,{hour:'numeric',minute:'2-digit'})}{nextDoctor?` · ${t('recovery.withDoctor',{name:name(nextDoctor)})}`:''}</small></>:<strong>{t('recovery.noNext')}</strong>}</div></div>
  </section>
}
