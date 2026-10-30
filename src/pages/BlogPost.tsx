import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { isBlogConfigured, supabasePublic } from '../lib/supabasePublic';
import { POST_CARD_COLUMNS, formatDay, htmlToText, readingMinutes, sanitizeArticleHtml, type Post, type PostCard } from '../lib/blog';
import { SITE_URL, absoluteUrl, applyHead } from '../lib/head';
import { PostCardView, Skeleton } from './Blog';
import '../styles/article.css';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function BlogPost() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [more, setMore] = useState<PostCard[] | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setPost(undefined);
    setMore(null);
    if (!isBlogConfigured) {
      setPost(null);
      return;
    }
    let live = true;
    const now = new Date().toISOString();
    supabasePublic
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .lte('published_at', now)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) console.warn('[blog] could not load article:', error.message);
        setPost((data as Post) ?? null);
      });
    supabasePublic
      .from('posts')
      .select(POST_CARD_COLUMNS)
      .eq('status', 'published')
      .lte('published_at', now)
      .neq('slug', slug)
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data }) => live && setMore((data as PostCard[]) ?? []));
    return () => { live = false; };
  }, [slug]);

  // <head>: title, description, canonical, Open Graph, Twitter, robots, JSON-LD
  useEffect(() => {
    if (post === undefined) return;
    if (post === null) return applyHead({ title: 'Story not found | Ecotwist', noindex: true });
    const url = `${SITE_URL}/blog/${post.slug}`;
    const title = post.seo_title || post.title;
    const description = post.seo_description || post.excerpt || htmlToText(post.body).slice(0, 160);
    const image = absoluteUrl(post.og_image || post.cover_image);
    return applyHead({
      title,
      description,
      canonical: url,
      noindex: post.noindex,
      og: {
        'og:type': 'article',
        'og:title': title,
        'og:description': description,
        'og:url': url,
        'og:image': image,
        'og:image:alt': post.cover_alt,
        'og:site_name': 'Ecotwist',
        'article:published_time': post.published_at ?? '',
        'article:modified_time': post.updated_at,
      },
      twitter: {
        'twitter:card': image ? 'summary_large_image' : 'summary',
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': image,
      },
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        headline: post.title.slice(0, 110),
        description,
        ...(image && { image: [image] }),
        datePublished: post.published_at,
        dateModified: post.updated_at,
        ...(post.focus_keyword && { keywords: [post.focus_keyword, ...(post.tags ?? [])].join(', ') }),
        author: post.author_name ? { '@type': 'Person', name: post.author_name } : { '@type': 'Organization', name: 'Ecotwist', url: SITE_URL },
        publisher: { '@type': 'Organization', name: 'Ecotwist', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/site/navigation/logo.png` } },
      },
    });
  }, [post]);

  const html = useMemo(() => (post ? sanitizeArticleHtml(post.body) : ''), [post]);

  if (post === undefined) return <Loading />;
  if (post === null) return <NotFound />;

  const minutes = readingMinutes(post.body);

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-off-white">
      <article>
        {/* ── Header ── */}
        <header className="px-6 pb-10 pt-28 lg:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <Link to="/blog" className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 transition hover:text-brand-olive">
              <ArrowLeft size={13} /> The Journal
            </Link>
            {post.tags?.length > 0 && (
              <p className="mb-5 text-[10px] font-bold uppercase tracking-widest text-brand-gold">{post.tags.slice(0, 3).join(' · ')}</p>
            )}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="font-serif text-4xl leading-tight md:text-6xl"
            >
              {post.title}
            </motion.h1>
            {post.excerpt && <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-gray-600 md:text-xl">{post.excerpt}</p>}
            <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs uppercase tracking-widest text-gray-500">
              {post.author_name && <span className="font-semibold text-brand-charcoal">{post.author_name}</span>}
              {post.author_name && <span aria-hidden>·</span>}
              {post.published_at && <time dateTime={post.published_at}>{formatDay(post.published_at)}</time>}
              <span aria-hidden>·</span>
              <span>{minutes} min read</span>
            </p>
          </div>
        </header>

        {post.cover_image && (
          <motion.figure
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="mx-auto max-w-5xl px-6"
          >
            <img
              src={post.cover_image}
              alt={post.cover_alt || post.title}
              className="aspect-[16/9] w-full rounded-sm rounded-tr-[40px] object-cover shadow-[0_30px_80px_rgba(44,51,32,0.15)]"
              fetchPriority="high"
            />
          </motion.figure>
        )}

        {/* ── Body ── */}
        <div className="mx-auto max-w-[720px] px-6 py-14 md:py-20">
          <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />

          {post.tags?.length > 0 && (
            <div className="mt-14 flex flex-wrap items-center gap-2 border-t border-brand-olive/15 pt-8">
              <span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Topics</span>
              {post.tags.map((t) => (
                <Link
                  key={t}
                  to={`/blog?tag=${encodeURIComponent(t)}`}
                  className="rounded-full border border-brand-charcoal/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-gray-600 transition hover:border-brand-gold hover:text-brand-charcoal"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </article>

      {/* ── CTA ── */}
      <section className="px-6">
        <div className="mx-auto max-w-5xl rounded-sm rounded-tr-[40px] bg-brand-dark-olive px-8 py-14 text-center text-brand-beige md:px-16">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-brand-gold">Gifting, done thoughtfully</p>
          <h2 className="font-serif text-3xl leading-tight md:text-5xl">
            Planning gifts for your <span className="italic font-normal">team or clients?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-light leading-relaxed text-brand-beige/80">
            Tell us the occasion, budget and quantity, and we'll curate sustainable, beautifully branded gifts for you.
          </p>
          <Link
            to="/get-proposal"
            className="mt-8 inline-flex items-center gap-2 rounded-sm bg-brand-beige px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-brand-dark-olive transition hover:bg-white"
          >
            Get a proposal <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── More stories ── */}
      {(more === null || more.length > 0) && (
        <section className="px-6 pb-24 pt-20 lg:px-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex items-end justify-between gap-4">
              <h2 className="font-serif text-3xl md:text-4xl">More stories</h2>
              <Link to="/blog" className="text-[11px] font-bold uppercase tracking-widest text-brand-olive hover:underline">All stories</Link>
            </div>
            {more === null ? <Skeleton /> : (
              <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {more.map((p, i) => <PostCardView key={p.id} post={p} index={i} />)}
              </div>
            )}
          </div>
        </section>
      )}
      {more !== null && more.length === 0 && <div className="pb-24" />}
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen bg-brand-off-white px-6 pt-36" aria-label="Loading story">
      <div className="mx-auto max-w-3xl animate-pulse text-center">
        <div className="mx-auto h-3 w-24 rounded bg-brand-beige" />
        <div className="mx-auto mt-8 h-10 w-4/5 rounded bg-brand-beige" />
        <div className="mx-auto mt-3 h-10 w-3/5 rounded bg-brand-beige" />
        <div className="mx-auto mt-8 h-4 w-2/3 rounded bg-brand-beige/70" />
      </div>
      <div className="mx-auto mt-12 aspect-[16/9] max-w-5xl animate-pulse rounded-sm bg-brand-beige" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-off-white px-6 pb-20 pt-32">
      <div className="max-w-lg text-center">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-brand-gold">404</p>
        <h1 className="font-serif text-4xl md:text-5xl">This story isn't here</h1>
        <p className="mt-5 font-light leading-relaxed text-gray-600">
          It may have moved, or it hasn't been published yet. Have a look at the rest of the journal.
        </p>
        <Link to="/blog" className="mt-8 inline-flex items-center gap-2 rounded-sm bg-brand-dark-olive px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-brand-beige">
          <ArrowLeft size={14} /> Back to the journal
        </Link>
      </div>
    </div>
  );
}
