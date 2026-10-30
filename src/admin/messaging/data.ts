import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { whatsappNumber } from '../Customers';
import type { Attachment, MessageTemplate, OutgoingEmail, SendEmailResponse } from './types';

const SETUP_HINT = 'Messaging isn’t set up in the database yet. Run supabase/04-blog-and-messages.sql in Supabase → SQL Editor.';

// Turns a Supabase error into something staff can act on
export function friendlyError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return '';
  const msg = error.message ?? 'Something went wrong';
  if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table|schema cache/i.test(msg)) return SETUP_HINT;
  if (error.code === '42501' || /row-level security/i.test(msg)) return 'You don’t have permission to do this.';
  return msg;
}

/* ── Templates (loaded once per visit) ────────────────────────── */

let templatesCache: Promise<MessageTemplate[]> | null = null;

export function loadTemplates(): Promise<MessageTemplate[]> {
  templatesCache ??= Promise.resolve(
    supabase.from('message_templates').select('*').order('sort_order').order('name'),
  ).then(({ data, error }) => {
    if (error) {
      templatesCache = null; // try again next time
      throw new Error(friendlyError(error));
    }
    return (data as MessageTemplate[]) ?? [];
  });
  return templatesCache;
}

export const invalidateTemplates = () => {
  templatesCache = null;
};

/* ── Sending ──────────────────────────────────────────────────── */

// `attachments` (optional) go to every recipient, on top of each message's own
export const sendEmails = (messages: OutgoingEmail[], campaign = '', attachments: Attachment[] = []) =>
  api<SendEmailResponse>('/api/admin/send-email', { body: { messages, campaign, attachments } });

export const canWhatsApp = (phone?: string | null) => !!phone && whatsappNumber(phone).length >= 10;

export const whatsappLink = (phone: string, text: string) => `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`;

/* ── Attachment links (private bucket → signed links) ─────────── */

export const ATTACHMENT_BUCKET = 'attachments';

export async function signedUrl(path: string, days = 7) {
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, Math.round(days * 24 * 3600));
  if (error || !data) {
    const msg = error?.message ?? '';
    throw new Error(/bucket not found/i.test(msg) ? SETUP_HINT : /not found/i.test(msg) ? 'This file no longer exists.' : friendlyError(error) || 'Could not create a link');
  }
  return data.signedUrl;
}

const kindLabel = (type: string) => (type === 'application/pdf' ? 'PDF' : 'Image');

// For WhatsApp: "quote.pdf (PDF): https://…" lines appended to the text (links last 7 days)
export async function withAttachmentLinks(text: string, list: Attachment[]) {
  if (!list.length) return text;
  const lines = await Promise.all(list.map(async (a) => `${a.name} (${kindLabel(a.type)}): ${await signedUrl(a.path)}`));
  return `${text.trimEnd()}\n\n${lines.join('\n')}`;
}

// Opens WhatsApp with the text ready (staff press Send there) and logs it as "opened".
// Call straight from a click: a tab is opened at once so the browser doesn't block it, then
// pointed at wa.me once attachment links are ready. Throws if nothing could be opened;
// returns logError when WhatsApp opened but the log row couldn't be saved.
export async function openWhatsApp(row: {
  phone: string;
  body: string;
  sent_by: string | null;
  template_id?: string | null;
  lead_id?: string | null;
  customer_id?: string | null;
  order_id?: string | null;
  campaign?: string;
  attachments?: Attachment[];
}): Promise<{ body: string; logError: string | null }> {
  const attachments = row.attachments ?? [];
  const tab = attachments.length ? window.open('', '_blank') : null;
  let body: string;
  try {
    body = await withAttachmentLinks(row.body, attachments);
  } catch (e) {
    tab?.close();
    throw new Error(`Couldn't create the download links: ${(e as Error).message}`);
  }
  const url = whatsappLink(row.phone, body);
  if (tab) {
    tab.opener = null;
    tab.location.href = url;
  } else window.open(url, '_blank', 'noopener');

  const { error } = await supabase.from('messages').insert({
    channel: 'whatsapp',
    status: 'opened',
    to_address: row.phone,
    subject: '',
    body,
    template_id: row.template_id ?? null,
    lead_id: row.lead_id ?? null,
    customer_id: row.customer_id ?? null,
    order_id: row.order_id ?? null,
    campaign: row.campaign ?? '',
    sent_by: row.sent_by,
    ...(attachments.length ? { attachments } : {}),
  });
  return { body, logError: error ? friendlyError(error) : null };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
