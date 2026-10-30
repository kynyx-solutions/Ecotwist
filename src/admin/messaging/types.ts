import type { Customer, Lead, Order } from '../lib/types';

export const MESSAGE_CATEGORIES = ['proposal', 'follow_up', 'wishes', 'thank_you', 'payment', 'other'] as const;
export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<MessageCategory, string> = {
  proposal: 'Proposals',
  follow_up: 'Follow-ups',
  wishes: 'Festival wishes',
  thank_you: 'Thank-yous',
  payment: 'Payment reminders',
  other: 'Other',
};

export interface MessageTemplate {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  category: MessageCategory;
  subject: string; // email only
  body: string; // plain text, used for email and WhatsApp
  sort_order: number;
}

// A file in the private "attachments" bucket
export interface Attachment {
  path: string; // e.g. proposals/<order id>/1730000000000-quote.pdf
  name: string;
  type: string; // application/pdf, image/png, image/jpeg, image/webp
  size: number; // bytes
}

export type MessageChannel = 'email' | 'whatsapp';
export type MessageStatus = 'sent' | 'opened' | 'failed';

export interface Message {
  id: string;
  created_at: string;
  channel: MessageChannel;
  status: MessageStatus;
  to_address: string;
  subject: string;
  body: string;
  error: string;
  template_id: string | null;
  lead_id: string | null;
  customer_id: string | null;
  order_id: string | null;
  campaign: string;
  sent_by: string | null;
  attachments: Attachment[];
  sender?: { full_name: string; email: string } | null;
  lead?: { id: string; name: string } | null;
  customer?: { id: string; name: string } | null;
  order?: { id: string; number: number } | null;
}

export interface Recipient {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface MessageContext {
  lead?: Lead | null;
  customer?: Customer | null;
  order?: Order | null;
}

// One email for POST /api/admin/send-email
export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
  lead_id?: string | null;
  customer_id?: string | null;
  order_id?: string | null;
  template_id?: string | null;
  attachments?: Attachment[];
}

export interface SendResult {
  to: string;
  ok: boolean;
  error?: string;
}

export interface SendEmailResponse {
  results: SendResult[];
  logged: boolean;
  logError?: string;
}
