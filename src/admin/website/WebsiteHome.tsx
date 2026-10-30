import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileText, ImagePlus, MessageSquareQuote, Package, Search, Users } from 'lucide-react';
import { api } from '../lib/api';
import { Card, PageHeader, Spinner, useToast } from '../ui';
import { loadSiteSeo } from '../seo/data';
import { ScoreBadge } from '../seo/shared';

export type ContentFile = { path: string; label: string; group: string; route?: string };

const GROUPS = [
  { name: 'Pages', icon: FileText, blurb: 'Words and photos on each page of the site.' },
  { name: 'Catalogue', icon: Package, blurb: 'Products shown on the Products page.' },
  { name: 'Photos to add', icon: ImagePlus, blurb: 'Spots on the site still waiting for a real photo.' },
  { name: 'Clients', icon: Users, blurb: 'Logos in the "trusted by" strip.' },
  { name: 'Testimonials', icon: MessageSquareQuote, blurb: 'Quotes from clients.' },
  { name: 'SEO', icon: Search, blurb: 'Google titles, descriptions and share images for every page.' },
];

export const editLink = (path: string) => (path === 'src/content/seo.json' ? '/seo/pages' : `/website/edit?path=${encodeURIComponent(path)}`);

export function WebsiteHome() {
  const [files, setFiles] = useState<ContentFile[] | null>(null);
  const [error, setError] = useState('');
  const toast = useToast();
  const [scores, setScores] = useState<Map<string, number>>(new Map());

  // SEO score per page (loads in the background)
  useEffect(() => {
    loadSiteSeo().then((d) => setScores(d.scores)).catch(() => {});
  }, []);

  useEffect(() => {
    api<ContentFile[]>('/api/admin/content')
      .then(setFiles)
      .catch((err: Error) => {
        setError(err.message);
        toast(err.message, true);
      });
  }, [toast]);

  return (
    <>
      <PageHeader title="Website" subtitle="Change the words and photos on the site. Saved changes go live in a couple of minutes." />
      {error ? (
        <Card className="p-5 text-sm text-red-700">{error}</Card>
      ) : files === null ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {GROUPS.map(({ name, icon: Icon, blurb }) => {
            const rows = files.filter((f) => f.group === name);
            if (!rows.length) return null;
            return (
              <Card key={name} className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                  <Icon size={18} className="text-brand-olive" />
                  <div>
                    <h2 className="font-serif text-xl leading-tight">{name}</h2>
                    <p className="text-xs text-gray-500">{blurb}</p>
                  </div>
                </div>
                <ul className="divide-y divide-gray-100">
                  {rows.map((f) => (
                    <li key={f.path} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-brand-off-white">
                      <Link to={editLink(f.path)} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium hover:underline">{f.label}</p>
                        {f.route && <p className="truncate text-xs text-gray-500">{f.route}</p>}
                      </Link>
                      {scores.has(f.path) && (
                        <Link to={`${editLink(f.path)}&tab=seo`} className="shrink-0" title="SEO score: open the SEO tab">
                          <ScoreBadge score={scores.get(f.path)!} />
                        </Link>
                      )}
                      {f.route && (
                        <a href={f.route} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs text-brand-olive hover:underline">
                          View on site <ExternalLink size={12} />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
