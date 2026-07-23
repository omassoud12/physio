import { createSupabaseClient } from '../config/supabase.js';

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function profileFromUser(user) {
  const metadata = user.user_metadata || {};
  const gender = String(metadata.gender || '').trim().toLowerCase();

  return {
    id: user.id,
    first_name: metadata.first_name || '',
    last_name: metadata.last_name || '',
    gender: ['female', 'male'].includes(gender) ? gender : null,
    role: 'patient',
  };
}

export async function signUpUser({ firstName, lastName, gender, email, password }) {
  const supabase = createSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedGender = String(gender || '').trim().toLowerCase();
  if (!['female', 'male'].includes(normalizedGender)) {
    throw createServiceError('Gender must be female or male', 400);
  }
  const administratorEmail = (
    process.env.ADMIN_EMAIL || 'omarmassoud27076@gmail.com'
  ).trim().toLowerCase();
  if (normalizedEmail === administratorEmail) {
    throw createServiceError('An account with this email already exists', 409);
  }
  const profile = {
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    gender: normalizedGender,
    role: 'patient',
  };

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: profile,
    },
  });

  if (authError) {
    const statusCode = authError.code === 'user_already_exists' ? 409 : 400;
    throw createServiceError(authError.message || 'Unable to create account', statusCode);
  }

  if (!authData.user || authData.user.identities?.length === 0) {
    throw createServiceError('An account with this email already exists', 409);
  }

  // When email confirmation is disabled, create the profile immediately with
  // the authenticated session. Otherwise the database trigger handles it.
  if (authData.session) {
    const authenticatedClient = createSupabaseClient();
    await authenticatedClient.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });

    const { error: profileError } = await authenticatedClient
      .from('profiles')
      .upsert({ id: authData.user.id, ...profile }, { onConflict: 'id' });

    if (profileError) {
      throw createServiceError('Account created, but the profile could not be saved', 500);
    }
  }

  return {
    user: authData.user,
    session: authData.session,
    profile: { id: authData.user.id, ...profile },
    requiresEmailConfirmation: !authData.session,
  };
}

export async function signInUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const supabase = createSupabaseClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (authError?.code === 'email_not_confirmed') {
    throw createServiceError(
      'Please confirm your email address before signing in',
      403,
    );
  }

  if (authError?.code === 'invalid_credentials') {
    throw createServiceError('Invalid email or password', 401);
  }

  if (authError) {
    const statusCode = authError.status >= 500 ? 503 : 400;
    throw createServiceError(authError.message || 'Unable to sign in', statusCode);
  }

  if (!authData.user || !authData.session) {
    throw createServiceError('Supabase did not create a login session', 502);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, gender, role, is_active')
    .eq('id', authData.user.id)
    .single();

  if (profileError && ['42703', '42P01'].includes(profileError.code)) {
    throw createServiceError(
      'The clinic database is not initialized. Run the required Supabase migrations.',
      503,
    );
  }

  if (profileError || !profile) {
    const metadataProfile = profileFromUser(authData.user);

    if (!metadataProfile.first_name || !metadataProfile.last_name) {
      throw createServiceError('Unable to load user profile', 500);
    }

    return {
      user: authData.user,
      session: authData.session,
      profile: metadataProfile,
    };
  }

  if (!profile.is_active) {
    throw createServiceError('Invalid email or password', 401);
  }

  return {
    user: authData.user,
    session: authData.session,
    profile,
  };
}
