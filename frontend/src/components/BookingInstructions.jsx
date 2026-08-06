import './BookingInstructions.css'

const steps = [
  ['calendar', 'اختر التاريخ المناسب من التقويم.'],
  ['clock', 'اختر اليوم والوقت المتاحين.'],
  ['file', 'املأ ملف المريض بالكامل، لأن تعبئته إلزامية لإتمام الحجز.'],
  ['check', 'راجع معلومات الموعد واضغط على زر "تأكيد الحجز".'],
]

function StepIcon({ type }) {
  const paths = {
    calendar: <><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v6M16 3v6M4 11h16"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[type]}</svg>
}

export default function BookingInstructions({ className = '' }) {
  return <section className={`booking-instructions ${className}`} dir="rtl" lang="ar" aria-labelledby={`booking-instructions-title-${className || 'default'}`}>
    <div className="booking-instructions__heading"><span aria-hidden="true">؟</span><div><p>خطوات بسيطة</p><h2 id={`booking-instructions-title-${className || 'default'}`}>كيفية حجز موعد</h2></div></div>
    <ol>{steps.map(([icon,text],index)=><li key={icon}><span className="booking-instructions__number">{index+1}</span><span className="booking-instructions__icon"><StepIcon type={icon}/></span><p>{text}</p></li>)}</ol>
  </section>
}

