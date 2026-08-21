const item=(key,label,labelAr)=>({key,label,labelAr})

export const neckSteps=[
  item('inspection','Inspection','الفحص البصري'),
  item('palpation','Palpation','الجس'),
  item('articular','Cervical Articular Assessment','التقييم المفصلي للرقبة'),
  item('muscular','Muscular Assessment','التقييم العضلي'),
  item('neurological','Neurological Screen','الفحص العصبي'),
  item('radicular','Neurodynamic / Radicular Tests','اختبارات الجذور العصبية والديناميكا العصبية'),
  item('umnScreen','Upper Motor Neuron Screen','فحص العصبون الحركي العلوي'),
  item('vascularScreen','Vertebrobasilar / Vascular Screen','فحص الدوران الفقري القاعدي والأوعية'),
  item('functional','Functional Assessment','التقييم الوظيفي'),
  item('motorControl','Functional / Motor Control Tests','اختبارات الوظيفة والتحكم الحركي'),
  item('specialTests','Special Tests','الاختبارات الخاصة'),
  item('outcomeMeasure','Outcome Measures','مقاييس النتائج'),
  item('clinicalReasoning','Quick Clinical Reasoning','الاستدلال السريري السريع'),
]

export const pathways=[
  item('red_flags','Red flags / neurological signs','علامات حمراء / علامات عصبية'),
  item('radicular','Radicular symptoms','أعراض جذرية عصبية'),
  item('headache','Headache / upper cervical symptoms','صداع / أعراض عنقية علوية'),
  item('local_pain','Local mechanical neck pain','ألم رقبة ميكانيكي موضعي'),
  item('motor_control','Motor-control deficit','قصور التحكم الحركي'),
  item('vascular','Vascular symptoms suspected','اشتباه أعراض وعائية'),
  item('thoracic_outlet','First rib / thoracic outlet suspicion','اشتباه الضلع الأول / مخرج الصدر'),
]

