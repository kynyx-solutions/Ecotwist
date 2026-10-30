import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, ExternalLink, ImageOff, Send, Trash2, Undo2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAdmin, useAuth } from '../lib/auth';
import { Button, Card, CardTitle, Field, Input, PageHeader, Spinner, Textarea, timeAgo, useToast } from '../ui';
import { SLUG_PATTERN, formatDay, isMissingTable, postState, slugify, type Post } from '../../lib/blog';
import { BlogSetupNotice, StatePill, uploadBlogImage } from './shared';
import { RichEditor } from './RichEditor';
import { SITE_HOST, SeoPanel } from './SeoPanel';
import { scoreArticle } from './seoScore';


type Form = Pick<Post, 'title' | 'slug' | 'excerpt' | 'body' | 'cover_image' | 'cover_alt' | 'tags' | 'author_name' | 'seo_title' | 'seo_description' | 'focus_keyword' | 'og_image' | 'noindex'>;

const EMPTY: Form = { title: '', slug: '', excerpt: '', body: '', cover_image: '', cover_alt: '', tags: [], author_name: '', seo_title: '', seo_description: '',
  focus_keyword: '', og_image: '', noindex: false };

const toForm = (p: Post): Form => ({
  title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body, cover_image: p.cover_image, cover_alt: p.cover_alt,
  tags: p.tags ?? [], author_name: p.author_name, seo_title: p.seo_title, seo_description: p.seo_description,
  focus_keyword: p.focus_keyword ?? '', og_image: p.og_image ?? '', noindex: !!p.noindex,
});

// ISO → value for <input type="datetime-local"> (local time)
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });


// Remount per article so /blog/new → /blog/:id (and back) starts clean
export function BlogEditor() {
  const { id } = useParams();
  return <Editor key={id ?? 'new'} id={id} />;
}

type Action = 'save' | 'publish' | 'schedule' | 'unpublish';

