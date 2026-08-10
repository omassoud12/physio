import crypto from 'node:crypto';
import { apiError, ok, sendError } from '../utils/http.js';

const BUCKET = 'patient-medical-documents';
const MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const CATEGORIES = new Set(['mri','ct','xray','ultrasound','emg','blood_test','medical_report','prescription']);
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const SECTION_KEYS = ['personal_data','medical_history','risk_factors','screening','subjective_assessment'];
const RED_FLAG_KEYS = ['fever','unexplained_weight_loss','known_cancer','constant_night_pain','major_trauma','incontinence','saddle_anesthesia','progressive_weakness','chest_pain','recent_infection','known_fracture'];

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function numberInRange(value, min, max) {
  return value === '' || value === null || value === undefined || (Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max);
}

export function validatePayload(body, submitting = false) {
  for (const key of SECTION_KEYS) if (body[key] !== undefined && !isObject(body[key])) throw apiError(`${key} must be an object`, 400);
  if (!numberInRange(body.completion_percent, 0, 100)) throw apiError('Invalid completion percentage', 400);
  const personal = body.personal_data || {};
  if (personal.date_of_birth && new Date(`${personal.date_of_birth}T00:00:00Z`) > new Date()) throw apiError('Date of birth cannot be in the future / لا يمكن أن يكون تاريخ الميلاد في المستقبل', 400);
  if (!numberInRange(personal.height_cm, 80, 250)) throw apiError('Invalid height / الطول غير صالح', 400);
  if (!numberInRange(personal.weight_kg, 20, 350)) throw apiError('Invalid weight / الوزن غير صالح', 400);
  const pain = body.subjective_assessment?.pain_scores || {};
  for (const score of Object.values(pain)) if (!numberInRange(score, 0, 10)) throw apiError('Pain scores must be between 0 and 10 / يجب أن تتراوح درجات الألم بين 0 و10', 400);
  const painImpact = body.subjective_assessment?.pain_impact || {};
  for (const score of Object.values(painImpact)) if (!numberInRange(score, 0, 10)) throw apiError('Pain impact scores must be between 0 and 10 / يجب أن تتراوح درجات تأثير الألم بين 0 و10', 400);
  if (submitting && (!personal.first_name?.trim() || !personal.last_name?.trim() || !personal.date_of_birth || !personal.sex)) {
    throw apiError('Complete the required personal information / يرجى إكمال المعلومات الشخصية المطلوبة', 400);
  }
  if (submitting && body.medical_history?.allergies && !body.medical_history.allergy_details?.trim()) throw apiError('Specify the type of allergy / يرجى تحديد نوع الحساسية', 400);
  if (submitting && body.subjective_assessment?.radiation && !body.subjective_assessment.radiation_location?.trim()) throw apiError('Specify the region of radiation / يرجى تحديد منطقة انتشار الألم', 400);
  if (submitting && body.subjective_assessment?.morning_stiffness && !body.subjective_assessment.stiffness_duration?.trim()) throw apiError('Specify the duration of stiffness / يرجى تحديد مدة التيبس', 400);
  if (submitting && RED_FLAG_KEYS.some((key) => typeof body.screening?.[key] !== 'boolean')) throw apiError('Answer all screening questions / يرجى الإجابة عن جميع أسئلة الفحص', 400);
}

export function calculatedPersonal(personal = {}) {
  const date = personal.date_of_birth ? new Date(`${personal.date_of_birth}T00:00:00Z`) : null;
  let age = '';
  if (date && !Number.isNaN(date.getTime()) && date <= new Date()) {
    const now = new Date();
    age = now.getUTCFullYear() - date.getUTCFullYear();
    if (now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) age -= 1;
  }
  const height = Number(personal.height_cm); const weight = Number(personal.weight_kg);
  const bmi = height >= 80 && height <= 250 && weight >= 20 && weight <= 350 ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : '';
  return { ...personal, age, bmi };
}

