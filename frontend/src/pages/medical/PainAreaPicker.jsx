import { primaryPainAreaOptions } from './painAreaOptions.js'

function PainAreaIcon({ area }) {
  const drawings = {
    ankle: <>
      <path d="M39 18v25c0 8-5 14-5 24 0 9 6 14 15 14 8 0 12-4 20 0 5 3 12 4 19 3 5-1 7-8 2-10l-16-3-17-13c-5-4-7-9-7-16V17"/>
      <path d="M38 60c2 8 7 12 14 11"/><circle className="pain-area-icon__pain" cx="44" cy="54" r="6"/>
    </>,
    knee: <>
      <path d="M38 17v20c0 7-5 10-5 17 0 5 4 8 9 8h16c5 0 9-3 9-8 0-7-5-10-5-17V17"/>
      <path d="M42 62c-6 3-8 8-6 15l3 11M58 62c6 3 8 8 6 15l-3 11M42 61h16"/>
      <circle className="pain-area-icon__pain" cx="50" cy="59" r="6"/>
    </>,
    elbow: <>
      <path d="M30 19v29c0 8-7 14-7 23 0 8 6 13 14 13h11"/>
      <path d="M41 18v29c0 9 5 14 12 18l25 13M46 72l31 8M43 81l27 6"/>
      <circle className="pain-area-icon__pain" cx="31" cy="65" r="6"/>
    </>,
    hip: <>
      <path d="M48 18c-7 1-12 8-10 15 2 6 1 10-4 14-4 3-5 8-2 12l7 8c4 4 4 9 1 14"/>
      <path d="M46 19c12 0 20 4 20 12 0 5-3 8-7 9-4 2-7 6-7 11 0 8-5 14-12 17"/>
      <path d="M31 53c-8-7-18-5-21 5-2 8 2 15 7 21M52 58c6-6 14-6 20-2 6 5 6 15 0 20-6 5-15 2-16-6-1-5 1-9 5-12"/>
      <circle className="pain-area-icon__pain" cx="38" cy="52" r="6"/>
    </>,
    lumbar_spine: <>
      <path d="M24 22c8 16 9 32 2 52M76 22c-8 16-9 32-2 52M26 75c7-12 16-13 24-5 8-8 17-7 24 5M35 83c2-7 7-10 15-10s13 3 15 10"/>
      <path d="M50 18v49M46 22h8M46 32h8M46 42h8M46 52h8M46 62h8"/>
      <circle className="pain-area-icon__pain" cx="50" cy="42" r="4.5"/>
      <circle className="pain-area-icon__pain" cx="50" cy="53" r="4.5"/>
    </>,
    wrist: <>
      <path d="M38 76c-3-10-6-22-9-33-2-6-2-10 1-11 4-1 6 3 8 9l3 8-1-25c0-5 2-7 5-7 3 0 4 2 4 6l1 22 2-28c0-5 2-7 5-7 4 1 4 4 4 8l-2 27 5-23c1-4 3-6 6-5 3 1 3 4 2 8l-5 23 6-15c2-4 4-5 7-3 3 2 1 6 0 9l-8 23c-3 10-9 15-16 19"/>
      <path d="M36 75l26 8M39 84l20 6"/>
      <circle className="pain-area-icon__pain" cx="50" cy="76" r="6"/>
    </>,
    cervical_spine: <>
      <path d="M29 20v10c0 4-4 8-10 11M71 20v10c0 4 4 8 10 11"/>
      <path d="M37 26c5-3 21-3 26 0M37 26l2 9-3 6 5 5-2 7 5 5-1 8M63 26l-2 9 3 6-5 5 2 7-5 5 1 8M43 66c4 3 10 3 14 0"/>
      <circle className="pain-area-icon__pain" cx="50" cy="72" r="3"/>
      <circle className="pain-area-icon__pain" cx="50" cy="82" r="2.4"/>
    </>,
    shoulder: <>
      <path d="M21 77V54c0-17 12-29 28-29 7 0 12 2 17 6M34 37c8-4 17-3 23 3 6 6 7 15 4 23l-7 21"/>
      <path d="M48 34c5-5 12-8 21-8h14M47 44l3 39M50 48c-8 4-11 13-9 22l3 14"/>
      <circle className="pain-area-icon__pain" cx="42" cy="43" r="6"/>
    </>,
  }

  return <svg className="pain-area-icon" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle className="pain-area-icon__frame" cx="50" cy="50" r="46"/>
    <g className="pain-area-icon__drawing">{drawings[area]}</g>
  </svg>
}

export default function PainAreaPicker({ value, onChange }) {
  const hasPresetSelection = primaryPainAreaOptions.some(([key])=>key===value)

  return <fieldset className="medical-field medical-fieldset medical-field--wide pain-area-picker">
    <legend>
      <span className="medical-label">
        <span dir="ltr">Main painful area</span>
        <span dir="rtl" lang="ar">منطقة الألم الرئيسية</span>
      </span>
    </legend>
    <p className="pain-area-picker__hint" id="primary-pain-area-hint">
      <span>Select one area or describe another below.</span>
      <span dir="rtl" lang="ar">اختر منطقة واحدة أو اكتب منطقة أخرى أدناه.</span>
    </p>
    <div className="pain-area-picker__grid" role="radiogroup" aria-describedby="primary-pain-area-hint">
      {primaryPainAreaOptions.map(([key, label, ar])=><label className="pain-area-choice" key={key}>
        <input className="pain-area-choice__input" type="radio" name="primary-pain-area" value={key} checked={value===key} onChange={()=>onChange(key)}/>
        <span className="pain-area-choice__visual"><PainAreaIcon area={key}/></span>
        <span className="pain-area-choice__label">
          <span dir="ltr">{label}</span>
          <span dir="rtl" lang="ar">{ar}</span>
        </span>
      </label>)}
    </div>
    <label className="pain-area-picker__other">
      <span className="medical-label">
        <span dir="ltr">Other area (optional)</span>
        <span dir="rtl" lang="ar">منطقة أخرى (اختياري)</span>
      </span>
      <input value={hasPresetSelection ? '' : value ?? ''} onChange={(event)=>onChange(event.target.value)} placeholder="Type another area / اكتب منطقة أخرى"/>
    </label>
  </fieldset>
}
