import { apiError, ok, pick, required, sendError } from '../utils/http.js';

const profileFields = ['first_name', 'last_name', 'phone', 'gender'];
const clinicianFields = ['professional_title', 'license_number', 'specialization', 'biography', 'years_of_experience', 'consultation_duration', 'profile_image', 'is_accepting_patients'];
const genders = ['female', 'male'];

function normalizedGender(value) {
  const gender = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!genders.includes(gender)) throw apiError('Gender must be female or male', 400);
  return gender;
}

async function getRole(db, id, role) {
  const { data } = await db.from('profiles').select('id, gender, role, is_active').eq('id', id).eq('role', role).single();
  if (!data) throw apiError(`${role === 'patient' ? 'Patient' : 'Physiotherapist'} not found`, 404);
  return data;
}

export async function dashboard(req, res) {
  try {
    const db = req.db;
    const [patients, clinicians, appointments, pending] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'patient').eq('is_active', true),
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'physiotherapist').eq('is_active', true),
      db.from('appointments').select('id', { count: 'exact', head: true }),
      db.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    return ok(res, { totalPatients: patients.count || 0, totalPhysiotherapists: clinicians.count || 0, totalAppointments: appointments.count || 0, pendingAppointments: pending.count || 0 });
  } catch (error) { return sendError(res, error, 'Unable to load dashboard'); }
}

export async function createPhysiotherapist(req, res) {
  const db = req.db;
  let createdUserId;
  try {
    required(req.body, ['first_name','last_name','gender','email','phone','password','professional_title','license_number','specialization']);
    if (req.body.password.length < 8) throw apiError('Password must be at least 8 characters', 400);
    const gender = normalizedGender(req.body.gender);
    const email = req.body.email.trim().toLowerCase();
    const { data: auth, error: authError } = await db.auth.admin.createUser({
      email, password: req.body.password, email_confirm: true,
      user_metadata: { first_name: req.body.first_name.trim(), last_name: req.body.last_name.trim(), gender },
    });
    if (authError) throw apiError(authError.message, authError.code === 'email_exists' ? 409 : 400);
    createdUserId = auth.user.id;

    const profile = { id: createdUserId, ...pick(req.body, profileFields), gender, email, role: 'physiotherapist', is_active: true };
    const { error: profileError } = await db.from('profiles').upsert(profile, { onConflict: 'id' });
    if (profileError) throw profileError;
    const clinician = { profile_id: createdUserId, ...pick(req.body, clinicianFields) };
    const { data, error } = await db.from('physiotherapists').insert(clinician).select('id, profile_id, professional_title, license_number, specialization, biography, years_of_experience, consultation_duration, profile_image, is_accepting_patients').single();
    if (error) throw error;
    return ok(res, { ...profile, ...data }, 'Physiotherapist created successfully', 201);
  } catch (error) {
    if (createdUserId) {
      const { error: cleanupError } = await db.auth.admin.deleteUser(createdUserId);
      if (cleanupError) console.error('Physiotherapist cleanup failed', cleanupError);
    }
    if (error.code === '23505') error = apiError('Email or license number already exists', 409);
    return sendError(res, error, 'Unable to create physiotherapist');
  }
}

export async function listPhysiotherapists(req, res) {
  try {
    const { data, error } = await req.db.from('physiotherapists').select('id, profile_id, professional_title, license_number, specialization, biography, years_of_experience, consultation_duration, profile_image, is_accepting_patients, profiles!inner(first_name,last_name,email,phone,gender,is_active)').order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, data);
  } catch (error) { return sendError(res, error, 'Unable to load physiotherapists'); }
}

export async function updatePhysiotherapist(req, res) {
  try {
    await getRole(req.db, req.params.id, 'physiotherapist');
    const profileUpdate = pick(req.body, [...profileFields, 'is_active']);
    if (profileUpdate.gender !== undefined) profileUpdate.gender = normalizedGender(profileUpdate.gender);
    const clinicianUpdate = pick(req.body, clinicianFields);
    if (Object.keys(profileUpdate).length) {
      const { error } = await req.db.from('profiles').update({ ...profileUpdate, updated_at: new Date().toISOString() }).eq('id', req.params.id);
      if (error) throw error;
    }
    if (profileUpdate.is_active === false) clinicianUpdate.is_accepting_patients = false;
    if (Object.keys(clinicianUpdate).length) {
      const { error } = await req.db.from('physiotherapists').update({ ...clinicianUpdate, updated_at: new Date().toISOString() }).eq('profile_id', req.params.id);
      if (error) throw error;
    }
    return ok(res, { id: req.params.id }, 'Physiotherapist updated successfully');
  } catch (error) { return sendError(res, error, 'Unable to update physiotherapist'); }
}

