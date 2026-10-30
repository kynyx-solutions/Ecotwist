// Staff logins for the admin panel.
//   GET                          → everyone on the staff list
//   POST   { email, full_name, role } → email an invite (owner/admin)
//   PATCH  { id, role }          → change a role (owner/admin)
//   DELETE { id }                → remove a login (owner/admin)
// Admins can't touch owners or make someone an owner; nobody can change or remove themselves.
import { readJson, requireStaff } from '../_lib/admin.js';

const ROLES = ['owner', 'admin', 'staff'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  const ctx = await requireStaff(req, res, { admin: req.method !== 'GET' });
  if (!ctx) return;
  const { db, profile: me } = ctx;
  const body = req.method === 'GET' ? {} : readJson(req);

  if (req.method === 'GET') {
    const [{ data: profiles, error }, { data: users }] = await Promise.all([
      db.from('profiles').select('*').order('created_at'),
      db.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    if (error) return res.status(500).json({ error: error.message });
    const byId = new Map((users?.users ?? []).map((u) => [u.id, u]));
    return res.status(200).json({
      staff: profiles.map((p) => {
        const u = byId.get(p.id);
        return { ...p, last_sign_in_at: u?.last_sign_in_at ?? null, invited: !!u?.invited_at && !u?.last_sign_in_at };
      }),
    });
  }

  const canGrant = (role) => ROLES.includes(role) && (me.role === 'owner' || role !== 'owner');

  if (req.method === 'POST') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const role = body.role ?? 'staff';
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email.' });
    if (!canGrant(role)) return res.status(403).json({ error: 'Only an owner can add another owner.' });

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
      data: { full_name: String(body.full_name ?? '').trim() },
      redirectTo: `${origin}/admin/reset`,
    });
    if (error) {
      const taken = /already been registered|already exists/i.test(error.message);
      return res.status(taken ? 409 : 500).json({ error: taken ? 'This email already has a login.' : error.message });
    }
    // The signup trigger created a staff profile; set the chosen role and name
    await db.from('profiles').upsert({ id: data.user.id, email, full_name: String(body.full_name ?? '').trim(), role });
    return res.status(200).json({ ok: true });
  }

  const { data: target } = await db.from('profiles').select('*').eq('id', body.id).maybeSingle();
  if (!target) return res.status(404).json({ error: 'That person is not on the staff list.' });
  if (target.id === me.id) return res.status(400).json({ error: "You can't change or remove your own login." });
  if (target.role === 'owner' && me.role !== 'owner') return res.status(403).json({ error: 'Only an owner can change another owner.' });

  if (req.method === 'PATCH') {
    if (!canGrant(body.role)) return res.status(403).json({ error: 'Only an owner can make someone an owner.' });
    const { error } = await db.from('profiles').update({ role: body.role }).eq('id', target.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { error } = await db.auth.admin.deleteUser(target.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
