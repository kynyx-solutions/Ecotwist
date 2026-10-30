// Shared by the admin API functions (files under api/_lib are not routes).
import { createClient } from '@supabase/supabase-js';

// Full-access client: server only
export function serviceClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Checks the caller's admin-panel session (sent as "Authorization: Bearer <token>").
// Returns { db, user, profile }, or sends 401/403 and returns null.
export async function requireStaff(req, res, { admin = false } = {}) {
  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: 'Please log in again.' });
    return null;
  }
  const db = serviceClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    return null;
  }
  const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (!profile || (admin && !['owner', 'admin'].includes(profile.role))) {
    res.status(403).json({ error: admin ? 'Only an owner or admin can do this.' : 'You are not on the staff list.' });
    return null;
  }
  return { db, user: data.user, profile };
}

export const readJson = (req) => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {}));
