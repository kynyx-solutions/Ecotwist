// Website forms → Supabase "leads" table, plus an email alert to the team.
//
// POST /api/lead  { type: "contact" | "proposal" | "newsletter", ...fields, website }
// "website" is a hidden honeypot field: people leave it empty, bots fill it in.
//
// Needs in Vercel (and .env.local for local runs):
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY, ALERT_FROM_EMAIL   (optional: without them no alert is sent)
import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Field → max length, per form
const FIELDS = {
  contact: { name: 120, company: 160, email: 200, phone: 30, interest: 80, message: 5000, submissionId: 60, sourcePage: 200 },
  proposal: { occasion: 160, product: 200, budget: 80, quantity: 80, branding: 80, name: 120, company: 160, email: 200, phone: 30, submissionId: 60, sourcePage: 200 },
  newsletter: { email: 200, sourcePage: 200 },
};

const REQUIRED = {
  contact: ['name', 'email', 'message'],
  proposal: ['name', 'email'],
  newsletter: ['email'],
};

// Best-effort limit per server instance: 5 submissions per IP per 10 minutes
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

const reply = (res, status, success, message) => res.status(status).json({ success, message });

export default async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, false, 'Method not allowed');

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  const type = body.type;
  if (!FIELDS[type]) return reply(res, 400, false, 'Unknown form.');

  // Bots fill the hidden field; pretend it worked so they don't retry
  if (body.website) return reply(res, 200, true, 'Thank you!');

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return reply(res, 429, false, 'Too many submissions. Please try again in a few minutes.');

  const clean = {};
  for (const [field, max] of Object.entries(FIELDS[type])) {
    const value = body[field] == null ? '' : String(body[field]).trim();
    if (value.length > max) return reply(res, 400, false, `${field} is too long.`);
    clean[field] = value;
  }
  for (const field of REQUIRED[type]) {
    if (!clean[field]) return reply(res, 400, false, `Please fill in ${field}.`);
  }
  if (!EMAIL_RE.test(clean.email)) return reply(res, 400, false, 'Please enter a valid email address.');

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return reply(res, 500, false, 'Server is not set up yet.');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { submissionId, sourcePage, ...columns } = clean;
  const { error } = await db.from('leads').insert({
    type,
    ...columns,
    submission_id: submissionId ?? '',
    source_page: sourcePage ?? '',
    data: { ...clean, userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300) },
  });

  if (error) {
    // Unique index on newsletter emails
    if (error.code === '23505' && type === 'newsletter') {
      return reply(res, 200, false, 'This email is already subscribed.');
    }
    console.error('[lead] insert failed', error);
    return reply(res, 500, false, 'Could not save your details. Please try again.');
  }

  if (type !== 'newsletter') await sendAlert(db, type, clean).catch((e) => console.error('[lead] alert failed', e));

  return reply(res, 200, true, type === 'newsletter' ? 'Subscribed successfully.' : 'Response saved successfully');
}

async function sendAlert(db, type, lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const { data } = await db.from('settings').select('value').eq('key', 'lead_alert_emails').maybeSingle();
  const to = Array.isArray(data?.value) ? data.value.filter((e) => EMAIL_RE.test(e)) : [];
  if (!to.length) return;

  const title = type === 'proposal' ? 'New proposal request' : 'New contact enquiry';
  const rows = Object.entries(lead)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join('');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.ALERT_FROM_EMAIL || 'Ecotwist <onboarding@resend.dev>',
      to,
      reply_to: lead.email,
      subject: `${title}: ${lead.name || lead.email}${lead.company ? ` (${lead.company})` : ''}`,
      html: `<h2 style="font-family:sans-serif">${title}</h2><table style="font-family:sans-serif;font-size:14px">${rows}</table>
             <p style="font-family:sans-serif"><a href="https://ecotwist.in/admin/leads">Open in admin</a></p>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
