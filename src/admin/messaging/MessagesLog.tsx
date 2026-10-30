import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button, Card, Input, PageHeader, Select, Spinner, formatDate, orderNumber, timeAgo, useToast } from '../ui';
import { friendlyError } from './data';
import { AttachmentLinks } from './attachments';
import { ChannelIcon, MessageStatusTag, firstLine } from './MessageHistory';
import type { Message } from './types';

const PAGE_SIZE = 50;

// Every email / WhatsApp message sent to clients
export function MessagesLog() {
  const [params, setParams] = useSearchParams();
  const channel = params.get('channel') ?? '';
  const status = params.get('status') ?? '';
  const campaign = params.get('campaign') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '0');
  const [rows, setRows] = useState<Message[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [search, setSearch] = useState(q);
  const [openId, setOpenId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    supabase.from('messages').select('campaign').neq('campaign', '').order('created_at', { ascending: false }).limit(2000)
      .then(({ data }) => setCampaigns([...new Set((data ?? []).map((r: { campaign: string }) => r.campaign))]));
  }, []);

  useEffect(() => {
    setRows(null);
    let query = supabase
      .from('messages')
      .select('*, sender:profiles(full_name, email), lead:leads(id, name), customer:customers(id, name), order:orders(id, number)', { count: 'exact' });
    if (channel) query = query.eq('channel', channel);
    if (status) query = query.eq('status', status);
    if (campaign) query = query.eq('campaign', campaign);
    const term = q.replace(/[,()%]/g, ' ').trim();
    if (term) query = query.or(`to_address.ilike.%${term}%,subject.ilike.%${term}%`);
    query
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      .then(({ data, count, error: err }) => {
        setError(friendlyError(err));
        if (err && !/database yet/.test(friendlyError(err))) toast(friendlyError(err), true);
        setRows((data as Message[]) ?? []);
        setTotal(count ?? 0);
      });
  }, [channel, status, campaign, q, page, toast]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const pages = Math.ceil(total / PAGE_SIZE);
  const filtered = !!(channel || status || campaign || q);

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Messages"
        subtitle={`${total} ${total === 1 ? 'message' : 'messages'}${filtered ? ' match' : ' sent'}`}
        actions={
          <>
            <Link to="/messages/templates"><Button variant="secondary"><FileText size={16} /> Templates</Button></Link>
            <Link to="/messages/send"><Button><Send size={16} /> Send wishes</Button></Link>
          </>
        }
      />

      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_150px_170px_200px]">
        <form onSubmit={(e) => { e.preventDefault(); update('q', search); }}>
          <Input placeholder="Search email, phone or subject…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <Select value={channel} onChange={(e) => update('channel', e.target.value)} aria-label="Channel">
          <option value="">Email & WhatsApp</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </Select>
        <Select value={status} onChange={(e) => update('status', e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened in WhatsApp</option>
          <option value="failed">Failed</option>
        </Select>
        <Select value={campaign} onChange={(e) => update('campaign', e.target.value)} aria-label="Bulk send">
          <option value="">All sends</option>
          {campaign && !campaigns.includes(campaign) && <option value={campaign}>{campaign}</option>}
          {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {rows === null ? (
          <Spinner />
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-red-700">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            {filtered ? 'No messages match these filters.' : 'Nothing sent yet. Send a message from a lead, customer or order, or send wishes to everyone.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-off-white text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-8 px-4 py-3" /><th className="px-4 py-3">Message</th><th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">For</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((m) => (
                  <Fragment key={m.id}>
                    <tr className="cursor-pointer align-top hover:bg-brand-off-white" onClick={() => setOpenId(openId === m.id ? null : m.id)}>
                      <td className="px-4 py-3"><ChannelIcon channel={m.channel} /></td>
                      <td className="max-w-[320px] px-4 py-3">
                        <p className="truncate font-medium">{m.subject || firstLine(m.body)}</p>
                        {m.campaign && <p className="truncate text-xs text-gray-500">{m.campaign}</p>}
                        {m.attachments?.length > 0 && <div className="mt-1"><AttachmentLinks list={m.attachments} /></div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.to_address}</td>
                      <td className="px-4 py-3 text-gray-600" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-0.5">
                          {m.customer && <Link to={`/customers/${m.customer.id}`} className="hover:underline">{m.customer.name}</Link>}
                          {m.lead && <Link to={`/leads/${m.lead.id}`} className="text-xs hover:underline">Lead: {m.lead.name || 'open'}</Link>}
                          {m.order && <Link to={`/orders/${m.order.id}`} className="text-xs hover:underline">{orderNumber(m.order.number)}</Link>}
                          {!m.customer && !m.lead && !m.order && '—'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600" title={formatDate(m.created_at)}>
                        {timeAgo(m.created_at)}
                        <p className="text-xs">{m.sender?.full_name || m.sender?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3"><MessageStatusTag message={m} /></td>
                    </tr>
                    {openId === m.id && (
                      <tr className="bg-brand-off-white">
                        <td />
                        <td colSpan={5} className="px-4 pb-4 pt-1">
                          <p className="mb-2 text-xs text-gray-500">{formatDate(m.created_at)} · {m.channel === 'email' ? 'Email' : 'WhatsApp'} to {m.to_address}</p>
                          {m.error && <p className="mb-2 text-xs text-red-700">{m.error}</p>}
                          <p className="max-w-3xl whitespace-pre-wrap break-words">{m.body}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button variant="secondary" disabled={page === 0} onClick={() => update('page', String(page - 1))}>Previous</Button>
          <span>Page {page + 1} of {pages}</span>
          <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => update('page', String(page + 1))}>Next</Button>
        </div>
      )}
    </>
  );
}
