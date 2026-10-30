export type Role = 'owner' | 'admin' | 'staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'spam'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_TYPES = ['contact', 'proposal', 'newsletter', 'manual'] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  type: LeadType;
  status: LeadStatus;
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  interest: string;
  occasion: string;
  product: string;
  budget: string;
  quantity: string;
  branding: string;
  source_page: string;
  submission_id: string;
  data: Record<string, unknown>;
  assigned_to: string | null;
  source: LeadSource;
  city: string;
  follow_up_on: string | null; // yyyy-mm-dd
  next_action: string;
}

export const LEAD_SOURCES = ['website', 'whatsapp', 'phone', 'email', 'referral', 'instagram', 'linkedin', 'event', 'other'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  author: { full_name: string; email: string } | null;
}

export interface Customer {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  city: string;
  notes: string;
  source_lead_id: string | null;
}

export const ORDER_STATUSES = ['quote', 'confirmed', 'in_production', 'dispatched', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  product: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  number: number;
  created_at: string;
  updated_at: string;
  customer_id: string;
  status: OrderStatus;
  occasion: string;
  items: OrderItem[];
  gst_rate: number;
  total_amount: number;
  advance_paid: number;
  delivery_date: string | null;
  delivery_address: string;
  notes: string;
  created_by: string | null;
  customer?: Pick<Customer, 'id' | 'name' | 'company'> | null;
}

export interface StaffMember extends Profile {
  last_sign_in_at: string | null;
  invited: boolean; // invited but hasn't set a password / signed in yet
}