async function assertCanRead(req, patientId) {
  if (req.auth.user.id === patientId || req.auth.profile.role === 'admin') return;
  if (req.auth.profile.role !== 'physiotherapist') throw apiError('Medical record not found', 404);
  const [assignment, appointment] = await Promise.all([
    req.db.from('patient_physiotherapist_assignments').select('id').eq('patient_id', patientId).eq('physiotherapist_id', req.auth.user.id).eq('is_active', true).maybeSingle(),
    req.db.from('appointments').select('id').eq('patient_id', patientId).eq('physiotherapist_id', req.auth.user.id).limit(1).maybeSingle(),
  ]);
  if (!assignment.data && !appointment.data) throw apiError('Medical record not found', 404);
}

async function loadRecord(db, patientId) {
  const profile = await db.from('patient_medical_profiles').select('*').eq('patient_id', patientId).maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data) return null;
  const [surgeries, medications, documents] = await Promise.all([
    db.from('patient_surgeries').select('id,surgery_date,operated_region,details').eq('medical_profile_id', profile.data.id).order('created_at'),
    db.from('patient_medications').select('id,medication_name,indication,dosage,frequency').eq('medical_profile_id', profile.data.id).order('created_at'),
    db.from('patient_documents').select('id,category,original_filename,file_type,file_size,description,upload_date').eq('medical_profile_id', profile.data.id).order('upload_date', { ascending: false }),
  ]);
  for (const result of [surgeries, medications, documents]) if (result.error) throw result.error;
  return { ...profile.data, surgeries: surgeries.data || [], medications: medications.data || [], documents: documents.data || [] };
}

export async function myRecord(req, res) {
  try {
    const record = await loadRecord(req.db, req.auth.user.id);
    const appointments = await req.db.from('appointments').select('id,treatment_type,starts_at,status,physiotherapist_id').eq('patient_id', req.auth.user.id).order('starts_at', { ascending: false });
    if (appointments.error) throw appointments.error;
    return ok(res, { record, profile: req.auth.profile, appointments: appointments.data || [] });
  } catch (error) { return sendError(res, error, 'Unable to load medical record'); }
}

export async function patientRecord(req, res) {
  try {
    await assertCanRead(req, req.params.patientId);
    const record = await loadRecord(req.db, req.params.patientId);
    if (!record) throw apiError('Medical record not found', 404);
    return ok(res, record);
  } catch (error) { return sendError(res, error, 'Unable to load medical record'); }
}

export async function saveRecord(req, res) {
  try {
    const submitting = req.body.completion_status === 'submitted';
    validatePayload(req.body, submitting);
    const patientId = req.auth.user.id;
    if (req.body.booking_id) {
      const booking = await req.db.from('appointments').select('id').eq('id', req.body.booking_id).eq('patient_id', patientId).maybeSingle();
      if (!booking.data) throw apiError('Invalid appointment', 400);
    }
    const existing = await req.db.from('patient_medical_profiles').select('id,created_by').eq('patient_id', patientId).maybeSingle();
    if (existing.error) throw existing.error;
    const values = {
      patient_id: patientId,
      booking_id: req.body.booking_id || null,
      completion_percent: Math.round(Number(req.body.completion_percent) || 0),
      completion_status: submitting ? 'submitted' : 'draft',
      submitted_at: submitting ? new Date().toISOString() : null,
      created_by: existing.data?.created_by || patientId,
      updated_at: new Date().toISOString(),
    };
    for (const key of SECTION_KEYS) if (req.body[key] !== undefined) values[key] = req.body[key];
    if (values.personal_data) values.personal_data = calculatedPersonal(values.personal_data);
    const saved = existing.data
      ? await req.db.from('patient_medical_profiles').update(values).eq('id', existing.data.id).select('*').single()
      : await req.db.from('patient_medical_profiles').insert(values).select('*').single();
    if (saved.error) throw saved.error;

    if (Array.isArray(req.body.surgeries)) {
      await req.db.from('patient_surgeries').delete().eq('medical_profile_id', saved.data.id);
      const rows = req.body.surgeries.filter((row) => row.operated_region?.trim()).map((row) => ({ medical_profile_id: saved.data.id, patient_id: patientId, surgery_date: row.surgery_date || null, operated_region: row.operated_region.trim(), details: row.details?.trim() || null }));
      if (rows.length) { const result = await req.db.from('patient_surgeries').insert(rows); if (result.error) throw result.error; }
    }
    if (Array.isArray(req.body.medications)) {
      await req.db.from('patient_medications').delete().eq('medical_profile_id', saved.data.id);
      const rows = req.body.medications.filter((row) => row.medication_name?.trim()).map((row) => ({ medical_profile_id: saved.data.id, patient_id: patientId, medication_name: row.medication_name.trim(), indication: row.indication?.trim() || null, dosage: row.dosage?.trim() || null, frequency: row.frequency?.trim() || null }));
      if (rows.length) { const result = await req.db.from('patient_medications').insert(rows); if (result.error) throw result.error; }
    }
    const snapshot = { ...Object.fromEntries(SECTION_KEYS.map((key) => [key, saved.data[key]])), surgeries: req.body.surgeries || [], medications: req.body.medications || [], completion_percent: saved.data.completion_percent, completion_status: saved.data.completion_status };
    const version = await req.db.from('patient_medical_profile_versions').insert({ medical_profile_id: saved.data.id, patient_id: patientId, snapshot, saved_by: patientId });
    if (version.error) throw version.error;
    return ok(res, await loadRecord(req.db, patientId), submitting ? 'Medical profile submitted' : 'Draft saved');
  } catch (error) { return sendError(res, error, 'Unable to save medical record'); }
}