export async function disablePhysiotherapist(req, res) {
  req.body = { is_active: false, is_accepting_patients: false };
  return updatePhysiotherapist(req, res);
}

export async function listPatients(req, res) {
  try {
    const search = String(req.query.search || '').trim().replace(/[,%()]/g, '');
    let query = req.db.from('profiles').select('id,first_name,last_name,email,phone,gender,medical_record_number,is_active,created_at').eq('role', 'patient').order('created_at', { ascending: false });
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,medical_record_number.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return ok(res, data);
  } catch (error) { return sendError(res, error, 'Unable to load patients'); }
}

export async function getPatient(req, res) {
  try {
    await getRole(req.db, req.params.id, 'patient');
    const [profile, assignment, appointments] = await Promise.all([
      req.db.from('profiles').select('id,first_name,last_name,email,phone,gender,date_of_birth,medical_record_number,is_active,created_at').eq('id', req.params.id).single(),
      req.db.from('patient_physiotherapist_assignments').select('id,physiotherapist_id,assigned_at,profiles!patient_physiotherapist_assignments_physiotherapist_id_fkey(first_name,last_name)').eq('patient_id', req.params.id).eq('is_active', true).maybeSingle(),
      req.db.from('appointments').select('id,status,starts_at,treatment_type,physiotherapist_id').eq('patient_id', req.params.id).order('starts_at', { ascending: false }).limit(20),
    ]);
    if (profile.error) throw profile.error;
    return ok(res, { profile: profile.data, assignment: assignment.data, appointments: appointments.data || [] });
  } catch (error) { return sendError(res, error, 'Unable to load patient'); }
}

export async function updatePatient(req, res) {
  try {
    await getRole(req.db, req.params.id, 'patient');
    const update = pick(req.body, ['first_name','last_name','phone','gender','date_of_birth','medical_record_number','is_active']);
    if (update.gender !== undefined) update.gender = normalizedGender(update.gender);
    const { data, error } = await req.db.from('profiles').update({ ...update, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('id,first_name,last_name,email,phone,gender,date_of_birth,medical_record_number,is_active').single();
    if (error) throw error;
    return ok(res, data, 'Patient updated successfully');
  } catch (error) { return sendError(res, error, 'Unable to update patient'); }
}

export async function disablePatient(req, res) {
  req.body = { is_active: false };
  return updatePatient(req, res);
}

export async function listAssignments(req, res) {
  try {
    const { data, error } = await req.db.from('patient_physiotherapist_assignments').select('id,patient_id,physiotherapist_id,is_active,assigned_at,ended_at,patient:profiles!patient_physiotherapist_assignments_patient_id_fkey(first_name,last_name,email),physiotherapist:profiles!patient_physiotherapist_assignments_physiotherapist_id_fkey(first_name,last_name)').eq('is_active', true).order('assigned_at', { ascending: false });
    if (error) throw error;
    return ok(res, data);
  } catch (error) { return sendError(res, error, 'Unable to load assignments'); }
}

export async function createAssignment(req, res) {
  try {
    required(req.body, ['patient_id','physiotherapist_id']);
    await Promise.all([getRole(req.db, req.body.patient_id, 'patient'), getRole(req.db, req.body.physiotherapist_id, 'physiotherapist')]);
    const { data, error } = await req.db.from('patient_physiotherapist_assignments').insert({ patient_id: req.body.patient_id, physiotherapist_id: req.body.physiotherapist_id, assigned_by: req.auth.user.id }).select().single();
    if (error?.code === '23505') throw apiError('Patient already has an active assignment', 409);
    if (error) throw error;
    return ok(res, data, 'Patient assigned successfully', 201);
  } catch (error) { return sendError(res, error, 'Unable to assign patient'); }
}

export async function changeAssignment(req, res) {
  try {
    required(req.body, ['physiotherapist_id']);
    await getRole(req.db, req.body.physiotherapist_id, 'physiotherapist');
    const { data: current, error } = await req.db.from('patient_physiotherapist_assignments').select('patient_id').eq('id', req.params.id).eq('is_active', true).single();
    if (error || !current) throw apiError('Active assignment not found', 404);
    await req.db.from('patient_physiotherapist_assignments').update({ is_active: false, ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.params.id);
    req.body.patient_id = current.patient_id;
    return createAssignment(req, res);
  } catch (error) { return sendError(res, error, 'Unable to change assignment'); }
}

export async function endAssignment(req, res) {
  try {
    const { data, error } = await req.db.from('patient_physiotherapist_assignments').update({ is_active: false, ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('is_active', true).select('id').single();
    if (error || !data) throw apiError('Active assignment not found', 404);
    return ok(res, data, 'Assignment ended successfully');
  } catch (error) { return sendError(res, error, 'Unable to end assignment'); }
}
