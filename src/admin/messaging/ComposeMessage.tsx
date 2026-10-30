import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button, Field, Input, Select, Textarea, useToast } from '../ui';
import { buildVars, fillTemplate, isKnownPlaceholder, leftoverPlaceholders } from './templates';
import { canWhatsApp, EMAIL_RE, loadTemplates, openWhatsApp, sendEmails } from './data';
import { AttachmentPicker, attachmentFolder, removeAttachments } from './attachments';
import { CATEGORY_LABEL, MESSAGE_CATEGORIES, type Attachment, type MessageCategory, type MessageChannel, type MessageContext, type MessageTemplate, type Recipient } from './types';

export interface ComposeMessageProps {
  open: boolean;
  onClose: () => void;
  recipient: Recipient;
  context?: MessageContext;
  defaultCategory?: MessageCategory; // first template of this category is preselected
  defaultTemplateCategory?: MessageCategory; // same as defaultCategory (alias)
  defaultTemplateId?: string; // preselect this exact template
  defaultChannel?: MessageChannel;
  onSent?: (channel: MessageChannel) => void;
}

// Drawer for writing one email / WhatsApp message to a client, starting from a template
export function ComposeMessage(props: ComposeMessageProps) {
  if (!props.open) return null;
  return <ComposeDrawer {...props} />;
}