export const staticFindings=[item('posture','Posture','الوضعية'),item('forward_head','Forward head','تقدم الرأس للأمام'),item('cervical_lordosis','Cervical lordosis','القعس العنقي'),item('head_tilt_rotation','Head tilt / rotation','ميل / دوران الرأس'),item('shoulder_asymmetry','Shoulder asymmetry','عدم تناظر الكتفين'),item('scapular_position','Scapular position','وضعية لوح الكتف'),item('muscle_atrophy','Muscle atrophy','ضمور عضلي'),item('swelling','Swelling','تورم'),item('redness','Redness','احمرار'),item('bruising','Bruising','كدمات'),item('scar','Scar','ندبة'),item('protective_posture','Protective posture','وضعية وقائية')]
export const dynamicFindings=[item('limited_movement','Limited movement','حركة محدودة'),item('compensation','Compensation','تعويض'),item('painful_movement','Painful movement','حركة مؤلمة'),item('tremor','Tremor','رعاش'),item('muscle_guarding','Muscle guarding','حماية عضلية'),item('abnormal_movement','Abnormal movement','حركة غير طبيعية')]
export const palpationGroups=[
  {label:'Bony / Joint Structures',labelAr:'البنى العظمية والمفصلية',items:[item('occiput','Occiput','العظم القذالي'),item('c1','C1','الفقرة C1'),item('c2','C2','الفقرة C2'),item('c3_c7','C3–C7','الفقرات C3–C7'),item('spinous_processes','Spinous processes','النواتئ الشوكية'),item('transverse_processes','Transverse processes','النواتئ المستعرضة'),item('facet_joints','Facet joints','المفاصل الوجيهية'),item('clavicle','Clavicle','الترقوة'),item('first_rib','First rib','الضلع الأول')]},
  {label:'Muscles',labelAr:'العضلات',items:[item('upper_trapezius','Upper trapezius','شبه المنحرفة العلوية'),item('levator_scapulae','Levator scapulae','رافعة لوح الكتف'),item('scm','SCM','القصية الترقوية الخشائية'),item('scalenes','Scalenes','العضلات الأخمعية'),item('suboccipitals','Suboccipitals','العضلات تحت القذالية'),item('splenius','Splenius','العضلة الطحالية'),item('semispinalis','Semispinalis','النصف شوكية'),item('cervical_extensors','Cervical extensors','باسطات الرقبة')]},
]
export const palpationFindings=[item('muscle_spasm','Muscle spasm','تشنج عضلي'),item('increased_tone','Increased tone','زيادة التوتر العضلي'),item('trigger_point','Trigger point','نقطة زناد'),item('joint_tenderness','Joint tenderness','إيلام مفصلي'),item('temperature_change','Temperature change','تغير الحرارة')]
export const movements=[item('flexion','Flexion','الثني'),item('extension','Extension','المد'),item('rotation_right','Rotation Right','الدوران يميناً'),item('rotation_left','Rotation Left','الدوران يساراً'),item('lateral_flexion_right','Lateral Flexion Right','الميل الجانبي يميناً'),item('lateral_flexion_left','Lateral Flexion Left','الميل الجانبي يساراً')]
export const movementQuality=[item('normal','Normal','طبيعي'),item('stiffness','Stiffness','تيبس'),item('pain','Pain','ألم'),item('catching','Catching','تعليق'),item('compensation','Compensation','تعويض')]
export const cervicalSegments=[item('c0_c1','C0–C1','C0–C1'),item('c1_c2','C1–C2','C1–C2'),item('c2_c3','C2–C3','C2–C3'),item('c3_c4','C3–C4','C3–C4'),item('c4_c5','C4–C5','C4–C5'),item('c5_c6','C5–C6','C5–C6'),item('c6_c7','C6–C7','C6–C7'),item('c7_t1','C7–T1','C7–T1')]
export const muscles=[item('cervical_flexors','Cervical flexors','قابضات الرقبة'),item('cervical_extensors','Cervical extensors','باسطات الرقبة'),item('lateral_flexors','Lateral flexors','القابضات الجانبية'),item('rotators','Rotators','العضلات المدورة'),item('upper_trapezius','Upper trapezius','شبه المنحرفة العلوية'),item('scapular_retractors','Scapular retractors','مقربات لوح الكتف'),item('serratus_anterior','Serratus anterior','المنشارية الأمامية')]
export const muscleLength=[item('upper_trapezius_tight','Upper trapezius tight','قصر شبه المنحرفة العلوية'),item('levator_scapulae_tight','Levator scapulae tight','قصر رافعة لوح الكتف'),item('scm_tight','SCM tight','قصر القصية الترقوية الخشائية'),item('scalenes_tight','Scalenes tight','قصر الأخمعيات'),item('pectoralis_minor_tight','Pectoralis minor tight','قصر الصدرية الصغيرة'),item('suboccipital_tightness','Suboccipital tightness','قصر تحت القذالية')]
export const muscleControl=[item('normal','Normal','طبيعي'),item('poor_cervical_control','Poor cervical control','ضعف التحكم العنقي'),item('excessive_upper_trapezius','Excessive upper trapezius activation','فرط تنشيط شبه المنحرفة العلوية'),item('scapular_dyskinesis','Scapular dyskinesis','خلل حركة لوح الكتف')]
export const dermatomes=[item('c2','C2 — Occiput','C2 — القذال'),item('c3','C3 — Neck','C3 — الرقبة'),item('c4','C4 — Shoulder / supraclavicular','C4 — الكتف / فوق الترقوة'),item('c5','C5 — Lateral upper arm','C5 — العضد الوحشي'),item('c6','C6 — Thumb','C6 — الإبهام'),item('c7','C7 — Middle finger','C7 — الإصبع الأوسط'),item('c8','C8 — Little finger','C8 — الخنصر'),item('t1','T1 — Medial forearm','T1 — الساعد الإنسي')]
export const myotomes=[item('c4_shoulder_elevation','C4 — Shoulder elevation','C4 — رفع الكتف'),item('c5_shoulder_abduction','C5 — Shoulder abduction','C5 — تبعيد الكتف'),item('c6_wrist_extension','C6 — Wrist extension','C6 — مد المعصم'),item('c7_elbow_extension','C7 — Elbow extension','C7 — مد المرفق'),item('c8_finger_flexion','C8 — Finger flexion','C8 — ثني الأصابع'),item('t1_finger_abduction','T1 — Finger abduction','T1 — تبعيد الأصابع')]
export const reflexes=[item('biceps_c5_6','Biceps C5–C6','ذات الرأسين C5–C6'),item('brachioradialis_c6','Brachioradialis C6','العضدية الكعبرية C6'),item('triceps_c7','Triceps C7','ثلاثية الرؤوس C7')]
export const radicularTests=[item('spurling','Spurling','سبيرلنغ'),item('cervical_distraction','Cervical Distraction','الشد العنقي'),item('ultt1_median','ULTT1 — Median','ULTT1 — العصب المتوسط'),item('ultt2b_radial','ULTT2b — Radial','ULTT2b — العصب الكعبري'),item('ultt3_ulnar','ULTT3 — Ulnar','ULTT3 — العصب الزندي'),item('shoulder_abduction_relief','Shoulder Abduction Relief Test','اختبار تخفيف الأعراض بتبعيد الكتف')]
export const myelopathySymptoms=[item('hand_clumsiness','Hand clumsiness','ضعف مهارة اليد'),item('difficulty_buttoning','Difficulty buttoning','صعوبة إغلاق الأزرار'),item('gait_disturbance','Gait disturbance','اضطراب المشي'),item('balance_problems','Balance problems','مشكلات التوازن'),item('bilateral_symptoms','Bilateral symptoms','أعراض ثنائية الجانب'),item('progressive_weakness','Progressive weakness','ضعف متفاقم')]
export const vascularSymptoms=[item('dizziness','Dizziness','دوار'),item('diplopia','Diplopia','ازدواج الرؤية'),item('dysarthria','Dysarthria','عسر التلفظ'),item('dysphagia','Dysphagia','عسر البلع'),item('drop_attacks','Drop attacks','نوبات السقوط'),item('nausea','Nausea','غثيان'),item('nystagmus','Nystagmus','رأرأة'),item('facial_limb_sensory_changes','Facial / limb sensory changes','تغيرات حسية في الوجه / الأطراف')]
export const activities=[item('driving','Driving','القيادة'),item('computer_work','Computer work','العمل على الكمبيوتر'),item('reading','Reading','القراءة'),item('sleeping','Sleeping','النوم'),item('looking_up','Looking up','النظر للأعلى'),item('looking_down','Looking down','النظر للأسفل'),item('turning_head','Turning head','إدارة الرأس'),item('dressing','Dressing','ارتداء الملابس'),item('lifting','Lifting','الرفع'),item('carrying','Carrying','الحمل')]
export const functionalTasks=[item('rotation_right','Turn head right — driving','إدارة الرأس يميناً — القيادة'),item('rotation_left','Turn head left — driving','إدارة الرأس يساراً — القيادة'),item('flexion_reading','Flexion — reading','الثني — القراءة'),item('flexion_phone','Flexion — phone','الثني — الهاتف'),item('flexion_computer','Flexion — computer','الثني — الكمبيوتر'),item('extension_overhead','Extension — looking overhead','المد — النظر للأعلى'),item('extension_reaching_shelf','Extension — reaching shelf','المد — الوصول إلى رف'),item('extension_work','Extension — work activities','المد — أنشطة العمل')]
export const motorTests=[item('cervical_flexion_rotation','Cervical Flexion-Rotation Test','اختبار الثني والدوران العنقي'),item('deep_neck_flexor_endurance','Deep Neck Flexor Endurance','تحمل قابضات الرقبة العميقة'),item('craniocervical_flexion','Craniocervical Flexion Test','اختبار الثني القحفي العنقي'),item('joint_position_error','Cervical Proprioception / Joint Position Error','الحس العميق العنقي / خطأ وضع المفصل'),item('scapular_control','Scapular control','التحكم بلوح الكتف'),item('functional_rotation','Functional rotation','الدوران الوظيفي'),item('functional_extension','Functional extension','المد الوظيفي')]

