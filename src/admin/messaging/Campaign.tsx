import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Mail, MessageCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Customer } from '../lib/types';
import { Button, Card, CardTitle, Field, Input, PageHeader, Select, Spinner, Textarea, useToast } from '../ui';
import { canWhatsApp, EMAIL_RE, friendlyError, loadTemplates, openWhatsApp, sendEmails } from './data';
import { buildVars, fillTemplate, isKnownPlaceholder, leftoverPlaceholders } from './templates';
import { AttachmentPicker, attachmentFolder } from './attachments';
import { CATEGORY_LABEL, MESSAGE_CATEGORIES, type Attachment, type MessageChannel, type MessageTemplate } from './types';

type Person = Pick<Customer, 'id' | 'name' | 'company' | 'email' | 'phone' | 'city'>;
type Outcome = { id: string; name: string; to: string; ok: boolean; error?: string };

const hasEmail = (p: Person) => EMAIL_RE.test((p.email ?? '').trim());
const hasPhone = (p: Person) => canWhatsApp(p.phone);

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{done} of {total} done</span><span>{pct}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-admin-muted">
        <div className="h-full rounded-full bg-brand-olive transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// "Send wishes / bulk message" to customers by email (sent for you) or WhatsApp (one tap each)
export function Campaign() {
  const { profile } = useAuth();
  const toast = useToast();
  const senderName = profile?.full_name || profile?.email.split('@')[0] || '';

  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [campaign, setCampaign] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [channel, setChannel] = useState<MessageChannel>('email');

  const [people, setPeople] = useState<Person[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [city, setCity] = useState('');
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [onlyPhone, setOnlyPhone] = useState(false);
  const [search, setSearch] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const [folder] = useState(() => attachmentFolder('campaigns', null));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // Email run
  const [phase, setPhase] = useState<'idle' | 'sending' | 'done'>('idle');
  const [sentCount, setSentCount] = useState(0);
  const [runTotal, setRunTotal] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [stopped, setStopped] = useState('');

  // WhatsApp queue
  const [queueOn, setQueueOn] = useState(false);
  const [waDone, setWaDone] = useState<Set<string>>(new Set());

  const chooseTemplate = (t: MessageTemplate | undefined) => {
    setTemplateId(t?.id ?? '');
    setSubject(t?.subject ?? '');
    setBody(t?.body ?? '');
    if (!nameTouched) setCampaign(t ? `${t.name} ${new Date().getFullYear()}` : '');
  };

  useEffect(() => {
    loadTemplates()
      .then((list) => {
        setTemplates(list);
        chooseTemplate(list.find((t) => t.category === 'wishes') ?? list[0]);
      })
      .catch((e: Error) => {
        setTemplates([]);
        setLoadError(e.message);
      });
    supabase.from('customers').select('id, name, company, email, phone, city').order('name').limit(5000)
      .then(({ data, error }) => {
        if (error) setLoadError(friendlyError(error));
        setPeople((data as Person[]) ?? []);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cities = useMemo(
    () => [...new Set((people ?? []).map((p) => (p.city ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [people],
  );

  const base = (people ?? []).filter((p) =>
    (!city || (p.city ?? '').trim().toLowerCase() === city.toLowerCase()) && (!onlyEmail || hasEmail(p)) && (!onlyPhone || hasPhone(p)));
  const eligible = base.filter(channel === 'email' ? hasEmail : hasPhone);
  const skipped = base.length - eligible.length;
  const selected = eligible.filter((p) => !excluded.has(p.id));
  const term = search.trim().toLowerCase();
  const shown = term ? eligible.filter((p) => [p.name, p.company, p.email, p.phone, p.city].some((v) => v?.toLowerCase().includes(term))) : eligible;

  const varsFor = (p: Person) => buildVars({ customer: p, senderName });
  const fill = (text: string, p: Person) => fillTemplate(text, varsFor(p), { blankMissing: true });
  const first = selected[0];

  // Placeholders some people have no data for (left blank), and unknown ones (left as typed)
  const textAll = `${channel === 'email' ? subject : ''}\n${body}`;
  const unknown = leftoverPlaceholders(textAll).filter((k) => !isKnownPlaceholder(k));
  const missingCount = selected.filter((p) => leftoverPlaceholders(fillTemplate(textAll, varsFor(p))).some(isKnownPlaceholder)).length;

  const locked = phase !== 'idle' || queueOn;
  const toggle = (id: string) => setExcluded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  /* ── Email ── */
  const sendAll = async () => {
    if (!campaign.trim()) return toast('Give this send a name', true);
    if (!subject.trim() || !body.trim()) return toast('Add a subject and a message', true);
    if (!selected.length) return toast('Nobody selected', true);
    const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('campaign', campaign.trim()).eq('channel', 'email').eq('status', 'sent');
    const again = count ? `\n\n${count} emails were already sent under "${campaign.trim()}". Send again?` : '';
    if (!confirm(`Send "${campaign.trim()}" by email to ${selected.length} ${selected.length === 1 ? 'person' : 'people'}?${again}`)) return;

    const queue = [...selected];
    const size = attachments.length ? 5 : 50; // files go one email at a time on the server
    setPhase('sending');
    setRunTotal(queue.length);
    setSentCount(0);
    setOutcomes([]);
    setStopped('');
    const all: Outcome[] = [];
    for (let i = 0; i < queue.length; i += size) {
      const chunk = queue.slice(i, i + size);
      try {
        const res = await sendEmails(
          chunk.map((p) => ({ to: (p.email ?? '').trim(), subject: fill(subject, p), body: fill(body, p), customer_id: p.id, template_id: templateId || null })),
          campaign.trim(),
          attachments,
        );
        res.results.forEach((r, j) => all.push({ id: chunk[j].id, name: chunk[j].name, to: r.to, ok: r.ok, error: r.error }));
        if (!res.logged && res.logError && i === 0) toast(`Emails go out, but aren't logged: ${res.logError}`, true);
      } catch (e) {
        setStopped((e as Error).message);
        break;
      }
      setOutcomes([...all]);
      setSentCount(all.length);
    }
    setOutcomes([...all]);
    setPhase('done');
  };

  /* ── WhatsApp ── */
  const startQueue = async () => {
    if (!campaign.trim()) return toast('Give this send a name', true);
    if (!body.trim()) return toast('Write a message', true);
    // Resume: people already done under this name
    const { data } = await supabase.from('messages').select('customer_id')
      .eq('campaign', campaign.trim()).eq('channel', 'whatsapp').not('customer_id', 'is', null).limit(5000);
    setWaDone(new Set((data ?? []).map((r: { customer_id: string }) => r.customer_id)));
    setQueueOn(true);
  };

  const openFor = async (p: Person) => {
    try {
      const { logError } = await openWhatsApp({
        phone: p.phone ?? '', body: fill(body, p), sent_by: profile?.id ?? null,
        customer_id: p.id, template_id: templateId || null, campaign: campaign.trim(), attachments,
      });
      setWaDone((s) => new Set(s).add(p.id));
      if (logError) toast(`Opened, but not logged: ${logError}`, true);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const reset = () => {
    setPhase('idle');
    setOutcomes([]);
    setStopped('');
    setQueueOn(false);
  };

  if (!templates || !people) return <Spinner />;

  const grouped = MESSAGE_CATEGORIES.map((c) => ({ c, list: templates.filter((t) => t.category === c) })).filter((g) => g.list.length);
  const waCount = selected.filter((p) => waDone.has(p.id)).length;
  const failed = outcomes.filter((o) => !o.ok);

  return (
    <>
      <Link to="/messages" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-olive hover:underline"><ArrowLeft size={14} /> Messages</Link>
      <PageHeader eyebrow="Messages" title="Send wishes" subtitle="One message to many customers: festival wishes, announcements, reminders." />

      {loadError && <Card className="mb-4 p-4 text-sm text-red-700">{loadError}</Card>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardTitle>1. Message</CardTitle>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Template">
                <Select value={templateId} onChange={(e) => chooseTemplate(templates.find((t) => t.id === e.target.value))} disabled={locked}>
                  <option value="">Blank message</option>
                  {grouped.map(({ c, list }) => (
                    <optgroup key={c} label={CATEGORY_LABEL[c]}>{list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
                  ))}
                </Select>
              </Field>
              <Field label="Name of this send" hint="Shown in the log, e.g. Diwali wishes 2026">
                <Input value={campaign} onChange={(e) => { setCampaign(e.target.value); setNameTouched(true); }} disabled={locked} maxLength={160} />
              </Field>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">Send by</span>
                <div className="flex overflow-hidden rounded-md border border-brand-charcoal text-sm">
                  {([['email', 'Email', Mail], ['whatsapp', 'WhatsApp', MessageCircle]] as const).map(([v, label, Icon]) => (
                    <button key={v} type="button" disabled={locked} onClick={() => setChannel(v)}
                      className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 disabled:cursor-not-allowed ${channel === v ? 'bg-brand-charcoal text-white' : 'bg-white'}`}>
                      <Icon size={16} /> {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {channel === 'email' ? 'Emails are sent for you, each person gets their own.' : 'You open each chat and press Send in WhatsApp; we keep track of who’s done.'}
                </p>
              </div>
              {channel === 'email' && (
                <div className="sm:col-span-2">
                  <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={locked} maxLength={300} /></Field>
                </div>
              )}
              <div className="sm:col-span-2">
                <Field label="Message" hint="Placeholders like {{first_name}} are filled in for each person; missing details are left out.">
                  <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} disabled={locked} className="leading-relaxed" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <AttachmentPicker folder={folder} onChange={setAttachments} onBusy={setUploading} disabled={locked}
                  note={channel === 'whatsapp' ? 'WhatsApp can’t carry files: each person gets a download link (valid 7 days) in the message.' : 'Attached to every email.'} />
              </div>
              {(unknown.length > 0 || missingCount > 0) && (
                <div className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
                  {unknown.length > 0 && <p>Unknown placeholders will be sent as typed: {unknown.map((k) => `{{${k}}}`).join(', ')}</p>}
                  {missingCount > 0 && <p>{missingCount} of {selected.length} people are missing a detail used in the message (e.g. company); it’s left out for them. Check the wording still reads well.</p>}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle>2. Who gets it</CardTitle>
            <div className="grid gap-3 border-b border-admin-line p-5 sm:grid-cols-[1fr_1fr]">
              <Field label="City">
                <Select value={city} onChange={(e) => setCity(e.target.value)} disabled={locked}>
                  <option value="">All cities</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <div className="flex flex-col justify-end gap-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-olive" checked={onlyEmail} disabled={locked} onChange={(e) => setOnlyEmail(e.target.checked)} /> Only people with an email</label>
                <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-olive" checked={onlyPhone} disabled={locked} onChange={(e) => setOnlyPhone(e.target.checked)} /> Only people with a phone number</label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <p className="font-semibold">{selected.length} of {eligible.length} selected</p>
              {skipped > 0 && <p className="text-gray-500">· {skipped} skipped (no {channel === 'email' ? 'email' : 'phone number'})</p>}
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" className="!px-2 !py-1" disabled={locked} onClick={() => setExcluded(new Set())}>All</Button>
                <Button variant="ghost" className="!px-2 !py-1" disabled={locked} onClick={() => setExcluded(new Set(eligible.map((p) => p.id)))}>None</Button>
              </div>
            </div>
            {eligible.length > 8 && (
              <div className="px-5 pb-3"><Input placeholder="Find someone…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            )}
            {eligible.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-gray-500">{people.length ? 'Nobody matches.' : 'No customers yet.'}</p>
            ) : (
              <ul className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto border-t border-admin-line">
                {shown.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-5 py-2 text-sm hover:bg-brand-off-white">
                      <input type="checkbox" className="h-4 w-4 accent-brand-olive" checked={!excluded.has(p.id)} disabled={locked} onChange={() => toggle(p.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}{p.company && <span className="font-normal text-gray-500"> · {p.company}</span>}</span>
                        <span className="block truncate text-xs text-gray-500">{channel === 'email' ? p.email : p.phone}{p.city && ` · ${p.city}`}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardTitle>3. {channel === 'email' ? 'Preview & send' : 'Send on WhatsApp'}</CardTitle>
            <div className="space-y-4 p-5 text-sm">
              {!first ? (
                <p className="text-gray-500">Select at least one person.</p>
              ) : channel === 'email' ? (
                <>
                  {phase === 'idle' && (
                    <div className="rounded-lg border border-admin-line bg-brand-off-white p-4">
                      <p className="text-xs text-gray-500">To {first.name} · {first.email}</p>
                      <p className="mt-2 font-semibold">{fill(subject, first)}</p>
                      <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">{fill(body, first)}</p>
                      {attachments.length > 0 && <p className="mt-2 text-xs text-gray-500">+ {attachments.map((a) => a.name).join(', ')}</p>}
                    </div>
                  )}
                  {phase !== 'idle' && <Progress done={sentCount} total={runTotal} />}
                  {phase === 'done' && (
                    <div className="space-y-2">
                      <p className="font-semibold">
                        {outcomes.length - failed.length} sent{failed.length > 0 && `, ${failed.length} failed`}
                        {outcomes.length < runTotal && `, ${runTotal - outcomes.length} not sent`}
                      </p>
                      {stopped && <p className="rounded-lg bg-red-50 p-3 text-red-700">Stopped: {stopped}</p>}
                      {failed.length > 0 && (
                        <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-red-700">
                          {failed.map((f) => <li key={f.id}>{f.name} ({f.to}): {f.error}</li>)}
                        </ul>
                      )}
                      <p className="text-xs text-gray-500">Everything is in the <Link to={`/messages?campaign=${encodeURIComponent(campaign.trim())}`} className="underline">message log</Link>.</p>
                    </div>
                  )}
                  {phase === 'idle' ? (
                    <Button className="w-full" onClick={sendAll} disabled={uploading || !selected.length}>
                      <Send size={16} /> {uploading ? 'Uploading…' : `Send to ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`}
                    </Button>
                  ) : phase === 'done' ? (
                    <Button variant="secondary" className="w-full" onClick={reset}>Start a new send</Button>
                  ) : (
                    <p className="text-center text-xs text-gray-500">Sending… keep this page open.</p>
                  )}
                </>
              ) : !queueOn ? (
                <>
                  <div className="rounded-lg border border-admin-line bg-brand-off-white p-4">
                    <p className="text-xs text-gray-500">To {first.name} · {first.phone}</p>
                    <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">{fill(body, first)}</p>
                    {attachments.length > 0 && <p className="mt-2 text-xs text-gray-500">+ download links for {attachments.map((a) => a.name).join(', ')}</p>}
                  </div>
                  <Button className="w-full" onClick={startQueue} disabled={uploading}><MessageCircle size={16} /> Start WhatsApp list ({selected.length})</Button>
                </>
              ) : (
                <>
                  <Progress done={waCount} total={selected.length} />
                  <ul className="max-h-[480px] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-admin-line">
                    {selected.map((p) => {
                      const done = waDone.has(p.id);
                      return (
                        <li key={p.id} className={`flex items-center gap-3 px-3 py-2 ${done ? 'bg-brand-off-white' : ''}`}>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate font-medium ${done ? 'text-gray-500' : ''}`}>{p.name}</span>
                            <span className="block truncate text-xs text-gray-500">{p.phone}</span>
                          </span>
                          {done ? (
                            <button onClick={() => openFor(p)} className="inline-flex items-center gap-1 text-xs text-brand-olive hover:underline" title="Open again"><Check size={14} /> Done</button>
                          ) : (
                            <Button variant="secondary" className="!px-3 !py-1.5" onClick={() => openFor(p)}><MessageCircle size={14} /> Open WhatsApp</Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <Button variant="ghost" className="w-full" onClick={reset}>Back to editing</Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
