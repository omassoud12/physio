export const steps = [
  ['Personal information', 'المعلومات الشخصية'],
  ['Medical history', 'التاريخ الطبي'],
  ['Risk factors', 'عوامل الخطورة'],
  ['Documents', 'المستندات'],
  ['Screening', 'الفحص الأولي'],
  ['Subjective assessment', 'التقييم الذاتي'],
  ['Review and confirmation', 'المراجعة والتأكيد'],
]

export const medicalConditions = [
  ['diabetes','Diabetes','السكري'], ['hypertension','High blood pressure — hypertension','ارتفاع ضغط الدم'],
  ['heart','Heart disease','أمراض القلب'], ['stroke','Stroke','السكتة الدماغية'], ['arthritis','Arthritis','التهاب المفاصل'],
  ['osteoporosis','Osteoporosis','هشاشة العظام'], ['neurological','Neurological condition','أمراض عصبية'],
  ['respiratory','Respiratory condition','أمراض تنفسية'], ['renal','Kidney disease','أمراض الكلى'],
  ['cancer','Cancer','السرطان'], ['other','Other','أخرى'],
]

export const familyConditions = [
  ['osteoarthritis','Osteoarthritis','الفصال العظمي'], ['rheumatoid','Rheumatoid arthritis','التهاب المفاصل الروماتويدي'],
  ['diabetes','Diabetes','السكري'], ['cancer','Cancer','السرطان'], ['other','Other','أخرى'],
]

export const redFlags = [
  ['fever','Fever?','هل توجد حمى؟'], ['unexplained_weight_loss','Unexplained weight loss?','فقدان وزن غير مبرر؟'],
  ['known_cancer','Known cancer?','سرطان معروف؟'], ['constant_night_pain','Constant night pain?','ألم ليلي مستمر؟'],
  ['major_trauma','Major trauma?','إصابة شديدة؟'], ['incontinence','Urinary or fecal incontinence?','فقدان السيطرة على البول أو البراز؟'],
  ['saddle_anesthesia','Saddle anesthesia?','خدر في منطقة العجان؟'], ['progressive_weakness','Progressive weakness?','ضعف متزايد؟'],
  ['chest_pain','Chest pain?','ألم صدري؟'], ['recent_infection','Recent infection?','عدوى حديثة؟'],
  ['known_fracture','Known fracture?','كسر معروف؟'],
]

export const painTypes = [
  ['aching','Aching','موجع'], ['sharp','Sharp','حاد'], ['burning','Burning','حارق'],
  ['stabbing','Stabbing','طاعن'], ['throbbing','Throbbing','نابض'], ['shooting','Shooting','ممتد كالسهم'],
  ['electric','Electric shock-like','كهربائي'], ['dull','Dull','مبهم'], ['pulling','Pulling / tight','شد'],
  ['cramping','Cramping','تشنج'], ['pressure','Pressure / heaviness','ضغط / ثقل'],
  ['tingling','Pins and needles','وخز'], ['numbness','Numbness','خدر'],
]

export const painCauses = [
  ['no_clear_cause','No clear cause','لا يوجد سبب واضح'], ['trauma','Injury / trauma','إصابة'],
  ['fall','Fall','سقوط'], ['accident','Accident','حادث'], ['work','Work-related','مرتبط بالعمل'],
  ['sport','Sports-related','مرتبط بالرياضة'], ['lifting','Lifting / sudden effort','حمل أوزان / مجهود مفاجئ'],
  ['repetitive','Repetitive movement / overuse','حركة متكررة / فرط استخدام'],
  ['post_surgery','After surgery','بعد عملية جراحية'], ['other','Other','أخرى'],
]

export const painScoreFields = [
  ['current','Pain right now','الألم الآن'], ['today','Pain today overall','شدة الألم خلال اليوم'],
  ['best','Least pain','أقل شدة للألم'],
  ['average','Average pain','متوسط شدة الألم'], ['worst','Worst pain','أشد ألم'],
  ['rest','Pain at rest','الألم أثناء الراحة'], ['activity','Pain during activity','الألم أثناء النشاط'],
  ['night','Pain at night','الألم ليلاً'],
]

export const painPatterns = [
  ['constant','Constant','مستمر'], ['intermittent','Intermittent','متقطع'],
  ['occasional','Occasional','عرضي'],
]

export const painDurationOptions = [
  ['one_hour','One hour','ساعة واحدة'], ['two_hours','Two hours','ساعتان'],
  ['more_than_two_hours','More than two hours','أكثر من ساعتين'],
]

export function normalizePainDuration(value) {
  if (painDurationOptions.some(([key])=>key===value)) return value
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  if (minutes <= 60) return 'one_hour'
  if (minutes <= 120) return 'two_hours'
  return 'more_than_two_hours'
}

export const irritabilityLevels = [
  ['low','Low — settles quickly','منخفضة — يهدأ بسرعة'],
  ['moderate','Moderate — takes some time to settle','متوسطة — يحتاج بعض الوقت ليهدأ'],
  ['high','High — easily triggered and slow to settle','مرتفعة — يُستثار بسهولة ويهدأ ببطء'],
]

export const painEvolution = [
  ['worse','Worsening','يزداد سوءاً'], ['stable','Unchanged / stable','ثابت'],
  ['better','Improving','يتحسن'], ['fluctuating','Fluctuating','متقلب'],
]

