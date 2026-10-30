import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ImageOff, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button, Card, Input, PageHeader, Spinner, Tag } from '../ui';
import { POST_CARD_COLUMNS, formatDay, isMissingTable, postState, type PostCard, type PostState } from '../../lib/blog';
import { BlogSetupNotice, StatePill } from './shared';

type Filter = 'all' | PostState;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'draft', label: 'Drafts' },
];

export function BlogList() {
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.some((f) => f.key === params.get('show')) ? params.get('show') : 'all') as Filter;
  const [rows, setRows] = useState<PostCard[] | null>(null);
  const [error, setError] = useState<{ missing: boolean; message: string } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('posts')
      .select(POST_CARD_COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(1000)
      .then(({ data, error: err }) => {
        if (err) setError({ missing: isMissingTable(err), message: err.message });
        setRows((data as PostCard[]) ?? []);
      });
  }, []);

  const [now] = useState(() => Date.now());
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, published: 0, scheduled: 0, draft: 0 };
    for (const p of rows ?? []) {
      c.all++;
      c[postState(p, now)]++;
    }
    return c;
  }, [rows, now]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (rows ?? []).filter((p) => (filter === 'all' || postState(p, now) === filter) && (!term || p.title.toLowerCase().includes(term)));
  }, [rows, filter, search, now]);

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(params);
    if (f === 'all') next.delete('show');
    else next.set('show', f);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow={`Website · ${counts.all} ${counts.all === 1 ? 'article' : 'articles'}`}
        title="Journal"
        actions={
          <Link to="/blog/new">
            <Button><Plus size={16} /> New article</Button>
          </Link>
        }
      />

      {error ? (
        error.missing ? <BlogSetupNotice /> : (
          <Card className="p-5 text-sm text-red-700">Couldn't load articles: {error.message}</Card>
        )
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1 rounded-lg bg-admin-muted p-1" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${filter === f.key ? 'bg-white text-brand-charcoal shadow-sm' : 'text-gray-600 hover:text-brand-charcoal'}`}
                >
                  {f.label} <span className="text-gray-400">{counts[f.key]}</span>
                </button>
              ))}
            </div>
            <Input className="ml-auto !w-full sm:!w-64" placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search by title" />
          </div>

          {rows === null ? (
            <Spinner />
          ) : (
            <Card className="overflow-hidden">
              {shown.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-gray-500">
                  {rows.length === 0 ? (
                    <>
                      <p className="mb-3 font-serif text-2xl text-brand-charcoal">No articles yet</p>
                      <p className="mb-4">Write the first story for the Ecotwist journal.</p>
                      <Link to="/blog/new"><Button><Plus size={16} /> New article</Button></Link>
                    </>
                  ) : (
                    'No articles match.'
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-admin-line">
                  {shown.map((p) => (
                    <li key={p.id}>
                      <Link to={`/blog/${p.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-admin-bg">
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-admin-muted">
                          {p.cover_image ? (
                            <img src={p.cover_image} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <ImageOff size={18} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{p.title || 'Untitled'}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <StatePill post={p} />
                            {p.author_name && <span>by {p.author_name}</span>}
                            <span className="hidden sm:inline">/blog/{p.slug}</span>
                          </div>
                        </div>
                        <div className="hidden max-w-[35%] flex-wrap justify-end gap-1 md:flex">
                          {p.tags.slice(0, 4).map((t) => <Tag key={t}>{t}</Tag>)}
                        </div>
                        <span className="hidden w-28 shrink-0 text-right text-xs text-gray-500 lg:block">Edited {formatDay(p.updated_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
