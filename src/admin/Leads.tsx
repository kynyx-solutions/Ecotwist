import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, Phone, Send, Trash2, UserPlus } from 'lucide-react';
import { supabase } from './lib/supabase';
import { isAdmin, useAuth } from './lib/auth';
import { staffName, useStaff } from './lib/staff';
import { LEAD_SOURCES, LEAD_STATUSES, type Lead, type LeadNote, type LeadSource, type LeadStatus } from './lib/types';
import { whatsappNumber } from './Customers';
import { ComposeMessage, MessageHistory } from './messaging/routes';
import {
  Button, Card, CardTitle, Field, Input, PageHeader, Select, SOURCE_LABEL, Spinner, StatusBadge, STATUS_LABEL, Tag, Textarea,
  followUpLabel, formatDate, timeAgo, useToast,
} from './ui';

const BOARD_STAGES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const OPEN_STAGES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal'];

const TYPE_LABEL: Record<string, string> = { contact: 'Contact form', proposal: 'Get Proposal', newsletter: 'Newsletter', manual: 'Added by hand' };

// What the lead is after, in one line
export const leadSummary = (l: Lead) =>
  [l.occasion || l.interest || l.product, l.quantity && `${l.quantity} pcs`, l.budget, l.city].filter(Boolean).join(' · ');

const searchFilter = (q: string) => {
  const term = q.replace(/[,()%]/g, ' ').trim();
  return ['name', 'email', 'company', 'phone', 'city'].map((c) => `${c}.ilike.%${term}%`).join(',');
};

/* ── Board + list ─────────────────────────────────────────────── */