function ComposeDrawer({ onClose, recipient, context = {}, defaultCategory, defaultTemplateCategory, defaultTemplateId, defaultChannel, onSent }: ComposeMessageProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const email = (recipient.email ?? '').trim();
  const phone = (recipient.phone ?? '').trim();
  const hasEmail = EMAIL_RE.test(email);
  const hasPhone = canWhatsApp(phone);

  const [channel, setChannel] = useState<MessageChannel>(
    defaultChannel === 'whatsapp' && hasPhone ? 'whatsapp' : hasEmail ? 'email' : 'whatsapp',
  );
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [folder] = useState(() => attachmentFolder('proposals', context.order?.id || context.lead?.id || context.customer?.id));
  const sent = useRef(false);
  const latest = useRef<Attachment[]>([]);
  latest.current = attachments;

  // Closing without sending: delete files uploaded for this message
  const close = useCallback(() => {
    if (!sent.current) removeAttachments(latest.current);
    onClose();
  }, [onClose]);

  const senderName = profile?.full_name || profile?.email.split('@')[0] || '';
  const vars = useMemo(
    () => buildVars({ ...context, senderName, recipientName: recipient.name }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context.lead, context.customer, context.order, senderName, recipient.name],
  );

  const applyTemplate = (t: MessageTemplate | undefined) => {
    setTemplateId(t?.id ?? '');
    setSubject(t ? fillTemplate(t.subject, vars) : '');
    setBody(t ? fillTemplate(t.body, vars) : '');
  };

  useEffect(() => {
    loadTemplates()
      .then((list) => {
        setTemplates(list);
        const category = defaultTemplateCategory ?? defaultCategory;
        const wanted = (defaultTemplateId && list.find((t) => t.id === defaultTemplateId)) || (category && list.find((t) => t.category === category));
        applyTemplate(wanted || (category ? undefined : list[0]));
      })
      .catch((e: Error) => {
        setTemplates([]);
        setLoadError(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, close]);

  const ids = {
    template_id: templateId || null,
    lead_id: context.lead?.id ?? null,
    customer_id: context.customer?.id ?? context.order?.customer_id ?? null,
    order_id: context.order?.id ?? null,
  };

  const leftovers = leftoverPlaceholders(`${channel === 'email' ? subject : ''}\n${body}`);
  const confirmLeftovers = () =>
    !leftovers.length ||
    confirm(`The message still contains ${leftovers.map((k) => `{{${k}}}`).join(', ')}. Send it anyway?`);

  const sendEmail = async () => {
    if (!subject.trim()) return toast('Add a subject', true);
    if (!body.trim()) return toast('Write a message', true);
    if (!confirmLeftovers()) return;
    setBusy(true);
    try {
      const res = await sendEmails([{ to: email, subject, body, ...ids, attachments }]);
      const r = res.results[0];
      if (!r?.ok) throw new Error(r?.error || 'The email could not be sent');
      sent.current = true;
      toast(`Email sent to ${recipient.name || email}${attachments.length ? ` with ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}` : ''}`);
      if (!res.logged && res.logError) toast(`Sent, but not logged: ${res.logError}`, true);
      onSent?.('email');
      onClose();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const sendWhatsApp = async () => {
    if (!body.trim()) return toast('Write a message', true);
    if (!confirmLeftovers()) return;
    setBusy(true);
    try {
      const { logError } = await openWhatsApp({ phone, body, sent_by: profile?.id ?? null, ...ids, attachments });
      sent.current = true;
      if (logError) toast(`WhatsApp opened, but it wasn't logged: ${logError}`, true);
      else toast('WhatsApp opened. Press Send there.');
      onSent?.('whatsapp');
      onClose();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const grouped = MESSAGE_CATEGORIES.map((c) => ({ c, list: (templates ?? []).filter((t) => t.category === c) })).filter((g) => g.list.length);

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Send a message">
      <div className="absolute inset-0 bg-black/40" onClick={() => !busy && close()} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-admin-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-medium">Send a message</h2>
            <p className="truncate text-sm text-gray-500">
              To {recipient.name || 'client'}
              {channel === 'email' ? (hasEmail ? ` · ${email}` : '') : hasPhone ? ` · ${phone}` : ''}
            </p>
          </div>
          <button onClick={close} disabled={busy} className="text-gray-400 hover:text-brand-charcoal" aria-label="Close"><X /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="flex overflow-hidden rounded-md border border-brand-charcoal text-sm" role="tablist">
            {([
              ['email', 'Email', Mail, hasEmail, 'No email address'],
              ['whatsapp', 'WhatsApp', MessageCircle, hasPhone, 'No phone number'],
            ] as const).map(([value, label, Icon, enabled, why]) => (
              <button
                key={value}
                role="tab"
                aria-selected={channel === value}
                disabled={!enabled}
                title={enabled ? undefined : why}
                onClick={() => setChannel(value)}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 disabled:cursor-not-allowed disabled:text-gray-400 ${channel === value && enabled ? 'bg-brand-charcoal text-white' : 'bg-white'}`}
              >
                <Icon size={16} /> {label}{!enabled && <span className="text-xs">({why.toLowerCase()})</span>}
              </button>
            ))}
          </div>

          {!hasEmail && !hasPhone && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add an email or phone number for this client first.</p>
          )}
          {loadError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}

          <Field label="Template">
            <Select value={templateId} onChange={(e) => applyTemplate(templates?.find((t) => t.id === e.target.value))} disabled={!templates}>
              <option value="">{templates ? 'Blank message' : 'Loading templates…'}</option>
              {grouped.map(({ c, list }) => (
                <optgroup key={c} label={CATEGORY_LABEL[c]}>
                  {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>

          {channel === 'email' && (
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} />
            </Field>
          )}

          <Field label="Message" hint={channel === 'whatsapp' ? 'WhatsApp opens with this text ready; press Send there.' : 'Sent as a simple branded email. Replies come to your inbox.'}>
            <Textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="font-[inherit] leading-relaxed" />
          </Field>
          <div className="-mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>{body.length.toLocaleString('en-IN')} characters</span>
            <Link to="/messages/templates" className="underline hover:text-brand-charcoal">Manage templates</Link>
          </div>

          <AttachmentPicker
            folder={folder}
            onChange={setAttachments}
            onBusy={setUploading}
            disabled={busy}
            note={channel === 'whatsapp'
              ? 'WhatsApp can’t carry files: the client gets a download link for each file (valid 7 days) added to the message.'
              : 'Attached to the email.'}
          />

          {leftovers.length > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Fill in or remove: {leftovers.map((k) => (
                <code key={k} className="mx-0.5 rounded bg-white px-1">{`{{${k}}}`}</code>
              ))}
              {leftovers.some((k) => !isKnownPlaceholder(k)) && ' (some of these aren’t known placeholders)'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-admin-line px-5 py-4">
          <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
          {channel === 'email' ? (
            <Button onClick={sendEmail} disabled={busy || uploading || !hasEmail}><Send size={16} /> {busy ? 'Sending…' : uploading ? 'Uploading…' : 'Send email'}</Button>
          ) : (
            <Button onClick={sendWhatsApp} disabled={busy || uploading || !hasPhone}><MessageCircle size={16} /> {uploading ? 'Uploading…' : 'Open WhatsApp'}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
