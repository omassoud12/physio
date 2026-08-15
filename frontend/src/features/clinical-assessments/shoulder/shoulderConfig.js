const item = (key, label, labelAr, description) => ({ key, label, labelAr, description })

export const shoulderSteps = [
  item('observation', 'Observation / Inspection', 'الملاحظة والفحص البصري', 'Posture and movement quality'),
  item('palpation', 'Palpation', 'الجس', 'Record location-specific findings'),
  item('articular', 'Articular Assessment', 'التقييم المفصلي', 'Range, end feel, and mobility'),
  item('muscular', 'Muscular Assessment', 'التقييم العضلي', 'Strength, length, and scapular control'),
  item('neurological', 'Neurological Screen', 'الفحص العصبي', 'Sensory, motor, reflex, and cervical findings'),
  item('functional', 'Functional Assessment', 'التقييم الوظيفي', 'Daily, sport, and functional performance'),
  item('specialTests', 'Targeted Special Tests', 'الاختبارات الخاصة الموجّهة', 'Choose a hypothesis before documenting tests'),
  item('clinicalReasoning', 'Clinical Reasoning', 'الاستدلال السريري', 'Clinician-entered interpretation and differential'),
  item('outcomeMeasure', 'Outcome Measure', 'مقياس النتيجة', 'Record scores without generating them'),
]

