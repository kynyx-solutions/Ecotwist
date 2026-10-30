import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Leaf } from 'lucide-react';
import { isBlogConfigured, supabasePublic } from '../lib/supabasePublic';
import { POST_CARD_COLUMNS, formatDay, type PostCard } from '../lib/blog';
import { SITE_URL, applyHead } from '../lib/head';

// The Ecotwist Journal: articles written in the admin (/admin/blog), read from Supabase
const EASE = [0.22, 1, 0.36, 1] as const;

export function usePublishedPosts(limit = 100) {
  const [posts, setPosts] = useState<PostCard[] | null>(null);
  useEffect(() => {
    if (!isBlogConfigured) {
      setPosts([]);
      return;
    }
    let live = true;
    supabasePublic
      .from('posts')
      .select(POST_CARD_COLUMNS)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!live) return;
        if (error) console.warn('[blog] could not load posts:', error.message);
        setPosts((data as PostCard[]) ?? []);
      });
    return () => { live = false; };
  }, [limit]);
  return posts;
}

export default function Blog() {
  const posts = usePublishedPosts();
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') ?? '';

  useEffect(() =>
    applyHead({
      title: 'Journal · Sustainable Corporate Gifting Ideas | Ecotwist',
      description: 'Ideas, guides and stories on sustainable corporate gifting: festive hampers, employee onboarding kits, client gifts and the artisans behind them.',
      canonical: `${SITE_URL}/blog`,
      og: {
        'og:type': 'website',
        'og:title': 'The Ecotwist Journal',
        'og:description': 'Ideas, guides and stories on sustainable corporate gifting.',
        'og:url': `${SITE_URL}/blog`,
        'og:site_name': 'Ecotwist',
      },
      twitter: { 'twitter:card': 'summary' },
    }), []);

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of posts ?? []) for (const t of p.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 14);
  }, [posts]);

  const shown = useMemo(() => (posts ?? []).filter((p) => !tag || (p.tags ?? []).includes(tag)), [posts, tag]);
  const [featured, ...rest] = shown;

  const pickTag = (t: string) => {
    const next = new URLSearchParams(params);
    if (t) next.set('tag', t);
    else next.delete('tag');
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-off-white">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pb-14 pt-32 lg:px-24 lg:pt-40">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#2c3320 1px,transparent 1px),linear-gradient(90deg,#2c3320 1px,transparent 1px)', backgroundSize: '56px 56px' }}
        />
        <div className="relative mx-auto max-w-7xl">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-brand-olive"
          >
            <span className="block h-px w-8 bg-brand-olive" /> The Ecotwist Journal
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: EASE }}
            className="font-serif text-5xl leading-tight md:text-7xl"
          >
            Stories of <span className="italic font-normal text-brand-olive">mindful gifting</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-gray-600 md:text-xl"
          >
            Ideas, guides and behind-the-scenes stories on sustainable corporate gifting, and the artisans who make it.
          </motion.p>

          {tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2" role="toolbar" aria-label="Filter by topic">
              {['', ...tags].map((t) => {
                const active = tag === t;
                return (
                  <button
                    key={t || 'all'}
                    onClick={() => pickTag(t)}
                    aria-pressed={active}
                    className={`rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest transition ${
                      active ? 'border-brand-dark-olive bg-brand-dark-olive text-brand-beige' : 'border-brand-charcoal/15 text-gray-600 hover:border-brand-gold hover:text-brand-charcoal'
                    }`}
                  >
                    {t || 'All stories'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Posts ── */}
      <section className="px-6 pb-24 lg:px-24">
        <div className="mx-auto max-w-7xl">
          {posts === null ? (
            <Skeleton />
          ) : shown.length === 0 ? (
            <Empty filtered={!!tag && posts.length > 0} onClear={() => pickTag('')} />
          ) : (
            <>
              {featured && <FeaturedCard post={featured} />}
              {rest.length > 0 && (
                <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p, i) => <PostCardView key={p.id} post={p} index={i} />)}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

const TagLine = ({ tags }: { tags: string[] }) =>
  tags?.length ? <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">{tags.slice(0, 2).join(' · ')}</span> : null;

function Cover({ post, className }: { post: PostCard; className: string }) {
  return (
    <div className={`overflow-hidden bg-brand-beige ${className}`}>
      {post.cover_image ? (
        <img
          src={post.cover_image}
          alt={post.cover_alt || post.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center"><Leaf className="text-brand-olive/30" size={40} strokeWidth={1.2} /></div>
      )}
    </div>
  );
}

function FeaturedCard({ post }: { post: PostCard }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
      <Link to={`/blog/${post.slug}`} className="group grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
        <Cover post={post} className="aspect-[16/10] rounded-sm rounded-tr-[40px] shadow-[0_30px_80px_rgba(44,51,32,0.15)] lg:col-span-7" />
        <div className="lg:col-span-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-brand-dark-olive px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-beige">Latest</span>
            <TagLine tags={post.tags} />
          </div>
          <h2 className="font-serif text-3xl leading-tight transition-colors group-hover:text-brand-olive md:text-5xl">{post.title}</h2>
          {post.excerpt && <p className="mt-5 text-lg font-light leading-relaxed text-gray-600">{post.excerpt}</p>}
          <p className="mt-6 text-xs uppercase tracking-widest text-gray-500">
            {post.published_at && formatDay(post.published_at)}{post.author_name && ` · ${post.author_name}`}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-olive">
            Read the story <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function PostCardView({ post, index = 0 }: { post: PostCard; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <Link to={`/blog/${post.slug}`} className="group block">
        <Cover post={post} className="aspect-[16/10] rounded-sm" />
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs uppercase tracking-widest text-gray-500">{post.published_at && formatDay(post.published_at)}</span>
          <TagLine tags={post.tags} />
        </div>
        <h3 className="mt-2 font-serif text-2xl leading-snug transition-colors group-hover:text-brand-olive">{post.title}</h3>
        {post.excerpt && <p className="mt-3 line-clamp-3 font-light leading-relaxed text-gray-600">{post.excerpt}</p>}
      </Link>
    </motion.article>
  );
}

export function Skeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid animate-pulse gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading stories">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[16/10] rounded-sm bg-brand-beige" />
          <div className="mt-5 h-3 w-32 rounded bg-brand-beige" />
          <div className="mt-3 h-6 w-4/5 rounded bg-brand-beige" />
          <div className="mt-2 h-6 w-3/5 rounded bg-brand-beige" />
          <div className="mt-4 h-4 w-full rounded bg-brand-beige/70" />
          <div className="mt-2 h-4 w-11/12 rounded bg-brand-beige/70" />
        </div>
      ))}
    </div>
  );
}

function Empty({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-sm border border-brand-gold/25 bg-white/60 px-8 py-16 text-center">
      <Leaf className="mx-auto mb-5 text-brand-gold" size={32} strokeWidth={1.4} />
      {filtered ? (
        <>
          <h2 className="font-serif text-3xl">No stories on this topic yet</h2>
          <button onClick={onClear} className="mt-6 text-[11px] font-bold uppercase tracking-widest text-brand-olive hover:underline">See all stories</button>
        </>
      ) : (
        <>
          <h2 className="font-serif text-3xl md:text-4xl">Stories coming soon</h2>
          <p className="mt-4 font-light leading-relaxed text-gray-600">
            We're writing about sustainable gifting, the artisans we work with and ideas for your next celebration. Check back shortly.
          </p>
          <Link to="/solutions" className="mt-8 inline-block rounded-sm bg-brand-dark-olive px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-brand-beige">
            Explore our solutions
          </Link>
        </>
      )}
    </div>
  );
}