export async function uploadDocument(req, res) {
  try {
    if (!req.file) throw apiError('Select a file / يرجى اختيار ملف', 400);
    if (!MIME_TYPES.has(req.file.mimetype) || req.file.size > MAX_FILE_SIZE) throw apiError('Invalid file format or size (8 MB max.) / نوع الملف أو حجمه غير صالح (الحد الأقصى 8 ميغابايت)', 400);
    if (!CATEGORIES.has(req.body.category)) throw apiError('Document category is required', 400);
    let record = await loadRecord(req.db, req.auth.user.id);
    if (!record) {
      const created = await req.db.from('patient_medical_profiles').insert({ patient_id: req.auth.user.id, created_by: req.auth.user.id }).select('*').single();
      if (created.error) throw created.error;
      record = created.data;
    }
    const extension = req.file.mimetype === 'application/pdf' ? 'pdf' : req.file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const storagePath = `${req.auth.user.id}/${record.id}/${crypto.randomUUID()}.${extension}`;
    const uploaded = await req.db.storage.from(BUCKET).upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploaded.error) throw uploaded.error;
    const inserted = await req.db.from('patient_documents').insert({ medical_profile_id: record.id, patient_id: req.auth.user.id, booking_id: record.booking_id || null, category: req.body.category, original_filename: req.file.originalname, storage_path: storagePath, file_type: req.file.mimetype, file_size: req.file.size, description: String(req.body.description || '').trim() || null, created_by: req.auth.user.id }).select('id,category,original_filename,file_type,file_size,description,upload_date').single();
    if (inserted.error) { await req.db.storage.from(BUCKET).remove([storagePath]); throw inserted.error; }
    return ok(res, inserted.data, 'Document uploaded', 201);
  } catch (error) { return sendError(res, error, 'Unable to upload document'); }
}

export async function documentUrl(req, res) {
  try {
    const doc = await req.db.from('patient_documents').select('patient_id,storage_path').eq('id', req.params.id).maybeSingle();
    if (!doc.data) throw apiError('Document not found', 404);
    await assertCanRead(req, doc.data.patient_id);
    const signed = await req.db.storage.from(BUCKET).createSignedUrl(doc.data.storage_path, 60);
    if (signed.error) throw signed.error;
    return ok(res, { url: signed.data.signedUrl, expires_in: 60 });
  } catch (error) { return sendError(res, error, 'Unable to access document'); }
}

export async function removeDocument(req, res) {
  try {
    const doc = await req.db.from('patient_documents').select('id,patient_id,storage_path').eq('id', req.params.id).eq('patient_id', req.auth.user.id).maybeSingle();
    if (!doc.data) throw apiError('Document not found', 404);
    const removed = await req.db.storage.from(BUCKET).remove([doc.data.storage_path]);
    if (removed.error) throw removed.error;
    const deleted = await req.db.from('patient_documents').delete().eq('id', doc.data.id);
    if (deleted.error) throw deleted.error;
    return ok(res, { id: doc.data.id }, 'Document removed');
  } catch (error) { return sendError(res, error, 'Unable to remove document'); }
}
