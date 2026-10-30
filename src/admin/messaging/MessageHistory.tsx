import { useEffect, useState, type ReactNode } from 'react';
import { Mail, MessageCircle, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardTitle, Spinner, formatDate, timeAgo } from '../ui';
import { friendlyError } from './data';
import { AttachmentLinks } from './attachments';
import type { Message } from './types';

export interface MessageHistoryProps {
  leadId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  refreshKey?: unknown; // change it (e.g. a counter bumped in ComposeMessage onSent) to reload
  title?: string;
  action?: ReactNode; // e.g. a "Send message" button in the card header
  limit?: number;
}

export const firstLine = (text: string) => text.split('\n').find((l) => l.trim())?.trim() ?? '';

export function MessageStatusTag({ message }: { message: Pick<Message, 'channel' | 'status' | 'error'> }) {
  const style =
    message.status === 'failed' ? 'bg-red-100 text-red-700' : message.status === 'opened' ? 'bg-[#E4E6DC] text-[#2F3A22]' : 'bg-[#D9E7D4] text-[#24502A]';
  const label = message.status === 'failed' ? 'Failed' : message.status === 'opened' ? 'Opened in WhatsApp' : 'Sent';
  return <span title={message.error || undefined} className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}

export const ChannelIcon = ({ channel }: { channel: Message['channel'] }) =>
  channel === 'email' ? <Mail size={16} aria-label="Email" className="shrink-0 text-brand-olive" /> : <MessageCircle size={16} aria-label="WhatsApp" className="shrink-0 text-[#1F9D55]" />;

// Messages sent to a lead / customer / order (any of the given ids match)
export function MessageHistory({ leadId, customerId, orderId, refreshKey, title = 'Messages', action, limit = 30 }: MessageHistoryProps) {
  const [rows, setRows] = useState<Message[] | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const filters = [leadId && `lead_id.eq.${leadId}`, customerId && `customer_id.eq.${customerId}`, orderId && `order_id.eq.${orderId}`].filter(Boolean);
    if (!filters.length) {
      setRows([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('messages')
      .select('*, sender:profiles(full_name, email)')
      .or(filters.join(','))
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        setError(friendlyError(err));
        setRows((data as Message[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, customerId, orderId, refreshKey, limit]);

  return (
    <Card className="h-fit">
      <CardTitle action={action}>{title}</CardTitle>
      {rows === null ? (
        <Spinner />
      ) : error ? (
        <p className="px-5 py-6 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">No emails or WhatsApp messages sent yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((m) => (
            <li key={m.id}>
              <button onClick={() => setOpenId(openId === m.id ? null : m.id)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-brand-off-white">
                <span className="mt-0.5"><ChannelIcon channel={m.channel} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{m.subject || firstLine(m.body)}</span>
                    {m.attachments?.length > 0 && <Paperclip size={13} className="shrink-0 text-gray-500" aria-label={`${m.attachments.length} attachments`} />}
                  </span>
                  <span className="block text-xs text-gray-500" title={formatDate(m.created_at)}>
                    {timeAgo(m.created_at)} · {m.sender?.full_name || m.sender?.email || 'Someone'}
                    {m.campaign && ` · ${m.campaign}`}
                  </span>
                </span>
                <MessageStatusTag message={m} />
              </button>
              {m.attachments?.length > 0 && (
                <div className="-mt-2 pb-3 pl-12 pr-5"><AttachmentLinks list={m.attachments} /></div>
              )}
              {openId === m.id && (
                <div className="bg-brand-off-white px-5 pb-4 pt-1 text-sm">
                  <p className="mb-2 text-xs text-gray-500">To {m.to_address} · {formatDate(m.created_at)}</p>
                  {m.error && <p className="mb-2 text-xs text-red-700">{m.error}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
