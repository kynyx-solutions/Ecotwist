import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/auth';
import { staffName, useStaff } from './lib/staff';
import type { Lead, LeadSource, Order } from './lib/types';
import { whatsappNumber } from './Customers';
import { leadSummary } from './Leads';
import siteImages from '../content/site-images.json';
import testimonials from '../content/testimonials.json';
import clients from '../content/clients.json';
import {
  Button, Card, CardTitle, Input, SOURCE_LABEL, Spinner, StatCard, StatusBadge, followUpLabel, formatMoney, orderNumber, timeAgo,
} from './ui';

const OPEN_ORDERS = ['confirmed', 'in_production', 'dispatched'];
const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

interface Data {
  newThisWeek: Lead[];
  unassignedNew: number;
  followUps: Lead[];
  wonThisMonth: number;
  proposalsThisMonth: number;
  deliveries: Order[] | null; // null when the orders table isn't set up yet
  bySource: [LeadSource, number][];
  latest: Lead[];
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// Things on the website that still need someone's attention
const WEBSITE_TODO = [
  { count: siteImages.images.filter((i) => !i.image).length, text: (n: number) => `${n} photo spots still show a placeholder`, to: '/website/edit?path=src%2Fcontent%2Fsite-images.json' },
  { count: testimonials.testimonials.length ? 0 : 1, text: () => 'No client testimonials yet; the reviews sections are hidden', to: '/website/edit?path=src%2Fcontent%2Ftestimonials.json' },
  { count: clients.clients.filter((c) => !c.logo).length, text: (n: number) => `${n} client${n === 1 ? '' : 's'} without a logo`, to: '/website/edit?path=src%2Fcontent%2Fclients.json' },
].filter((t) => t.count > 0);

export function Dashboard() {
  const { profile } = useAuth();
  const staff = useStaff();
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const leads = () => supabase.from('leads').select('*').neq('type', 'newsletter');
    Promise.all([
      leads().gte('created_at', weekAgo).order('created_at', { ascending: false }),
      leads().lte('follow_up_on', day()).not('status', 'in', '(won,lost,spam)').order('follow_up_on').limit(8),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'won').gte('updated_at', monthStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', ['proposal', 'won', 'lost']).gte('updated_at', monthStart),
      supabase.from('orders').select('*, customer:customers(id, name, company)').in('status', OPEN_ORDERS)
        .gte('delivery_date', day()).lte('delivery_date', day(7)).order('delivery_date').limit(6),
      supabase.from('leads').select('source').neq('type', 'newsletter').gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString()),
      leads().order('created_at', { ascending: false }).limit(6),
    ]).then(([week, follow, won, proposals, deliveries, sources, latest]) => {
      const counts = new Map<LeadSource, number>();
      for (const { source } of (sources.data ?? []) as { source: LeadSource }[]) counts.set(source, (counts.get(source) ?? 0) + 1);
      const weekLeads = (week.data as Lead[]) ?? [];
      setData({
        newThisWeek: weekLeads,
        unassignedNew: weekLeads.filter((l) => !l.assigned_to).length,
        followUps: (follow.data as Lead[]) ?? [],
        wonThisMonth: won.count ?? 0,
        proposalsThisMonth: proposals.count ?? 0,
        deliveries: deliveries.error ? null : ((deliveries.data as Order[]) ?? []),
        bySource: [...counts].sort((a, b) => b[1] - a[1]),
        latest: (latest.data as Lead[]) ?? [],
      });
    });
  }, []);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/leads?view=list&q=${encodeURIComponent(search)}`);
  };

  if (!data) return <Spinner />;

  const firstName = (profile?.full_name || '').split(' ')[0];
  const oldest = data.followUps[0] && followUpLabel(data.followUps[0].follow_up_on);
  const maxSource = Math.max(1, ...data.bySource.map(([, n]) => n));
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-gray-500">{today}</p>
          <h1 className="font-serif text-4xl font-medium sm:text-5xl">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <form onSubmit={submitSearch} className="relative flex-1 sm:w-64 sm:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search leads" value={search} onChange={(e) => setSearch(e.target.value)} className="!pl-9" />
          </form>
          <Link to="/leads/new"><Button className="uppercase tracking-wider">+ New lead</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/leads"><StatCard label="New leads this week" value={data.newThisWeek.length} note={`${data.unassignedNew} still unassigned`} /></Link>
        <Link to="/leads?view=list"><StatCard label="Follow-ups due" value={data.followUps.length}
          note={oldest ? (oldest.overdue ? `Oldest: ${oldest.text.toLowerCase()}` : 'All due today') : 'Nothing due'} tone={oldest?.overdue ? 'warn' : undefined} /></Link>
        <Link to="/orders"><StatCard label="Deliveries this week" value={data.deliveries?.length ?? '—'}
          note={data.deliveries ? formatMoney(data.deliveries.reduce((s, o) => s + Number(o.total_amount), 0)) : 'Set up orders first'} /></Link>
        <Link to="/leads?status=won&view=list"><StatCard label="Won this month" value={data.wonThisMonth} note={`Out of ${data.proposalsThisMonth} proposals`} /></Link>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardTitle action={<Link to="/leads" className="hover:underline">Open pipeline →</Link>}>New leads</CardTitle>
        {data.latest.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">No enquiries yet. They appear here as soon as someone fills in a form on the website.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.1em] text-gray-600">
                <tr className="border-b border-admin-line">
                  <th className="px-5 py-3 font-semibold">Name</th><th className="px-5 py-3 font-semibold">Looking for</th>
                  <th className="px-5 py-3 font-semibold">Source</th><th className="px-5 py-3 font-semibold">Stage</th><th className="px-5 py-3 font-semibold">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line">
                {data.latest.map((l) => (
                  <tr key={l.id} className="cursor-pointer hover:bg-admin-bg" onClick={() => navigate(`/leads/${l.id}`)}>
                    <td className="px-5 py-3"><p className="font-medium">{l.name || l.email}</p><p className="text-xs text-gray-500">{timeAgo(l.created_at)}</p></td>
                    <td className="px-5 py-3 text-gray-700">{leadSummary(l) || l.company || '—'}</td>
                    <td className="px-5 py-3 text-gray-700">{SOURCE_LABEL[l.source]}</td>
                    <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-5 py-3 text-gray-700">{staffName(staff, l.assigned_to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Follow-ups due</CardTitle>
          {data.followUps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">Nothing due. Set a follow-up date on a lead to see it here.</p>
          ) : (
            <ul className="divide-y divide-admin-line">
              {data.followUps.map((l) => {
                const due = followUpLabel(l.follow_up_on)!;
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <Link to={`/leads/${l.id}`} className="min-w-0">
                      <p className="truncate font-medium">{l.name || l.email}</p>
                      <p className={`truncate text-sm ${due.overdue ? 'text-red-700' : 'text-gray-600'}`}>{l.next_action || 'Follow up'}{due.overdue ? ` · ${due.text.toLowerCase()}` : ''}</p>
                    </Link>
                    {l.phone && (
                      <div className="flex shrink-0 gap-2">
                        <a href={`tel:${l.phone}`}><Button variant="secondary" className="!px-3 !py-1.5">Call</Button></a>
                        <a href={`https://wa.me/${whatsappNumber(l.phone)}`} target="_blank" rel="noreferrer"><Button className="!bg-[#1F7A43] !px-3 !py-1.5 hover:!bg-[#196638]">WhatsApp</Button></a>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle action={<Link to="/orders" className="hover:underline">All orders →</Link>}>This week's deliveries</CardTitle>
          {!data.deliveries?.length ? (
            <p className="px-5 py-6 text-sm text-gray-500">{data.deliveries ? 'No deliveries due in the next 7 days.' : 'Run the orders setup script in Supabase to start tracking orders.'}</p>
          ) : (
            <ul className="divide-y divide-admin-line">
              {data.deliveries.map((o) => {
                const d = new Date(o.delivery_date!);
                return (
                  <li key={o.id}>
                    <Link to={`/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-admin-bg">
                      <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded bg-admin-sidebar text-white">
                        <span className="text-[10px] uppercase tracking-wider text-brand-gold">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                        <span className="font-serif text-2xl leading-none">{d.getDate()}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{orderNumber(o.number)} · {o.customer?.name}</p>
                        <p className="truncate text-sm text-gray-600">{[o.occasion, formatMoney(o.total_amount), o.delivery_address].filter(Boolean).join(' · ')}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Enquiries by source · last 30 days</CardTitle>
          <div className="space-y-3 p-5">
            {data.bySource.length === 0 && <p className="text-sm text-gray-500">No enquiries in the last 30 days.</p>}
            {data.bySource.map(([source, n]) => (
              <div key={source} className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-sm">
                <span>{SOURCE_LABEL[source]}</span>
                <span className="h-2.5 rounded-full bg-admin-muted"><span className="block h-full rounded-full bg-[#56643F]" style={{ width: `${(n / maxSource) * 100}%` }} /></span>
                <span className="text-right font-medium">{n}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="rounded-xl bg-[#DFE0D5] p-5">
          <h2 className="mb-4 font-serif text-2xl font-medium">Website to-do</h2>
          {WEBSITE_TODO.length === 0 ? (
            <p className="text-sm text-gray-600">All caught up.</p>
          ) : (
            <div className="space-y-2">
              {WEBSITE_TODO.map((t) => (
                <Link key={t.to} to={t.to} className="flex items-center justify-between rounded bg-white px-4 py-3 text-[15px] hover:bg-admin-bg">
                  {t.text(t.count)} <span aria-hidden>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
