import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAdmin, useAuth } from '../lib/auth';
import { Button, Card, CardTitle, Field, Input, PageHeader, Select, Spinner, useToast } from '../ui';
import { friendlyError, invalidateTemplates, loadTemplates } from './data';
import { PLACEHOLDERS, SAMPLE_VARS, fillTemplate, isKnownPlaceholder, leftoverPlaceholders } from './templates';
import { CATEGORY_LABEL, MESSAGE_CATEGORIES, type MessageCategory, type MessageTemplate } from './types';

// Same look as ui.tsx fields; plain elements here because these need a ref (cursor position)
const FIELD = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/25';

type Draft = Pick<MessageTemplate, 'name' | 'category' | 'subject' | 'body' | 'sort_order'> & { id?: string };

const blank = (sort: number): Draft => ({ name: '', category: 'other', subject: '', body: 'Hi {{first_name}},\n\n\n\nWarm regards,\n{{sender_name}}\nEcotwist', sort_order: sort });

export function Templates() {
  const { profile } = useAuth();
  const canEdit = isAdmin(profile);
  const toast = useToast();
  const [list, setList] = useState<MessageTemplate[] | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [focus, setFocus] = useState<'subject' | 'body'>('body');
  const subjectRef = useRef<HTMLInputElement>(null);

  const load = (selectId?: string) => {
    invalidateTemplates();
    loadTemplates()
      .then((rows) => {
        setList(rows);
        setError('');
        const pick = rows.find((t) => t.id === selectId) ?? rows[0];
        setDraft((d) => (selectId || !d ? (pick ? { ...pick } : null) : d));
      })
      .catch((e: Error) => {
        setList([]);
        setError(e.message);
      });
  };

  useEffect(() => load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => draft && setDraft({ ...draft, [key]: value });

  // Insert {{placeholder}} where the cursor is
  const insert = (key: string) => {
    if (!draft || !canEdit) return;
    const token = `{{${key}}}`;
    const el = focus === 'subject' ? subjectRef.current : bodyRef.current;
    const field = focus === 'subject' ? 'subject' : 'body';
    const value = draft[field];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    set(field, value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) return toast('Give the template a name', true);
    if (!draft.body.trim()) return toast('Write the message', true);
    setSaving(true);
    const { id, ...row } = draft;
    const clean = { ...row, name: row.name.trim(), sort_order: Number(row.sort_order) || 0 };
    const { data, error: err } = id
      ? await supabase.from('message_templates').update(clean).eq('id', id).select('id').single()
      : await supabase.from('message_templates').insert(clean).select('id').single();
    setSaving(false);
    if (err) return toast(friendlyError(err), true);
    toast(id ? 'Template saved' : 'Template added');
    load(data.id);
  };

  const remove = async () => {
    if (!draft?.id || !confirm(`Delete the template "${draft.name}"? Messages already sent stay in the log.`)) return;
    const { error: err } = await supabase.from('message_templates').delete().eq('id', draft.id);
    if (err) return toast(friendlyError(err), true);
    toast('Template deleted');
    setDraft(null);
    load();
  };

  const unknown = draft ? leftoverPlaceholders(`${draft.subject}\n${draft.body}`).filter((k) => !isKnownPlaceholder(k)) : [];

  return (
    <>
      <Link to="/messages" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-olive hover:underline"><ArrowLeft size={14} /> Messages</Link>
      <PageHeader
        eyebrow="Messages"
        title="Templates"
        subtitle={canEdit ? 'Ready-made texts for emails and WhatsApp. Placeholders fill in automatically.' : 'Only an owner or admin can change templates.'}
        actions={canEdit && (
          <Button onClick={() => setDraft(blank(((list ?? []).at(-1)?.sort_order ?? 0) + 10))}><Plus size={16} /> New template</Button>
        )}
      />

      {error && <Card className="mb-4 p-4 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit overflow-hidden">
          {list === null ? (
            <Spinner />
          ) : list.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">No templates yet.</p>
          ) : (
            MESSAGE_CATEGORIES.filter((c) => list.some((t) => t.category === c)).map((c) => (
              <div key={c}>
                <p className="bg-brand-off-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{CATEGORY_LABEL[c]}</p>
                <ul>
                  {list.filter((t) => t.category === c).map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => setDraft({ ...t })}
                        className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-brand-beige ${draft?.id === t.id ? 'bg-brand-beige font-semibold' : ''}`}
                      >
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </Card>

        {draft ? (
          <div className="space-y-6">
            <Card>
              <CardTitle>{draft.id ? (canEdit ? 'Edit template' : draft.name) : 'New template'}</CardTitle>
              <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-[1fr_200px_100px]">
                <Field label="Name"><Input value={draft.name} onChange={(e) => set('name', e.target.value)} disabled={!canEdit} required /></Field>
                <Field label="Category">
                  <Select value={draft.category} onChange={(e) => set('category', e.target.value as MessageCategory)} disabled={!canEdit}>
                    {MESSAGE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  </Select>
                </Field>
                <Field label="Order"><Input type="number" value={draft.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} disabled={!canEdit} /></Field>
                <div className="sm:col-span-3">
                  <Field label="Email subject" hint="Not used for WhatsApp.">
                    <input className={FIELD} ref={subjectRef} value={draft.subject} onFocus={() => setFocus('subject')} onChange={(e) => set('subject', e.target.value)} disabled={!canEdit} />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field label="Message" hint="Plain text. A blank line starts a new paragraph.">
                    <textarea ref={bodyRef} rows={12} value={draft.body} onFocus={() => setFocus('body')} onChange={(e) => set('body', e.target.value)} disabled={!canEdit} className={`${FIELD} leading-relaxed`} />
                  </Field>
                </div>
                {unknown.length > 0 && (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-3">
                    Unknown placeholders (they won’t fill in): {unknown.map((k) => `{{${k}}}`).join(', ')}
                  </p>
                )}
                {canEdit && (
                  <div className="flex gap-2 sm:col-span-3">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : draft.id ? 'Save template' : 'Add template'}</Button>
                    {draft.id && <Button type="button" variant="danger" onClick={remove}><Trash2 size={16} /> Delete</Button>}
                  </div>
                )}
              </form>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
              <Card>
                <CardTitle>Preview</CardTitle>
                <div className="p-5 text-sm">
                  <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Subject</p>
                  <p className="mb-4 font-semibold">{fillTemplate(draft.subject, SAMPLE_VARS) || <span className="font-normal text-gray-400">(none)</span>}</p>
                  <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Message</p>
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{fillTemplate(draft.body, SAMPLE_VARS)}</p>
                  <p className="mt-4 text-xs text-gray-500">Shown with sample data.</p>
                </div>
              </Card>
              <Card className="h-fit">
                <CardTitle>Placeholders</CardTitle>
                <ul className="divide-y divide-gray-100 text-sm">
                  {PLACEHOLDERS.map((p) => (
                    <li key={p.key}>
                      <button type="button" onClick={() => insert(p.key)} disabled={!canEdit}
                        className="block w-full px-4 py-2 text-left enabled:hover:bg-brand-off-white disabled:cursor-default"
                        title={canEdit ? 'Insert at the cursor' : undefined}>
                        <code className="text-xs font-semibold text-brand-olive">{`{{${p.key}}}`}</code>
                        <span className="block text-xs text-gray-500">{p.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {canEdit && <p className="border-t border-admin-line px-4 py-3 text-xs text-gray-500">Click one to insert it where the cursor is.</p>}
              </Card>
            </div>
          </div>
        ) : (
          list && !error && <Card className="p-8 text-center text-sm text-gray-500">Choose a template on the left{canEdit ? ', or add a new one' : ''}.</Card>
        )}
      </div>
    </>
  );
}