export const aggravating = [
  ['walking','Walking','المشي'], ['running','Running','الركض'], ['stairs','Stairs','صعود أو نزول الدرج'],
  ['sitting','Sitting','الجلوس'], ['standing','Standing','الوقوف'], ['lifting','Lifting','حمل الأوزان'],
  ['sleeping','Sleeping / lying down','النوم / الاستلقاء'], ['position','Prolonged position','الثبات في وضعية لفترة طويلة'],
  ['rotation','Twisting / rotation','الالتفاف / الدوران'], ['flexion','Bending forward','الانحناء للأمام'],
  ['extension','Bending backward','الانحناء للخلف'], ['reaching','Reaching overhead','مدّ الذراع للأعلى'],
  ['gripping','Gripping / hand use','القبض / استخدام اليد'], ['sit_to_stand','Getting up from sitting','النهوض من الجلوس'],
  ['coughing','Coughing / sneezing','السعال / العطاس'], ['other','Other','أخرى'],
]

export const relieving = [
  ['rest','Rest','الراحة'], ['ice','Ice','الثلج'], ['heat','Heat','الحرارة'],
  ['medication','Medication','الأدوية'], ['position','Changing position','تغيير الوضعية'],
  ['movement','Gentle movement','الحركة الخفيفة'], ['stretching','Stretching','التمدد'],
  ['massage','Massage','التدليك'], ['support','Brace / support','المشد / الدعامة'], ['other','Other','أخرى'],
]

export const painSchedules = [
  ['morning','Morning','صباحاً'], ['midday','Midday','ظهراً'], ['evening','Evening','مساءً'],
  ['night','Night','ليلاً'], ['after_activity','After activity','بعد النشاط'],
  ['unpredictable','No clear pattern','دون نمط واضح'],
]

export const symptoms = [
  ['weakness','Weakness','ضعف'], ['numbness','Numbness','خدر'], ['dizziness','Dizziness','دوخة'],
  ['headaches','Headaches','صداع'], ['swelling','Swelling','تورم'], ['locking','Locking','انغلاق المفصل'],
  ['clicking','Clicking','طقطقة'], ['instability','Instability / giving way','عدم ثبات / خيانة المفصل'],
  ['stiffness','Stiffness','تيبس'], ['spasm','Muscle spasm','تشنج عضلي'],
  ['reduced_motion','Reduced movement','نقص في مدى الحركة'], ['balance','Balance difficulty','صعوبة في التوازن'],
  ['other','Other','أخرى'],
]

export const functionalLimitations = [
  ['walking','Walking','المشي'], ['stairs','Stairs','الدرج'], ['sitting','Sitting','الجلوس'],
  ['standing','Standing','الوقوف'], ['sleep','Sleep','النوم'], ['self_care','Self-care / dressing','العناية الذاتية / ارتداء الملابس'],
  ['housework','Housework','الأعمال المنزلية'], ['driving','Driving','القيادة'],
  ['work','Work / study','العمل / الدراسة'], ['exercise','Exercise / sport','التمارين / الرياضة'],
  ['other','Other','أخرى'],
]

export const painImpactFields = [
  ['daily_activities','Daily activities','الأنشطة اليومية'], ['sleep','Sleep','النوم'],
  ['walking','Walking / mobility','المشي / الحركة'], ['work','Work / study','العمل / الدراسة'],
  ['mood','Mood','المزاج'],
]

export const treatmentsTried = [
  ['pain_medication','Pain medication','مسكنات الألم'], ['physiotherapy','Physiotherapy','علاج فيزيائي'],
  ['injection','Injection','حقن'],
  ['surgery','Surgery','عملية جراحية'], ['massage','Massage / manual therapy','تدليك / علاج يدوي'],
  ['exercise','Exercises','تمارين'], ['ice_heat','Ice / heat','ثلج / حرارة'],
  ['brace','Brace / support','مشد / دعامة'], ['other','Other','أخرى'],
]

export const goals = [
  ['sport','Return to sports','العودة إلى الرياضة'], ['work','Return to work','العودة إلى العمل'],
  ['pain','Reduce pain','تخفيف الألم'], ['walking','Walk normally','المشي بشكل طبيعي'],
  ['sleep','Improve sleep','تحسين النوم'], ['daily','Resume daily activities','ممارسة الأنشطة اليومية'],
  ['other','Other','أخرى'],
]

export const documentCategories = [
  ['mri','MRI','تصوير بالرنين المغناطيسي'], ['ct','CT scan','التصوير الطبقي المحوري'],
  ['xray','X-ray','الأشعة السينية'], ['ultrasound','Ultrasound','التصوير بالأمواج فوق الصوتية'],
  ['emg','EMG','تخطيط كهربائية العضلات والأعصاب'], ['blood_test','Blood test','تحليل الدم'],
  ['medical_report','Medical report','التقرير الطبي'], ['prescription','Medical prescription','الوصفة الطبية'],
]

export const bodyRegions = [
  ['head','Head','الرأس'], ['neck','Neck','الرقبة'], ['shoulder','Shoulder','الكتف'], ['upper_back','Upper back','أعلى الظهر'],
  ['chest','Chest','الصدر'], ['arm','Arm','الذراع'], ['elbow','Elbow','المرفق'], ['wrist_hand','Wrist / hand','المعصم / اليد'],
  ['lower_back','Lower back','أسفل الظهر'], ['hip','Hip','الورك'], ['thigh','Thigh','الفخذ'], ['knee','Knee','الركبة'],
  ['leg','Leg','الساق'], ['ankle_foot','Ankle / foot','الكاحل / القدم'],
]
