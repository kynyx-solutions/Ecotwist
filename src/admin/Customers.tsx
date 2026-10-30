import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Mail, MessageCircle, Phone, Plus, Send, Trash2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { isAdmin, useAuth } from './lib/auth';
import type { Customer, Order } from './lib/types';
import { ComposeMessage, MessageHistory } from './messaging/routes';
import { Button, Card, Field, Input, OrderStatusBadge, PageHeader, Spinner, Textarea, formatDate, formatMoney, orderNumber, useToast } from './ui';

const PAGE_SIZE = 50;

const EMPTY: Omit<Customer, 'id' | 'created_at' | 'updated_at'> = {
  name: '', company: '', email: '', phone: '', gstin: '', address: '', city: '', notes: '', source_lead_id: null,
};

const searchFilter = (q: string) => {
  const term = q.replace(/[,()%]/g, ' ').trim();
  return ['name', 'company', 'email', 'phone', 'city'].map((c) => `${c}.ilike.%${term}%`).join(',');
};

export const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

/* ── List ─────────────────────────────────────────────────────── */

export function CustomerList() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '0');
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(q);
  const toast = useToast();

  useEffect(() => {
    setRows(null);
    let query = supabase.from('customers').select('*', { count: 'exact' });
    if (q.trim()) query = query.or(searchFilter(q));
    query
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      .then(({ data, count, error }) => {
        if (error) toast(error.message, true);
        setRows((data as Customer[]) ?? []);
        setTotal(count ?? 0);
      });
  }, [q, page, toast]);

  const exportCsv = async () => {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(5000);
    if (error) return toast(error.message, true);
    const cols = ['created_at', 'name', 'company', 'email', 'phone', 'gstin', 'city', 'address', 'notes'] as const;
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...(data as Customer[]).map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `ecotwist-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pages = Math.ceil(total / PAGE_SIZE);
  const setPage = (p: number) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n; });

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${total} ${total === 1 ? 'customer' : 'customers'}`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}><Download size={16} /> Export CSV</Button>
            <Link to="/customers/new"><Button><Plus size={16} /> New customer</Button></Link>
          </>
        }
      />
      <Card className="mb-4 p-4">
        <form onSubmit={(e) => { e.preventDefault(); setParams(search ? { q: search } : {}); }}>
          <Input placeholder="Search name, company, email, phone, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </Card>
      <Card className="overflow-hidden">
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            {q ? 'No customers match this search.' : 'No customers yet. Add one, or open a lead and choose "Save as customer".'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-off-white text-left text-xs uppercase tracking-wide text-gray-500">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Added</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-brand-off-white">
                    <td className="px-4 py-3">
                      <Link to={`/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                      {c.company && <p className="text-xs text-gray-500">{c.company}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600"><p>{c.email}</p>{c.phone && <p className="text-xs">{c.phone}</p>}</td>
                    <td className="px-4 py-3 text-gray-600">{c.city}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page + 1} of {pages}</span>
          <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}

/* ── Create / edit ────────────────────────────────────────────── */

export function CustomerDetail() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<typeof EMPTY | null>(isNew ? EMPTY : null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [saving, setSaving] = useState(false);
  const [composing, setComposing] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (isNew) return setForm(EMPTY);
    supabase.from('customers').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (!data) return navigate('/customers', { replace: true });
      const { id: _id, created_at, updated_at, ...rest } = data as Customer;
      setForm(rest);
    });
    supabase.from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, [id, isNew, navigate]);

  if (!form) return <Spinner />;

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('Please enter a name', true);
    setSaving(true);
    const { data, error } = isNew
      ? await supabase.from('customers').insert(form).select('id').single()
      : await supabase.from('customers').update(form).eq('id', id).select('id').single();
    setSaving(false);
    if (error) return toast(error.message, true);
    toast(isNew ? 'Customer added' : 'Saved');
    if (isNew) navigate(`/customers/${data.id}`, { replace: true });
  };

  const remove = async () => {
    if (orders.length) return toast('This customer has orders. Delete or move those first.', true);
    if (!confirm(`Delete ${form.name}? This can't be undone.`)) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return toast(error.message, true);
    toast('Customer deleted');
    navigate('/customers');
  };

  const billed = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount), 0);

  return (
    <>
      <Link to="/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-olive hover:underline"><ArrowLeft size={14} /> All customers</Link>
      <PageHeader
        title={isNew ? 'New customer' : form.name}
        subtitle={isNew ? undefined : form.company}
        actions={!isNew && (
          <>
            {(form.email || form.phone) && <Button onClick={() => setComposing(true)}><Send size={16} /> Send message</Button>}
            {form.phone && <a href={`tel:${form.phone}`}><Button variant="secondary"><Phone size={16} /> Call</Button></a>}
            {form.phone && <a href={`https://wa.me/${whatsappNumber(form.phone)}`} target="_blank" rel="noreferrer"><Button variant="secondary"><MessageCircle size={16} /> WhatsApp</Button></a>}
            {form.email && <a href={`mailto:${form.email}`}><Button variant="secondary"><Mail size={16} /> Email</Button></a>}
          </>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *"><Input value={form.name} onChange={set('name')} required /></Field>
            <Field label="Company"><Input value={form.company} onChange={set('company')} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
            <Field label="GSTIN"><Input value={form.gstin} onChange={set('gstin')} /></Field>
            <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
            <div className="sm:col-span-2"><Field label="Address"><Textarea rows={2} value={form.address} onChange={set('address')} /></Field></div>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea rows={3} value={form.notes} onChange={set('notes')} /></Field></div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Add customer' : 'Save'}</Button>
              {!isNew && isAdmin(profile) && <Button type="button" variant="danger" onClick={remove}><Trash2 size={16} /> Delete</Button>}
            </div>
          </form>
        </Card>

        {!isNew && (
          <div className="lg:col-span-2 lg:row-start-2">
            <MessageHistory customerId={id} refreshKey={sentCount} />
          </div>
        )}

        {!isNew && (
          <Card className="h-fit">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-semibold">Orders</h2>
                <p className="text-xs text-gray-500">{orders.length} · {formatMoney(billed)} billed</p>
              </div>
              <Link to={`/orders/new?customer=${id}`}><Button variant="secondary"><Plus size={16} /> New order</Button></Link>
            </div>
            {orders.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link to={`/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-brand-off-white">
                      <div>
                        <p className="font-medium">{orderNumber(o.number)}</p>
                        <p className="text-xs text-gray-500">{formatMoney(o.total_amount)} · {formatDate(o.created_at)}</p>
                      </div>
                      <OrderStatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {!isNew && (
        <ComposeMessage
          open={composing}
          onClose={() => setComposing(false)}
          recipient={{ name: form.name, email: form.email, phone: form.phone }}
          context={{ customer: { ...form, id: id!, created_at: '', updated_at: '' } }}
          defaultCategory="wishes"
          onSent={() => setSentCount((n) => n + 1)}
        />
      )}
    </>
  );
}
