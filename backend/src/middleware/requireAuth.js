import { createAdminClient, createSupabaseClient } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });

  try {
    const authClient = createSupabaseClient();
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) return res.status(401).json({ success: false, message: 'Invalid or expired session', errors: [] });

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, first_name, last_name, email, phone, gender, date_of_birth, role, is_active')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) return res.status(401).json({ success: false, message: 'Account profile not found', errors: [] });
    if (!profile.is_active) return res.status(403).json({ success: false, message: 'Account is disabled', errors: [] });

    req.auth = { token, user, profile };
    req.db = admin;
    next();
  } catch (error) {
    console.error(error);
    const missingServerKey = error.message?.includes('must be set in backend/.env');
    return res.status(missingServerKey ? 503 : 500).json({
      success: false,
      message: missingServerKey
        ? 'Backend Supabase secret key is not configured'
        : 'Unable to authenticate request',
      errors: [],
    });
  }
}