export const staticFindings = [
  item('posture','Posture','وضعية الجسم'), item('shoulder_asymmetry','Shoulder asymmetry','عدم تماثل الكتفين'),
  item('clavicle_deformity','Clavicle deformity','تشوه الترقوة'), item('scapular_position','Scapular position','وضعية لوح الكتف'),
  item('scapular_winging','Scapular winging','جناحية لوح الكتف'), item('muscle_atrophy','Muscle atrophy','ضمور عضلي'),
  item('swelling','Swelling','تورّم'), item('ecchymosis','Ecchymosis','كدمات'), item('redness','Redness','احمرار'),
  item('scar','Scar','ندبة'), item('protective_posture','Protective posture','وضعية وقائية'),
]
export const dynamicFindings = [
  item('scapular_dyskinesis','Scapular dyskinesis','خلل حركة لوح الكتف'), item('shoulder_hiking','Shoulder hiking','رفع الكتف'),
  item('painful_arc','Painful arc','قوس مؤلم'), item('limited_movement','Limited movement','محدودية الحركة'), item('compensation','Compensation','حركة تعويضية'),
]
export const palpationBones = [
  item('ac_joint','AC Joint','المفصل الأخرمي الترقوي'), item('sc_joint','SC Joint','المفصل القصي الترقوي'),
  item('clavicle','Clavicle','الترقوة'), item('acromion','Acromion','الأخرم'), item('coracoid','Coracoid','الناتئ الغرابي'),
  item('greater_tuberosity','Greater Tuberosity','الحدبة الكبرى'), item('bicipital_groove','Bicipital Groove','الثلم بين الحدبتين'),
]
export const palpationSoft = [
  item('deltoid','Deltoid','الدالية'), item('supraspinatus','Supraspinatus','فوق الشوكة'), item('infraspinatus','Infraspinatus','تحت الشوكة'),
  item('teres_minor','Teres Minor','المدوّرة الصغرى'), item('subscapularis','Subscapularis','تحت الكتف'), item('biceps_tendon','Biceps Tendon','وتر العضلة ذات الرأسين'),
  item('pectoralis','Pectoralis','العضلة الصدرية'), item('upper_trapezius','Upper Trapezius','الجزء العلوي من شبه المنحرفة'),
]
export const movements = [
  item('flexion','Flexion','الثني'), item('extension','Extension','المد'), item('abduction','Abduction','التبعيد'), item('adduction','Adduction','التقريب'),
  item('external_rotation','External Rotation (ER)','الدوران الخارجي'), item('internal_rotation','Internal Rotation (IR)','الدوران الداخلي'),
  item('horizontal_abduction','Horizontal Abduction','التبعيد الأفقي'), item('horizontal_adduction','Horizontal Adduction','التقريب الأفقي'),
]
export const accessoryMobility = [
  item('gh_posterior_glide','GH Posterior Glide','الانزلاق الخلفي للحقاني العضدي'), item('gh_inferior_glide','GH Inferior Glide','الانزلاق السفلي للحقاني العضدي'),
  item('gh_anterior_glide','GH Anterior Glide','الانزلاق الأمامي للحقاني العضدي'), item('ac_mobility','AC Mobility','حركة المفصل الأخرمي الترقوي'), item('sc_mobility','SC Mobility','حركة المفصل القصي الترقوي'),
]
export const muscles = [
  item('deltoid','Deltoid','الدالية'), item('supraspinatus','Supraspinatus','فوق الشوكة'), item('external_rotation','External Rotation – Infraspinatus / Teres Minor','الدوران الخارجي – تحت الشوكة / المدوّرة الصغرى'),
  item('internal_rotation','Internal Rotation – Subscapularis','الدوران الداخلي – تحت الكتف'), item('biceps','Biceps','ذات الرأسين'), item('triceps','Triceps','ثلاثية الرؤوس'),
  item('serratus_anterior','Serratus Anterior','المنشارية الأمامية'), item('middle_trapezius','Middle Trapezius','شبه المنحرفة الوسطى'), item('lower_trapezius','Lower Trapezius','شبه المنحرفة السفلية'),
]
export const muscleLength = [item('pectoralis_minor_tight','Pectoralis minor tight','قصر الصدرية الصغرى'),item('pectoralis_major_tight','Pectoralis major tight','قصر الصدرية الكبرى'),item('latissimus_dorsi_tight','Latissimus dorsi tight','قصر الظهرية العريضة'),item('posterior_shoulder_tightness','Posterior shoulder tightness','شد خلف الكتف')]
export const scapularControl = [item('normal','Normal','طبيعي'),item('dyskinesis','Dyskinesis','خلل الحركة'),item('winging','Winging','جناحية'),item('excessive_elevation','Excessive elevation','ارتفاع مفرط'),item('poor_upward_rotation','Poor upward rotation','ضعف الدوران العلوي')]
export const dermatomes = [item('c4','C4 — Shoulder','C4 — الكتف'),item('c5','C5 — Lateral Arm','C5 — الجانب الخارجي للذراع'),item('c6','C6 — Thumb','C6 — الإبهام'),item('c7','C7 — Middle Finger','C7 — الإصبع الأوسط'),item('c8','C8 — Little Finger','C8 — الخنصر'),item('t1','T1 — Medial Forearm','T1 — الجانب الداخلي للساعد')]
export const myotomes = [item('c5_abduction','C5 — Abduction','C5 — التبعيد'),item('c6_wrist_extension','C6 — Wrist Extension','C6 — مد المعصم'),item('c7_elbow_extension','C7 — Elbow Extension','C7 — مد المرفق'),item('c8_finger_flexion','C8 — Finger Flexion','C8 — ثني الأصابع'),item('t1_finger_abduction','T1 — Finger Abduction','T1 — تبعيد الأصابع')]
export const reflexes = [item('biceps_c5_6','Biceps C5–6','ذات الرأسين C5–6'),item('brachioradialis_c6','Brachioradialis C6','العضدية الكعبرية C6'),item('triceps_c7','Triceps C7','ثلاثية الرؤوس C7')]
export const cervicalTests = [item('cervical_rom','Cervical ROM','مدى حركة الرقبة'),item('spurling','Spurling','سبيرلينغ'),item('cervical_distraction','Cervical Distraction','الشد العنقي'),item('ultt1','ULTT1','ULTT1'),item('ultt2','ULTT2','ULTT2'),item('ultt3','ULTT3','ULTT3')]
export const peripheralNerves = [item('axillary','Axillary','الإبطي'),item('suprascapular','Suprascapular','فوق الكتف'),item('long_thoracic','Long Thoracic','الصدري الطويل'),item('spinal_accessory','Spinal Accessory','الإضافي الشوكي')]
export const functionalActivities = [item('reaching_overhead','Reaching overhead','الوصول فوق الرأس'),item('hand_behind_neck','Hand behind neck','اليد خلف الرقبة'),item('hand_behind_back','Hand behind back','اليد خلف الظهر'),item('dressing','Dressing','ارتداء الملابس'),item('washing_hair','Washing hair','غسل الشعر'),item('carrying','Carrying','الحمل'),item('lifting','Lifting','الرفع'),item('pushing','Pushing','الدفع'),item('pulling','Pulling','السحب')]
export const sports = [item('throwing','Throwing','الرمي'),item('swimming','Swimming','السباحة'),item('tennis','Tennis','التنس'),item('volleyball','Volleyball','الكرة الطائرة'),item('weightlifting','Weightlifting','رفع الأثقال'),item('boxing','Boxing','الملاكمة'),item('contact_sport','Contact Sport','رياضة احتكاك')]
export const functionalTests = [item('wall_push_up','Wall Push-up','ضغط على الحائط'),item('push_up','Push-up','تمرين الضغط'),item('ckcuest','CKCUEST','CKCUEST'),item('y_balance_upper_quarter','Y-Balance Upper Quarter','اختبار Y للطرف العلوي'),item('medicine_ball_throw','Ball / Medicine-Ball Throw','رمي الكرة الطبية'),item('closed_chain_stability','Closed-Chain Stability','ثبات السلسلة المغلقة')]

