export function DualLabel({ label, labelAr, hint, as: Tag = 'span' }) {
  return <Tag className="clinical-dual-label"><span>{label}</span><span dir="rtl" lang="ar">{labelAr}</span>{hint&&<small>{hint}</small>}</Tag>
}

export function SectionIntro({ number, title, titleAr, description }) {
  return <header className="assessment-section__intro"><span className="assessment-section__number">{String(number).padStart(2,'0')}</span><div><DualLabel as="h2" label={title} labelAr={titleAr}/><p>{description}</p></div></header>
}

export function MultiCheck({ label, labelAr, options, value = [], onChange }) {
  function toggle(key) {
    onChange(value.includes(key) ? value.filter((item)=>item!==key) : [...value,key])
  }
  return <fieldset className="clinical-fieldset"><legend><DualLabel label={label} labelAr={labelAr}/></legend><div className="clinical-check-grid">{options.map((option)=><label className={`clinical-check-card ${value.includes(option.key)?'is-selected':''}`} key={option.key}><input type="checkbox" checked={value.includes(option.key)} onChange={()=>toggle(option.key)}/><DualLabel label={option.label} labelAr={option.labelAr}/></label>)}</div></fieldset>
}

export function ChoiceButtons({ label, labelAr, options, value = '', onChange, allowClear = true }) {
  return <fieldset className="clinical-choice"><legend><DualLabel label={label} labelAr={labelAr}/></legend><div>{options.map((option)=>{
    const normalized = typeof option === 'string' ? {key:option,label:option,labelAr:option} : option
    return <label className={value===normalized.key?'is-selected':''} key={normalized.key}><input type="radio" value={normalized.key} checked={value===normalized.key} onChange={()=>onChange(normalized.key)}/><DualLabel label={normalized.label} labelAr={normalized.labelAr}/></label>
  })}{allowClear&&value!==''&&<button className="clinical-clear" type="button" onClick={()=>onChange('')}>Clear / مسح</button>}</div></fieldset>
}

export function BooleanChoice({ label, labelAr, value, onChange }) {
  return <ChoiceButtons label={label} labelAr={labelAr} value={value===true?'yes':value===false?'no':''} onChange={(next)=>onChange(next===''?null:next==='yes')} options={[{key:'yes',label:'Yes',labelAr:'نعم'},{key:'no',label:'No',labelAr:'لا'}]}/>
}

export function NotesField({ label = 'Clinical Notes', labelAr = 'ملاحظات سريرية', value = '', onChange, rows = 4, placeholder = '' }) {
  return <label className="clinical-text-field"><DualLabel label={label} labelAr={labelAr}/><textarea rows={rows} value={value} placeholder={placeholder} onChange={(event)=>onChange(event.target.value)}/></label>
}

export function NumberField({ label, labelAr, value = '', onChange, min, max, suffix, readOnly = false }) {
  return <label className="clinical-number-field"><DualLabel label={label} labelAr={labelAr}/><span><input type="number" min={min} max={max} step="1" value={value??''} readOnly={readOnly} onChange={(event)=>onChange(event.target.value===''?'':Number(event.target.value))}/>{suffix&&<b>{suffix}</b>}</span></label>
}

export function TextList({ label, labelAr, values = [], onChange }) {
  const displayed = values.length ? values : ['']
  function update(index, value) {
    const next = [...displayed]
    next[index] = value
    onChange(next.filter((item, itemIndex)=>item.trim() || itemIndex===index))
  }
  function remove(index) { onChange(displayed.filter((_,itemIndex)=>itemIndex!==index).filter(Boolean)) }
  return <div className="clinical-text-list"><DualLabel label={label} labelAr={labelAr}/>{displayed.map((value,index)=><div key={index}><span>{index+1}.</span><input value={value} onChange={(event)=>update(index,event.target.value)}/>{displayed.length>1&&<button type="button" aria-label="Remove entry" onClick={()=>remove(index)}>×</button>}</div>)}<button className="text-button" type="button" onClick={()=>onChange([...displayed.filter(Boolean),''])}>+ Add / إضافة</button></div>
}

export function FindingCard({ item, active = true, onToggle, children }) {
  return <article className={`clinical-finding-card ${active?'is-active':''}`}><label className="clinical-finding-card__heading">{onToggle&&<input type="checkbox" checked={active} onChange={(event)=>onToggle(event.target.checked)}/>}<DualLabel label={item.label} labelAr={item.labelAr}/></label>{active&&children}</article>
}