export function LeadList() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 'list' : 'board';
  const owner = params.get('owner') ?? '';
  const source = params.get('source') ?? '';
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const [rows, setRows] = useState<Lead[] | null>(null);
  const [search, setSearch] = useState(q);
  const [dragging, setDragging] = useState<string | null>(null);
  const staff = useStaff();
  const toast = useToast();

  const load = useCallback(() => {
    let query = supabase.from('leads').select('*').neq('type', 'newsletter');
    if (owner === 'none') query = query.is('assigned_to', null);
    else if (owner) query = query.eq('assigned_to', owner);
    if (source) query = query.eq('source', source);
    if (status) query = query.eq('status', status);
    if (q.trim()) query = query.or(searchFilter(q));
    query
      .order('follow_up_on', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) toast(error.message, true);
        setRows((data as Lead[]) ?? []);
      });
  }, [owner, source, status, q, toast]);

  useEffect(load, [load]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const moveTo = async (id: string, stage: LeadStatus) => {
    const lead = rows?.find((l) => l.id === id);
    if (!lead || lead.status === stage) return;
    setRows((r) => r!.map((l) => (l.id === id ? { ...l, status: stage } : l)));
    const { error } = await supabase.from('leads').update({ status: stage }).eq('id', id);
    if (error) {
      toast(error.message, true);
      load();
    } else toast(`${lead.name || lead.email} → ${STATUS_LABEL[stage]}`);
  };

  const exportCsv = () => {
    const cols = ['created_at', 'type', 'source', 'status', 'name', 'company', 'email', 'phone', 'city', 'interest', 'occasion', 'product', 'budget', 'quantity', 'branding', 'next_action', 'follow_up_on', 'message'] as const;
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...(rows ?? []).map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `ecotwist-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const open = (rows ?? []).filter((l) => OPEN_STAGES.includes(l.status)).length;

  return (
    <>
      <PageHeader
        eyebrow={`Business · ${open} open ${open === 1 ? 'lead' : 'leads'}`}
        title="Leads"
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
            <Link to="/leads/new"><Button className="uppercase tracking-wider">+ New lead</Button></Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex overflow-hidden rounded-md border border-brand-charcoal">
          {(['board', 'list'] as const).map((v) => (
            <button key={v} onClick={() => update('view', v === 'board' ? '' : v)}
              className={`px-4 py-2 capitalize ${view === v ? 'bg-brand-charcoal text-white' : 'bg-white'}`}>{v}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-gray-600">Owner
          <Select value={owner} onChange={(e) => update('owner', e.target.value)} className="!w-40 !py-2">
            <option value="">Everyone</option>
            <option value="none">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-gray-600">Source
          <Select value={source} onChange={(e) => update('source', e.target.value)} className="!w-40 !py-2">
            <option value="">All sources</option>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </Select>
        </label>
        {view === 'list' && (
          <label className="flex items-center gap-2 text-gray-600">Stage
            <Select value={status} onChange={(e) => update('status', e.target.value)} className="!w-40 !py-2">
              <option value="">All stages</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </label>
        )}
        <form onSubmit={(e) => { e.preventDefault(); update('q', search); }} className="ml-auto w-full sm:w-64">
          <Input placeholder="Search name, company or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      {rows === null ? (
        <Spinner />
      ) : view === 'board' ? (
        <>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            {BOARD_STAGES.map((stage) => {
              const cards = rows.filter((l) => l.status === stage);
              return (
                <section
                  key={stage}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e: DragEvent) => { e.preventDefault(); if (dragging) moveTo(dragging, stage); setDragging(null); }}
                  className={`w-72 shrink-0 rounded-lg border-t-2 bg-admin-muted p-3 ${stage === 'won' ? 'border-[#5C7A4A]' : stage === 'lost' ? 'border-gray-400' : 'border-[#8A7A55]'}`}
                >
                  <h2 className="mb-3 flex justify-between px-1 text-xs font-semibold uppercase tracking-[0.12em]">
                    {STATUS_LABEL[stage]} <span className="text-gray-500">{cards.length}</span>
                  </h2>
                  <div className="space-y-3">
                    {cards.map((l) => <LeadCard key={l.id} lead={l} owner={staffName(staff, l.assigned_to)} onDragStart={() => setDragging(l.id)} />)}
                    {cards.length === 0 && <p className="px-1 pb-2 text-xs text-gray-500">Drop a lead here</p>}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-gray-500">Drag a card to change its stage. Open a card to set the owner, next step and follow-up date.</p>
        </>
      ) : (
        <Card className="overflow-hidden">
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">No leads match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.1em] text-gray-600">
                  <tr className="border-b border-admin-line">
                    <th className="px-5 py-3 font-semibold">Name</th><th className="px-5 py-3 font-semibold">Looking for</th>
                    <th className="px-5 py-3 font-semibold">Source</th><th className="px-5 py-3 font-semibold">Stage</th>
                    <th className="px-5 py-3 font-semibold">Owner</th><th className="px-5 py-3 font-semibold">Next step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {rows.map((l) => {
                    const due = followUpLabel(l.follow_up_on);
                    return (
                      <tr key={l.id} className="hover:bg-admin-bg">
                        <td className="px-5 py-3">
                          <Link to={`/leads/${l.id}`} className="font-medium hover:underline">{l.name || l.email}</Link>
                          <p className="text-xs text-gray-500">{l.company || timeAgo(l.created_at)}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-700">{leadSummary(l) || '—'}</td>
                        <td className="px-5 py-3 text-gray-700">{SOURCE_LABEL[l.source]}</td>
                        <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                        <td className="px-5 py-3 text-gray-700">{staffName(staff, l.assigned_to)}</td>
                        <td className={`px-5 py-3 ${due?.overdue ? 'text-red-700' : 'text-gray-700'}`}>
                          {l.next_action}{due && <span>{l.next_action ? ' · ' : ''}{due.text}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function LeadCard({ lead: l, owner, onDragStart }: { lead: Lead; owner: string; onDragStart: () => void }) {
  const due = followUpLabel(l.follow_up_on);
  const next = l.next_action || (l.status === 'new' ? 'Call' : '');
  return (
    <Link
      to={`/leads/${l.id}`}
      draggable
      onDragStart={onDragStart}
      className="block cursor-grab rounded-lg border border-admin-line bg-white p-3.5 shadow-sm transition hover:border-brand-gold active:cursor-grabbing"
    >
      <p className="font-medium">{l.name || l.email}</p>
      <p className="mt-0.5 text-sm text-gray-600">{[l.company, leadSummary(l)].filter(Boolean).join(' · ') || timeAgo(l.created_at)}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Tag>{SOURCE_LABEL[l.source]}</Tag>
        <span className="truncate text-xs text-gray-500">{owner}</span>
      </div>
      {(next || due) && (
        <p className={`mt-2 text-sm font-medium ${due?.overdue ? 'text-red-700' : 'text-[#3E4A2A]'}`}>
          {due?.overdue ? due.text : [next, due?.text].filter(Boolean).join(' · ')}
        </p>
      )}
    </Link>
  );
}

/* ── New lead (typed in by hand) ──────────────────────────────── */

export function NewLead() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const staff = useStaff();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', city: '', source: 'whatsapp' as LeadSource, occasion: '', quantity: '', budget: '',
    message: '', next_action: 'Call', follow_up_on: new Date().toISOString().slice(0, 10), assigned_to: profile?.id ?? '',
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) return toast('Add at least a name, phone or email', true);
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...form, type: 'manual', assigned_to: form.assigned_to || null, follow_up_on: form.follow_up_on || null })
      .select('id')
      .single();
    if (error) return toast(error.message, true);
    toast('Lead added');
    navigate(`/leads/${data.id}`, { replace: true });
  };

  return (
    <>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-olive hover:underline"><ArrowLeft size={14} /> All leads</Link>
      <PageHeader eyebrow="Business · Leads" title="New lead" subtitle="For enquiries that came by phone, WhatsApp, referral or at an event" />
      <Card className="p-6">
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={form.name} onChange={set('name')} autoFocus /></Field>
          <Field label="Company"><Input value={form.company} onChange={set('company')} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
          <Field label="Where did they come from?">
            <Select value={form.source} onChange={set('source')}>{LEAD_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}</Select>
          </Field>
          <Field label="Occasion"><Input value={form.occasion} onChange={set('occasion')} placeholder="e.g. Diwali gifting" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity"><Input value={form.quantity} onChange={set('quantity')} placeholder="e.g. 150" /></Field>
            <Field label="Budget per gift"><Input value={form.budget} onChange={set('budget')} placeholder="e.g. ₹800" /></Field>
          </div>
          <div className="sm:col-span-2"><Field label="What they told us"><Textarea rows={3} value={form.message} onChange={set('message')} /></Field></div>
          <Field label="Owner">
            <Select value={form.assigned_to} onChange={set('assigned_to')}>
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Next step"><Input value={form.next_action} onChange={set('next_action')} /></Field>
            <Field label="Follow up on"><Input type="date" value={form.follow_up_on} onChange={set('follow_up_on')} /></Field>
          </div>
          <div className="sm:col-span-2"><Button type="submit">Add lead</Button></div>
        </form>
      </Card>
    </>
  );
}

/* ── Detail ───────────────────────────────────────────────────── */

export function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const staff = useStaff();
  const toast = useToast();
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [note, setNote] = useState('');
  const [plan, setPlan] = useState({ next_action: '', follow_up_on: '' });
  const [composing, setComposing] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from('lead_notes')
      .select('*, author:profiles(full_name, email)')
      .eq('lead_id', id)
      .order('created_at', { ascending: true });
    setNotes((data as LeadNote[]) ?? []);
  }, [id]);

  useEffect(() => {
    supabase.from('leads').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      const l = (data as Lead) ?? null;
      setLead(l);
      if (l) setPlan({ next_action: l.next_action, follow_up_on: l.follow_up_on ?? '' });
    });
    loadNotes();
  }, [id, loadNotes]);

  if (lead === undefined) return <Spinner />;
  if (lead === null) return <p className="text-sm text-gray-500">This lead doesn't exist (it may have been deleted). <Link to="/leads" className="underline">All leads</Link></p>;

  const patch = async (changes: Partial<Lead>, message: string) => {
    const { error } = await supabase.from('leads').update(changes).eq('id', lead.id);
    if (error) return toast(error.message, true);
    setLead({ ...lead, ...changes });
    toast(message);
  };

  const addNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    const { error } = await supabase.from('lead_notes').insert({ lead_id: lead.id, author_id: profile?.id, body: note.trim() });
    if (error) return toast(error.message, true);
    setNote('');
    loadNotes();
  };

  // Opens the customer made from this lead, creating it the first time
  const saveAsCustomer = async () => {
    const { data: existing } = await supabase.from('customers').select('id').eq('source_lead_id', lead.id).maybeSingle();
    if (existing) return navigate(`/customers/${existing.id}`);
    const { data, error } = await supabase
      .from('customers')
      .insert({ name: lead.name || lead.email, company: lead.company, email: lead.email, phone: lead.phone, city: lead.city, source_lead_id: lead.id })
      .select('id')
      .single();
    if (error) return toast(error.message, true);
    if (OPEN_STAGES.slice(0, 2).includes(lead.status)) await supabase.from('leads').update({ status: 'qualified' }).eq('id', lead.id);
    toast('Customer created');
    navigate(`/customers/${data.id}`);
  };

  const remove = async () => {
    if (!confirm(`Delete this lead from ${lead.name || lead.email}? This can't be undone.`)) return;
    const { error } = await supabase.from('leads').delete().eq('id', lead.id);
    if (error) return toast(error.message, true);
    toast('Lead deleted');
    navigate('/leads');
  };

  const details: [string, string][] = (
    [
      ['Company', lead.company], ['Email', lead.email], ['Phone', lead.phone], ['City', lead.city],
      ['Interested in', lead.interest], ['Occasion', lead.occasion], ['Product', lead.product],
      ['Budget per gift', lead.budget], ['Quantity', lead.quantity], ['Branding', lead.branding],
      ['Submission ID', lead.submission_id], ['From page', lead.source_page],
    ] as [string, string][]
  ).filter(([, v]) => v);

  const due = followUpLabel(lead.follow_up_on);

  return (
    <>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-olive hover:underline"><ArrowLeft size={14} /> All leads</Link>
      <PageHeader
        eyebrow={`${TYPE_LABEL[lead.type]} · received ${formatDate(lead.created_at)}`}
        title={lead.name || lead.email}
        actions={
          <>
            {(lead.email || lead.phone) && <Button onClick={() => setComposing(true)}><Send size={16} /> Send message</Button>}
            {lead.phone && <a href={`tel:${lead.phone}`}><Button variant="secondary"><Phone size={16} /> Call</Button></a>}
            {lead.phone && <a href={`https://wa.me/${whatsappNumber(lead.phone)}`} target="_blank" rel="noreferrer"><Button className="!bg-[#1F7A43] hover:!bg-[#196638]"><MessageCircle size={16} /> WhatsApp</Button></a>}
            {lead.email && <a href={`mailto:${lead.email}`}><Button variant="secondary"><Mail size={16} /> Email</Button></a>}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-[0.1em] text-gray-500">{k}</dt>
                  <dd className="break-words text-sm">{v}</dd>
                </div>
              ))}
            </dl>
            {lead.message && (
              <div className="mt-5 border-t border-admin-line pt-4">
                <p className="text-xs uppercase tracking-[0.1em] text-gray-500">What they told us</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{lead.message}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>Notes</CardTitle>
            <div className="p-5">
              {notes.length === 0 && <p className="mb-3 text-sm text-gray-500">No notes yet. Write down calls, quotes sent and what was agreed.</p>}
              <ul className="mb-4 space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-admin-bg p-3">
                    <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                    <p className="mt-1 text-xs text-gray-500">{n.author?.full_name || n.author?.email || 'Someone'} · {formatDate(n.created_at)}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={addNote} className="space-y-2">
                <Textarea rows={3} placeholder="e.g. Called, sending quote for 120 hampers by Friday" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button type="submit" disabled={!note.trim()}>Add note</Button>
              </form>
            </div>
          </Card>

          <MessageHistory leadId={lead.id} refreshKey={sentCount} />
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <Field label="Stage">
              <Select value={lead.status} onChange={(e) => patch({ status: e.target.value as LeadStatus }, `Moved to ${STATUS_LABEL[e.target.value as LeadStatus]}`)}>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </Select>
            </Field>
            <Field label="Owner">
              <Select value={lead.assigned_to ?? ''} onChange={(e) => patch({ assigned_to: e.target.value || null }, `Owner: ${staffName(staff, e.target.value || null)}`)}>
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
              </Select>
            </Field>
            <Field label="Source">
              <Select value={lead.source} onChange={(e) => patch({ source: e.target.value as LeadSource }, 'Source saved')}>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
              </Select>
            </Field>
            <p className="text-xs text-gray-500">Last updated {timeAgo(lead.updated_at)}</p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 font-serif text-2xl font-medium">Follow-up</h2>
            {due && <p className={`mb-3 text-sm ${due.overdue ? 'text-red-700' : 'text-gray-600'}`}>{due.overdue ? due.text : `Due ${due.text}`}</p>}
            <form
              onSubmit={(e) => { e.preventDefault(); patch({ next_action: plan.next_action.trim(), follow_up_on: plan.follow_up_on || null }, 'Follow-up saved'); }}
              className="space-y-3"
            >
              <Field label="Next step"><Input value={plan.next_action} onChange={(e) => setPlan({ ...plan, next_action: e.target.value })} placeholder="e.g. Send quote" /></Field>
              <Field label="On"><Input type="date" value={plan.follow_up_on} onChange={(e) => setPlan({ ...plan, follow_up_on: e.target.value })} /></Field>
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                {lead.follow_up_on && (
                  <Button type="button" variant="secondary" onClick={() => { setPlan({ next_action: '', follow_up_on: '' }); patch({ next_action: '', follow_up_on: null }, 'Marked done'); }}>
                    Done
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {lead.type !== 'newsletter' && (
            <Button variant="secondary" onClick={saveAsCustomer} className="w-full"><UserPlus size={16} /> Save as customer</Button>
          )}
          {isAdmin(profile) && (
            <Button variant="danger" onClick={remove} className="w-full"><Trash2 size={16} /> Delete lead</Button>
          )}
        </div>
      </div>

      <ComposeMessage
        open={composing}
        onClose={() => setComposing(false)}
        recipient={{ name: lead.name || lead.email, email: lead.email, phone: lead.phone }}
        context={{ lead }}
        defaultCategory="follow_up"
        onSent={() => {
          setSentCount((n) => n + 1);
          // Reaching out moves a fresh lead along
          if (lead.status === 'new') patch({ status: 'contacted' }, 'Moved to Contacted');
        }}
      />
    </>
  );
}
