import { useState } from 'react'
import {
  bodyChartViews,
  normalizePainLocations,
  primaryPainAreaRegionValues,
  togglePainLocation,
} from './bodyChartRegions.js'

const frontBackOutline = 'M92 20 C98 8 142 8 148 20 L146 60 C143 73 137 80 134 84 L137 101 C153 101 171 108 180 119 C190 135 194 165 196 199 L202 252 L195 278 L184 276 L176 222 L174 202 L166 160 L156 209 L158 274 L154 352 L151 430 L168 468 L137 468 L127 452 L124 352 L120 254 L116 352 L113 452 L103 468 L72 468 L89 430 L86 352 L82 274 L84 209 L74 160 L66 202 L64 222 L56 276 L45 278 L38 252 L44 199 C46 165 50 135 60 119 C69 108 87 101 103 101 L106 84 C103 80 97 73 94 60 Z'
const sideOutline = 'M91 21 C97 9 124 7 135 21 C141 29 138 37 148 42 L137 49 C136 64 130 75 122 81 L124 101 C143 105 153 118 153 137 L150 190 L160 232 L154 277 L142 273 L138 221 L133 168 L130 207 L137 274 L133 352 L131 430 L148 460 L119 468 L110 451 L107 353 L104 274 L99 353 L94 451 L84 468 L65 468 L79 430 L77 352 L74 274 L80 207 L78 154 L69 197 L65 226 L57 277 L46 274 L50 220 L53 196 L54 137 C54 118 72 104 95 101 L98 81 C91 75 87 63 89 50 L84 43 L91 40 C87 33 87 27 91 21 Z'

const outlineByView = { front:frontBackOutline, back:frontBackOutline, left:sideOutline, right:sideOutline }

export default function BodyChart({ label, ar, values = [], onChange, primaryArea = '', painSide = '' }) {
  const [activeViewKey, setActiveViewKey] = useState('front')
  const selectedValues = normalizePainLocations(values)
  const selected = new Set(selectedValues)
  const primaryHighlights = new Set(primaryPainAreaRegionValues(primaryArea, painSide))
  const activeIndex = Math.max(0, bodyChartViews.findIndex(({ key })=>key===activeViewKey))
  const activeView = bodyChartViews[activeIndex]
  const titleId = `body-chart-${activeView.key}-title`

  const toggle = (value) => onChange(togglePainLocation(selectedValues, value))
  const handleKeyDown = (event, value) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggle(value)
  }
  const showView = (key) => setActiveViewKey(key)
  const rotate = (step) => showView(bodyChartViews[(activeIndex + step + bodyChartViews.length) % bodyChartViews.length].key)
  const groupTransform = activeView.mirrored ? 'translate(240 0) scale(-1 1)' : undefined

  return (
    <fieldset className="medical-field medical-fieldset medical-field--wide body-chart-field">
      <legend><span className="medical-label"><span dir="ltr">{label}</span><span dir="rtl" lang="ar">{ar}</span></span></legend>
      <p className="body-chart__instructions">
        <span>Rotate the model, then select every painful area directly on the body.</span>
        <span dir="rtl" lang="ar">حرّك النموذج، ثم حدّد كل منطقة مؤلمة مباشرة على الجسم.</span>
      </p>

      <div className="body-chart__view-controls" role="group" aria-label="Body view / اتجاه الجسم">
        {bodyChartViews.map((view)=><button
          className={view.key===activeView.key ? 'is-active' : ''}
          type="button"
          aria-pressed={view.key===activeView.key}
          key={view.key}
          onClick={()=>showView(view.key)}
        >
          <span>{view.label}</span>
          <span dir="rtl" lang="ar">{view.ar}</span>
        </button>)}
      </div>

      <section className="body-chart__model" aria-labelledby={titleId}>
        <h4 id={titleId}><span>{activeView.label} view</span><span dir="rtl" lang="ar">منظر {activeView.ar}</span></h4>
        <div className="body-chart__stage">
          <button className="body-chart__rotate body-chart__rotate--previous" type="button" onClick={()=>rotate(-1)} aria-label="Rotate body to previous view">‹</button>
          <div className="body-chart__figure-shell">
            <svg key={activeView.key} className={`body-chart__figure body-chart__figure--${activeView.key}`} viewBox="0 0 240 485" role="group" aria-labelledby={titleId}>
              <g transform={groupTransform}>
                <path className="body-chart__outline" d={outlineByView[activeView.key]} aria-hidden="true" />
                {activeView.regions.map((region) => {
                  const isSelected = selected.has(region.value)
                  const isPrimary = primaryHighlights.has(region.value)
                  const accessibleLabel = `${region.label} — ${region.ar}`
                  return (
                    <path
                      className={`body-chart__region${isSelected ? ' is-selected' : ''}${isPrimary ? ' is-primary' : ''}`}
                      d={region.d}
                      data-region={region.value}
                      key={region.value}
                      role="button"
                      tabIndex="0"
                      aria-label={accessibleLabel}
                      aria-pressed={isSelected || isPrimary}
                      onClick={() => toggle(region.value)}
                      onKeyDown={(event) => handleKeyDown(event, region.value)}
                    >
                      <title>{accessibleLabel}</title>
                    </path>
                  )
                })}
              </g>
            </svg>
          </div>
          <button className="body-chart__rotate body-chart__rotate--next" type="button" onClick={()=>rotate(1)} aria-label="Rotate body to next view">›</button>
        </div>
        <div className="body-chart__key" aria-label="Highlight key">
          {primaryHighlights.size>0&&<span><i className="body-chart__swatch body-chart__swatch--primary"/>Primary area / المنطقة الرئيسية</span>}
          <span><i className="body-chart__swatch body-chart__swatch--selected"/>Selected area / منطقة محددة</span>
        </div>
      </section>

      <div className="body-chart__status" aria-live="polite">
        <span>{selected.size} additional region{selected.size === 1 ? '' : 's'} selected</span>
        <span dir="rtl" lang="ar">تم تحديد {selected.size} {selected.size === 1 ? 'منطقة إضافية' : 'مناطق إضافية'}</span>
      </div>
    </fieldset>
  )
}