export const specialGroups={
  radicular:{label:'Cervical Radiculopathy Cluster',labelAr:'مجموعة اختبارات الاعتلال الجذري العنقي',tests:[item('spurling','Spurling','سبيرلنغ'),item('ultt1','ULTT1','ULTT1'),item('cervical_distraction','Cervical Distraction','الشد العنقي'),item('rotation_under_60','Cervical rotation <60° toward symptomatic side','الدوران العنقي أقل من 60° نحو جهة الأعراض')]},
  red_flags:{label:'Cervical Myelopathy Screen',labelAr:'فحص اعتلال النخاع العنقي',tests:[item('hoffmann','Hoffmann','هوفمان'),item('babinski','Babinski','بابنسكي'),item('clonus','Clonus','الرمع'),item('gait_balance','Gait / balance','المشي / التوازن'),item('hand_dexterity','Hand dexterity','مهارة اليد')]},
  headache:{label:'Upper Cervical / Cervicogenic Headache',labelAr:'الرقبة العلوية / الصداع عنقي المنشأ',tests:[item('cervical_flexion_rotation','Cervical Flexion-Rotation Test','اختبار الثني والدوران العنقي'),item('upper_cervical_mobility','Upper cervical mobility','حركة الرقبة العلوية'),item('upper_cervical_palpation','Upper cervical palpation','جس الرقبة العلوية'),item('cervical_movement_reproduction','Cervical movement reproduction','إعادة إنتاج الأعراض بالحركة العنقية')]},
  thoracic_outlet:{label:'First Rib / Thoracic Outlet Suspicion',labelAr:'اشتباه الضلع الأول / مخرج الصدر',tests:[item('roos_east','Roos / EAST','روس / EAST'),item('ultt_tos','ULTT','ULTT'),item('adson','Adson','أدسون')]},
}
