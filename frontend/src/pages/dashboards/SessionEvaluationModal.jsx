import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api.js'

const blankEvaluation = {
  session_performance_score: '',
  estimated_sessions_remaining: '',
  pain_improvement_percent: 0,
  progress_vs_previous_percent: '',
  progress_note: '',
}

function metric(value, suffix = '%') {
  return value === null || value === undefined ? '—' : `${value}${suffix}`
}

export default function SessionEvaluationModal({ appointment, onClose, onCompleted }) {
  const { t, i18n } = useTranslation(['physiotherapist', 'common'])
  const titleId = useId()
  const [context, setContext] = useState(null)
  const [form, setForm] = useState(blankEvaluation)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    api.get(`/physiotherapist/appointments/${appointment.id}/evaluation-context`)
      .then((response) => active && setContext(response.data.data))
      .catch(() => active && setError(t('evaluation.errors.load')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [appointment.id, t])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.session_performance_score || form.estimated_sessions_remaining === '') {
      setError(t('evaluation.errors.required'))
      return
    }
    if (!context?.is_first_evaluated_session && form.progress_vs_previous_percent === '') {
      setError(t('evaluation.errors.progressRequired'))
      return
    }

    setSaving(true)
    setError('')
    try {
      await api.post(`/physiotherapist/appointments/${appointment.id}/complete`, {
        ...form,
        session_performance_score: Number(form.session_performance_score),
        estimated_sessions_remaining: Number(form.estimated_sessions_remaining),
        pain_improvement_percent: Number(form.pain_improvement_percent),
        progress_vs_previous_percent: context.is_first_evaluated_session ? null : Number(form.progress_vs_previous_percent),
      })
      await onCompleted()
    } catch (requestError) {
      setError(requestError.response?.status === 409
        ? t('evaluation.errors.conflict')
        : t('evaluation.errors.save'))
    } finally {
      setSaving(false)
    }
  }

  const patient = context?.appointment?.profiles || appointment.profiles
  const patientName = [patient?.first_name, patient?.last_name].filter(Boolean).join(' ')
  const sessionDate = new Date(appointment.starts_at).toLocaleString(
    i18n.resolvedLanguage?.startsWith('ar') ? 'ar-LB' : 'en-US',
    { dateStyle:'medium', timeStyle:'short', timeZone:'UTC' },
  )
  const previous = context?.previous_evaluation

  return <div className="modal-backdrop evaluation-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&!saving&&onClose()}>
    <section className="modal session-evaluation-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="modal-close" type="button" aria-label={t('common:actions.close')} disabled={saving} onClick={onClose}>×</button>
      <header className="evaluation-header">
        <p className="eyebrow">{t('evaluation.eyebrow')}</p>
        <h2 id={titleId}>{t('evaluation.title')}</h2>
        <div className="evaluation-session-meta">
          <span><small>{t('evaluation.patient')}</small><strong>{patientName}</strong></span>
          <span><small>{t('evaluation.date')}</small><strong>{sessionDate}</strong></span>
          {context?.session_number&&<span><small>{t('evaluation.sessionNumber')}</small><strong>#{context.session_number}</strong></span>}
        </div>
      </header>

      {loading&&<div className="evaluation-loading" role="status"><span className="physiotherapist-spinner"/>{t('evaluation.loading')}</div>}
      {!loading&&context&&<form className="evaluation-form" onSubmit={submit}>
        <fieldset className="evaluation-fieldset">
          <legend>{t('evaluation.performance')}</legend>
          <div className="evaluation-score-options">
            {Array.from({length:10},(_,index)=>index+1).map((score)=><button className={Number(form.session_performance_score)===score?'is-selected':''} type="button" aria-pressed={Number(form.session_performance_score)===score} key={score} onClick={()=>update('session_performance_score',score)}>{score}</button>)}
          </div>
          <output>{form.session_performance_score ? `${form.session_performance_score} / 10` : t('evaluation.selectScore')}</output>
        </fieldset>

        <label className="evaluation-field">
          <span>{t('evaluation.remaining')}</span>
          <small>{t('evaluation.remainingHint')}</small>
          <input type="number" min="0" step="1" required value={form.estimated_sessions_remaining} onChange={(event)=>update('estimated_sessions_remaining',event.target.value)}/>
        </label>

        <label className="evaluation-field evaluation-range-field">
          <span>{t('evaluation.painImprovement')}</span>
          <output>{form.pain_improvement_percent}%</output>
          <input type="range" min="0" max="100" step="1" value={form.pain_improvement_percent} onChange={(event)=>update('pain_improvement_percent',event.target.value)}/>
          <small><span>{t('evaluation.noImprovement')}</span><span>{t('evaluation.majorImprovement')}</span></small>
        </label>

        {previous?<aside className="previous-evaluation">
          <strong>{t('evaluation.previousTitle')}</strong>
          <div><span>{t('evaluation.performance')} <b>{previous.session_performance_score}/10</b></span><span>{t('evaluation.painImprovement')} <b>{metric(previous.pain_improvement_percent)}</b></span><span>{t('evaluation.progress')} <b>{previous.progress_vs_previous_percent > 0 ? '+' : ''}{metric(previous.progress_vs_previous_percent)}</b></span></div>
        </aside>:<aside className="previous-evaluation previous-evaluation--empty">{t('evaluation.firstSession')}</aside>}

        {!context.is_first_evaluated_session&&<label className="evaluation-field">
          <span>{t('evaluation.progress')}</span>
          <small>{t('evaluation.progressHint')}</small>
          <div className="evaluation-percent-input"><input type="number" min="-100" max="100" step="1" required value={form.progress_vs_previous_percent} onChange={(event)=>update('progress_vs_previous_percent',event.target.value)}/><span>%</span></div>
        </label>}

        <label className="evaluation-field">
          <span>{t('evaluation.note')}</span>
          <textarea maxLength="2000" value={form.progress_note} placeholder={t('evaluation.notePlaceholder')} onChange={(event)=>update('progress_note',event.target.value)}/>
        </label>

        {error&&<div className="evaluation-error" role="alert">{error}</div>}
        <footer className="evaluation-actions"><button className="button button--quiet" type="button" disabled={saving} onClick={onClose}>{t('common:actions.cancel')}</button><button className="button" type="submit" disabled={saving}>{saving?t('evaluation.saving'):t('evaluation.save')}</button></footer>
      </form>}
      {!loading&&!context&&error&&<div className="evaluation-error" role="alert">{error}</div>}
    </section>
  </div>
}