function Editor({ id }: { id?: string }) {
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();

  const [post, setPost] = useState<Post | null | undefined>(isNew ? null : undefined);
  const [loadError, setLoadError] = useState<{ missing: boolean; message: string } | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<Form>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [slugError, setSlugError] = useState('');
  const [busy, setBusy] = useState<Action | 'delete' | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');

  /* ── Load ── */
  useEffect(() => {
    if (isNew) return;
    supabase.from('posts').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) {
        setLoadError({ missing: isMissingTable(error), message: error.message });
        setPost(null);
        return;
      }
      const p = (data as Post) ?? null;
      setPost(p);
      if (p) {
        const f = toForm(p);
        setForm(f);
        setSaved(f);
        setSlugTouched(p.slug !== slugify(p.title));
        if (p.published_at && postState(p) === 'scheduled') setScheduleAt(toLocalInput(p.published_at));
      }
    });
  }, [id, isNew]);

  // New article: author defaults to the logged-in person
  useEffect(() => {
    if (!isNew || !profile?.full_name) return;
    setForm((f) => (f.author_name ? f : { ...f, author_name: profile.full_name }));
    setSaved((f) => (f.author_name ? f : { ...f, author_name: profile.full_name }));
  }, [isNew, profile?.full_name]);

  // Live SEO score (deferred so typing stays smooth)
  const seoInput = useDeferredValue(form);
  const seo = useMemo(() => scoreArticle({
    title: seoInput.title, slug: seoInput.slug, bodyHtml: seoInput.body, focusKeyword: seoInput.focus_keyword,
    seoTitle: seoInput.seo_title, seoDescription: seoInput.seo_description, excerpt: seoInput.excerpt, coverImage: seoInput.cover_image, siteHost: SITE_HOST,
  }), [seoInput]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  // Warn before closing the tab / reloading with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setTitle = (title: string) => {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
    if (!slugTouched) setSlugError('');
  };

  const setSlug = (raw: string) => {
    setSlugTouched(true);
    setSlugError('');
    set('slug', raw.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, ''));
  };

  const slugProblem = form.slug && !SLUG_PATTERN.test(form.slug) ? 'Use lowercase letters, numbers and single dashes (no dash at the start or end).' : '';

  /* ── Save / publish ── */
  const state = post ? postState(post) : 'draft';

  const save = useCallback(async (action: Action) => {
    if (busy) return;
    const title = form.title.trim();
    const slug = form.slug.trim() || slugify(title);
    if (!title) return toast('Give the article a title first.', true);
    if (!slug || !SLUG_PATTERN.test(slug)) {
      setSlugError('Use lowercase letters, numbers and single dashes, e.g. "sustainable-diwali-gifts".');
      return toast('The web address (slug) needs fixing.', true);
    }

    let status: Post['status'] = post?.status ?? 'draft';
    let published_at: string | null = post?.published_at ?? null;
    if (action === 'publish') {
      status = 'published';
      published_at = new Date().toISOString();
    } else if (action === 'schedule') {
      const when = scheduleAt ? new Date(scheduleAt) : null;
      if (!when || Number.isNaN(when.getTime())) return toast('Pick a date and time to schedule.', true);
      if (when.getTime() <= Date.now()) return toast('Pick a time in the future, or use Publish now.', true);
      status = 'published';
      published_at = when.toISOString();
    } else if (action === 'unpublish') {
      status = 'draft';
      published_at = null;
    }

    const clean: Form = {
      ...form,
      title,
      slug,
      excerpt: form.excerpt.trim(),
      cover_image: form.cover_image.trim(),
      cover_alt: form.cover_alt.trim(),
      author_name: form.author_name.trim(),
      seo_title: form.seo_title.trim(),
      seo_description: form.seo_description.trim(),
      focus_keyword: form.focus_keyword.trim(),
      og_image: form.og_image.trim(),
    };
    const seo_score = scoreArticle({
      title, slug, bodyHtml: clean.body, focusKeyword: clean.focus_keyword, seoTitle: clean.seo_title,
      seoDescription: clean.seo_description, excerpt: clean.excerpt, coverImage: clean.cover_image, siteHost: SITE_HOST,
    }).score;
    const payload = { ...clean, seo_score, status, published_at };

    setBusy(action);
    const res = post
      ? await supabase.from('posts').update(payload).eq('id', post.id).select('*').single()
      : await supabase.from('posts').insert({ ...payload, author_id: profile?.id ?? null }).select('*').single();
    setBusy(null);

    if (res.error) {
      const err = res.error;
      if (err.code === '23505') {
        setSlugError(`Another article already uses /blog/${slug}. Choose a different web address.`);
        return toast('That web address is already taken.', true);
      }
      if (err.code === '23514') {
        setSlugError('Use lowercase letters, numbers and single dashes.');
        return toast('The web address (slug) needs fixing.', true);
      }
      if (isMissingTable(err)) return toast('The blog table is missing. Run supabase/04-blog-and-messages.sql in Supabase.', true);
      return toast(err.message, true);
    }

    const p = res.data as Post;
    const f = toForm(p);
    setPost(p);
    setForm(f);
    setSaved(f);
    setSlugError('');
    const next = postState(p);
    if (next === 'scheduled' && p.published_at) setScheduleAt(toLocalInput(p.published_at));
    toast(
      action === 'publish' ? 'Published. The article is live on the site.'
      : action === 'schedule' ? `Scheduled for ${fmtWhen(p.published_at!)}`
      : action === 'unpublish' ? 'Unpublished. The article is a draft again.'
      : next === 'published' ? 'Changes saved and live on the site.'
      : next === 'scheduled' ? 'Changes saved.'
      : 'Draft saved.',
    );
    if (!post) navigate(`/blog/${p.id}`, { replace: true });
  }, [busy, form, post, profile?.id, scheduleAt, toast, navigate]);

  // Cmd/Ctrl + S saves
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save('save');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const remove = async () => {
    if (!post) return;
    if (!confirm(`Delete "${post.title}"? It will disappear from the website. This can't be undone.`)) return;
    setBusy('delete');
    const { error, count } = await supabase.from('posts').delete({ count: 'exact' }).eq('id', post.id);
    setBusy(null);
    if (error) return toast(error.message, true);
    if (count === 0) return toast('Only admins can delete articles.', true);
    setSaved(form); // nothing left to lose
    toast('Article deleted');
    navigate('/blog');
  };

  const leave = (e: React.MouseEvent) => {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) e.preventDefault();
  };

  /* ── Render ── */
  if (post === undefined) return <Spinner />;
  if (loadError) {
    return (
      <>
        <BackLink onClick={leave} />
        {loadError.missing ? <BlogSetupNotice /> : <Card className="p-5 text-sm text-red-700">Couldn't load this article: {loadError.message}</Card>}
      </>
    );
  }
  if (!isNew && post === null) {
    return <p className="text-sm text-gray-500">This article doesn't exist (it may have been deleted). <Link to="/blog" className="underline">All articles</Link></p>;
  }

  const savedSlugChanged = post && state !== 'draft' && form.slug !== post.slug;

  return (
    <>
      <BackLink onClick={leave} />
      <PageHeader
        eyebrow={
          isNew ? 'Website · Journal · new article'
          : `Website · Journal · edited ${timeAgo(post!.updated_at)}${dirty ? ' · unsaved changes' : ''}`
        }
        title={form.title.trim() || (isNew ? 'New article' : 'Untitled')}
        actions={post && state === 'published' ? (
          <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
            <Button variant="secondary"><ExternalLink size={15} /> View on site ↗</Button>
          </a>
        ) : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: content ── */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="space-y-5 p-5">
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 7 sustainable Diwali gifts your team will love" className="!text-base" autoFocus={isNew} />
            </Field>

            <div>
              <Field label="Web address">
                <div className={`flex items-stretch overflow-hidden rounded-lg border bg-white focus-within:ring-2 ${slugError || slugProblem ? 'border-red-300 focus-within:ring-red-200' : 'border-gray-200 focus-within:border-brand-gold focus-within:ring-brand-gold/25'}`}>
                  <span className="flex items-center whitespace-nowrap bg-admin-muted px-3 text-sm text-gray-500">{SITE_HOST}/blog/</span>
                  <input
                    value={form.slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="article-address"
                    className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
                    spellCheck={false}
                  />
                </div>
              </Field>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs">
                {slugError || slugProblem ? (
                  <span className="text-red-700">{slugError || slugProblem}</span>
                ) : savedSlugChanged ? (
                  <span className="text-amber-700">Changing the address of a live article breaks links already shared.</span>
                ) : (
                  <span className="text-gray-500">{slugTouched ? 'Set by hand.' : 'Filled in from the title.'}</span>
                )}
                {slugTouched && form.title && form.slug !== slugify(form.title) && (
                  <button type="button" className="text-brand-olive hover:underline" onClick={() => { setSlugTouched(false); setSlugError(''); set('slug', slugify(form.title)); }}>
                    Use the title
                  </button>
                )}
              </div>
            </div>

            <Field label="Excerpt" hint={`Shown on the blog page under the title. ${form.excerpt.length} characters; 1–2 sentences works best.`}>
              <Textarea rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="A short summary that makes people want to read on." />
            </Field>

            <CoverField value={form.cover_image} onChange={(v) => set('cover_image', v)} />
            <Field label="Cover photo description (alt text)" hint="Describe the photo for screen readers and Google, e.g. “Bamboo gift hamper with a handwritten card”.">
              <Input value={form.cover_alt} onChange={(e) => set('cover_alt', e.target.value)} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Tags" hint="Press Enter or comma after each tag.">
                <TagInput value={form.tags} onChange={(v) => set('tags', v)} />
              </Field>
              <Field label="Author" hint="Shown on the article.">
                <Input value={form.author_name} onChange={(e) => set('author_name', e.target.value)} placeholder="Name" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle>Article</CardTitle>
            <div className="p-3 sm:p-5">
              <RichEditor value={form.body} onChange={(v) => set('body', v)} />
            </div>
          </Card>
        </div>

        {/* ── Right: publishing, SEO, delete ── */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardTitle>Publishing</CardTitle>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {post ? <StatePill post={post} /> : <StatePill post={{ status: 'draft', published_at: null }} />}
                {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
              </div>
              {state === 'scheduled' && post?.published_at && (
                <p className="text-sm text-gray-600">Goes live automatically on {fmtWhen(post.published_at)}.</p>
              )}
              {state === 'published' && post?.published_at && (
                <p className="text-sm text-gray-600">
                  Live since {formatDay(post.published_at)}.{' '}
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="font-medium text-brand-olive hover:underline">View on site ↗</a>
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant={state === 'draft' ? 'secondary' : 'primary'} disabled={!!busy || (!dirty && !isNew)} onClick={() => save('save')}>
                  {busy === 'save' ? 'Saving…' : state === 'draft' ? 'Save draft' : 'Save changes'}
                </Button>
                {state !== 'published' && (
                  <Button disabled={!!busy} onClick={() => save('publish')}>
                    <Send size={15} /> {busy === 'publish' ? 'Publishing…' : 'Publish now'}
                  </Button>
                )}
              </div>

              {state !== 'published' && (
                <div className="border-t border-admin-line pt-4">
                  <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">{state === 'scheduled' ? 'Change the date' : 'Or schedule'}</span>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="datetime-local"
                      value={scheduleAt}
                      min={toLocalInput(new Date().toISOString())}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="!w-auto min-w-0 flex-1"
                      aria-label="Publish on"
                    />
                    <Button variant="secondary" disabled={!!busy || !scheduleAt} onClick={() => save('schedule')}>
                      <CalendarClock size={15} /> {busy === 'schedule' ? 'Scheduling…' : state === 'scheduled' ? 'Reschedule' : 'Schedule'}
                    </Button>
                  </div>
                </div>
              )}

              {state !== 'draft' && (
                <div className="border-t border-admin-line pt-4">
                  <Button variant="ghost" disabled={!!busy} onClick={() => save('unpublish')} className="!px-0">
                    <Undo2 size={15} /> {busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish (back to draft)'}
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500">Tip: ⌘S / Ctrl+S saves.</p>
            </div>
          </Card>

          <SeoPanel fields={form} set={set} result={seo} />

          {post && isAdmin(profile) && (
            <Button variant="danger" className="w-full" disabled={!!busy} onClick={remove}>
              <Trash2 size={16} /> {busy === 'delete' ? 'Deleting…' : 'Delete article'}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function BackLink({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <Link to="/blog" onClick={onClick} className="mb-4 inline-flex items-center gap-1 text-sm text-brand-olive hover:underline">
      <ArrowLeft size={14} /> All articles
    </Link>
  );
}

/* ── Cover photo ─────────────────────────────────────────────── */

function CoverField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const { url, note } = await uploadBlogImage(file);
      onChange(url);
      toast(`Cover uploaded (${note}). Save to keep it.`);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">Cover photo</span>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex aspect-[16/10] w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-admin-muted">
          {value && broken !== value ? (
            <img src={value} alt="" className="h-full w-full object-cover" onError={() => setBroken(value)} />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs text-gray-400">
              <ImageOff size={20} /> {value ? 'Not found' : 'No photo'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
              <Upload size={15} /> {busy ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={() => onChange('')}>
                <Trash2 size={15} /> Remove
              </Button>
            )}
          </div>
          <Input value={value} placeholder="…or paste a photo link (https://…)" onChange={(e) => onChange(e.target.value.trim())} aria-label="Cover photo link" />
          <p className="text-xs text-gray-500">Landscape works best (about 16:10). Resized and converted as set in Settings → Photo uploads.</p>
        </div>
      </div>
      <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,image/avif" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

/* ── Tags ────────────────────────────────────────────────────── */

function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('');

  const add = (raw: string) => {
    const incoming = raw.split(',').map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const next = [...value];
    for (const t of incoming) if (!next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
    if (next.length !== value.length) onChange(next);
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/25">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded bg-admin-muted py-0.5 pl-2 pr-1 text-xs font-medium text-gray-700">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="rounded p-0.5 hover:bg-gray-300/60" aria-label={`Remove ${t}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => text.trim() && add(text)}
        placeholder={value.length ? '' : 'e.g. Diwali, Sustainability'}
        className="min-w-[8rem] flex-1 px-1 py-1 text-sm outline-none"
      />
    </div>
  );
}