export const hypotheses = [
  item('rotator_cuff_subacromial','Rotator Cuff / Subacromial Pain','الكفّة المدورة / ألم تحت الأخرم'), item('possible_rotator_cuff_tear','Possible Rotator Cuff Tear','احتمال تمزق الكفّة المدورة'),
  item('subscapularis','Subscapularis','تحت الكتف'), item('biceps','Biceps','ذات الرأسين'), item('ac_joint','AC Joint','المفصل الأخرمي الترقوي'),
  item('instability','Instability','عدم الثبات'), item('labrum','Labrum','الشفا الحقاني'), item('cervical_radiculopathy','Cervical Radiculopathy','اعتلال الجذور العنقية'),
  item('scapular_dysfunction','Scapular Dysfunction','خلل وظيفة لوح الكتف'), item('other','Other / Undetermined','أخرى / غير محددة'),
]
export const targetedTests = {
  rotator_cuff_subacromial: [item('painful_arc','Painful Arc','القوس المؤلم'),item('hawkins_kennedy','Hawkins-Kennedy','هوكينز-كينيدي'),item('neer','Neer','نير'),item('empty_can','Empty Can / Jobe','العلبة الفارغة / جوب')],
  possible_rotator_cuff_tear: [item('external_rotation_lag','External Rotation Lag Sign','علامة تأخر الدوران الخارجي'),item('drop_arm','Drop Arm','سقوط الذراع'),item('er_resistance','ER Resistance','مقاومة الدوران الخارجي')],
  subscapularis: [item('lift_off','Lift-off','الرفع عن الظهر'),item('belly_press','Belly-Press','ضغط البطن'),item('bear_hug','Bear-Hug','عناق الدب')],
  biceps: [item('speeds',"Speed's",'سبيد'),item('yergasons',"Yergason's",'يرغاسون')],
  ac_joint: [item('cross_body_adduction','Cross-body Adduction','التقريب عبر الجسم'),item('ac_shear','AC Shear','قص المفصل الأخرمي الترقوي')],
  instability: [item('apprehension','Apprehension','الخوف'),item('relocation','Relocation','إعادة الوضع'),item('surprise_release','Surprise / Release','المفاجأة / التحرير')],
  labrum: [item('obriens',"O'Brien",'أوبراين'),item('crank','Crank','كرانك'),item('biceps_load_ii','Biceps Load II','تحميل ذات الرأسين II')],
  cervical_radiculopathy: [item('spurling','Spurling','سبيرلينغ'),item('ultt1','ULTT1','ULTT1'),item('cervical_distraction','Cervical Distraction','الشد العنقي')],
  scapular_dysfunction: [item('scapular_assistance','Scapular Assistance Test','اختبار مساعدة لوح الكتف'),item('scapular_retraction','Scapular Retraction Test','اختبار سحب لوح الكتف'),item('wall_push_up','Wall Push-up','ضغط الحائط')],
  other: [],
}
export const outcomeMeasures = [
  item('spadi','SPADI','SPADI','Shoulder pain / disability'), item('quickdash','QuickDASH','QuickDASH','Upper-limb disability'), item('dash','DASH','DASH','Upper-limb disability'),
  item('ases','ASES','ASES','Shoulder function'), item('constant_murley','Constant-Murley Score','Constant-Murley','Pain + ROM + strength + function'),
  item('wosi','WOSI','WOSI','Shoulder instability'), item('worc','WORC','WORC','Rotator cuff disorders'),
]
