import { bodyChartViews, normalizePainLocations, togglePainLocation } from './bodyChartRegions.js'

const outlinePath = 'M92 20 C98 8 142 8 148 20 L146 60 C143 73 137 80 134 84 L137 101 C153 101 171 108 180 119 C190 135 194 165 196 199 L202 252 L195 278 L184 276 L176 222 L174 202 L166 160 L156 209 L158 274 L154 352 L151 430 L168 468 L137 468 L127 452 L124 352 L120 254 L116 352 L113 452 L103 468 L72 468 L89 430 L86 352 L82 274 L84 209 L74 160 L66 202 L64 222 L56 276 L45 278 L38 252 L44 199 C46 165 50 135 60 119 C69 108 87 101 103 101 L106 84 C103 80 97 73 94 60 Z'

export default function BodyChart({ label, ar, values = [], onChange }) {
  const selectedValues = normalizePainLocations(values)
  const selected = new Set(selectedValues)

  const toggle = (value) => onChange(togglePainLocation(selectedValues, value))
  const handleKeyDown = (event, value) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggle(value)
  }

  return (
    <fieldset className="medical-field medical-fieldset medical-field--wide body-chart-field">
      <legend><span className="medical-label"><span dir="ltr">{label}</span><span dir="rtl" lang="ar">{ar}</span></span></legend>
      <p className="body-chart__instructions">
        <span>Select every painful area directly on the body.</span>
        <span dir="rtl" lang="ar">حدّد كل منطقة مؤلمة مباشرة على الجسم.</span>
      </p>
      <div className="body-chart">
        {bodyChartViews.map((view) => {
          const titleId = `body-chart-${view.key}-title`
          return (
            <section className="body-chart__view" key={view.key} aria-labelledby={titleId}>
              <h4 id={titleId}><span>{view.label}</span><span dir="rtl" lang="ar">{view.ar}</span></h4>
              <svg className="body-chart__figure" viewBox="0 0 240 485" role="group" aria-labelledby={titleId}>
                <path className="body-chart__outline" d={outlinePath} aria-hidden="true" />
                {view.regions.map((region) => {
                  const isSelected = selected.has(region.value)
                  const accessibleLabel = `${region.label} — ${region.ar}`
                  return (
                    <path
                      className={`body-chart__region${isSelected ? ' is-selected' : ''}`}
                      d={region.d}
                      data-region={region.value}
                      key={region.value}
                      role="button"
                      tabIndex="0"
                      aria-label={accessibleLabel}
                      aria-pressed={isSelected}
                      onClick={() => toggle(region.value)}
                      onKeyDown={(event) => handleKeyDown(event, region.value)}
                    >
                      <title>{accessibleLabel}</title>
                    </path>
                  )
                })}
              </svg>
            </section>
          )
        })}
      </div>
      <div className="body-chart__status" aria-live="polite">
        <span>{selected.size} region{selected.size === 1 ? '' : 's'} selected</span>
        <span dir="rtl" lang="ar">تم تحديد {selected.size} {selected.size === 1 ? 'منطقة' : 'مناطق'}</span>
      </div>
    </fieldset>
  )
}
