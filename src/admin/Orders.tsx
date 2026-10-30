import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, Send, Trash2, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { isAdmin, useAuth } from './lib/auth';
import { ORDER_STATUSES, type Customer, type Order, type OrderItem, type OrderStatus } from './lib/types';
import catalogue from '../content/products.json';
import { ComposeMessage, MessageHistory, type MessageCategory } from './messaging/routes';
import { Button, Card, Field, Input, ORDER_STATUS_LABEL, OrderStatusBadge, PageHeader, Select, Spinner, Textarea, formatDate, formatMoney, orderNumber, useToast } from './ui';

const PAGE_SIZE = 50;

// Product names and designs from the website catalogue, offered while typing an item
const PRODUCT_SUGGESTIONS = [
  ...new Set(
    catalogue.products.flatMap((p: { name: string; designs?: { name: string; sku?: string }[] }) => [
      p.name,
      ...(p.designs ?? []).map((d) => (d.sku ? `${d.name} (SKU ${d.sku})` : d.name)),
    ]),
  ),
];

const subtotalOf = (items: OrderItem[]) => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);

/* ── List ─────────────────────────────────────────────────────── */

export function OrderList() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '0');
  const [rows, setRows] = useState<Order[] | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(q);
  const toast = useToast();

  useEffect(() => {
    setRows(null);
    const term = q.replace(/[,()%]/g, ' ').trim();
    const number = Number(term.replace(/^eco-?/i, ''));
    let query = supabase.from('orders').select('*, customer:customers!inner(id, name, company)', { count: 'exact' });
    if (status) query = query.eq('status', status);
    if (term && Number.isInteger(number) && number > 0) query = query.eq('number', number);
    else if (term) query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%`, { referencedTable: 'customers' });
    query
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      .then(({ data, count, error }) => {
        if (error) toast(error.message, true);
        setRows((data as Order[]) ?? []);
        setTotal(count ?? 0);
      });
  }, [status, q, page, toast]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // A new filter or search starts again from the first page
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${total} ${total === 1 ? 'order' : 'orders'}`}
        actions={<Link to="/orders/new"><Button><Plus size={16} /> New order</Button></Link>}
      />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_200px]">
        <form onSubmit={(e) => { e.preventDefault(); update('q', search); }}>
          <Input placeholder="Search order number (ECO-1001) or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <Select value={status} onChange={(e) => update('status', e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </Select>
      </Card>
      <Card className="overflow-hidden">
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">{q || status ? 'No orders match these filters.' : 'No orders yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-off-white text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Balance due</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-brand-off-white">
                    <td className="px-4 py-3"><Link to={`/orders/${o.id}`} className="font-medium hover:underline">{orderNumber(o.number)}</Link><p className="text-xs text-gray-500">{o.occasion}</p></td>
                    <td className="px-4 py-3 text-gray-600">{o.customer?.name}{o.customer?.company && <p className="text-xs">{o.customer.company}</p>}</td>
                    <td className="px-4 py-3">{formatMoney(o.total_amount)}</td>
                    <td className="px-4 py-3">{formatMoney(Math.max(0, o.total_amount - o.advance_paid))}</td>
                    <td className="px-4 py-3 text-gray-600">{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  </tr>
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

/* ── Create / edit ────────────────────────────────────────────── */

type OrderForm = Pick<Order, 'customer_id' | 'status' | 'occasion' | 'items' | 'gst_rate' | 'advance_paid' | 'delivery_date' | 'delivery_address' | 'notes'>;

const EMPTY_ITEM: OrderItem = { product: '', quantity: 1, unit_price: 0 };

export function OrderDetail() {
  const { id } = useParams();
  const isNew = id === 'new';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<OrderForm | null>(null);
  const [meta, setMeta] = useState<Pick<Order, 'number' | 'created_at'> | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [composing, setComposing] = useState<MessageCategory | null>(null);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    supabase.from('customers').select('*').order('name').limit(2000).then(({ data }) => setCustomers((data as Customer[]) ?? []));
    if (isNew) {
      setForm({
        customer_id: params.get('customer') ?? '', status: 'quote', occasion: '', items: [{ ...EMPTY_ITEM }],
        gst_rate: 18, advance_paid: 0, delivery_date: null, delivery_address: '', notes: '',
      });
      return;
    }
    supabase.from('orders').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (!data) return navigate('/orders', { replace: true });
      const o = data as Order;
      setMeta({ number: o.number, created_at: o.created_at });
      setForm({
        customer_id: o.customer_id, status: o.status, occasion: o.occasion, items: o.items.length ? o.items : [{ ...EMPTY_ITEM }],
        gst_rate: Number(o.gst_rate), advance_paid: Number(o.advance_paid), delivery_date: o.delivery_date,
        delivery_address: o.delivery_address, notes: o.notes,
      });
    });
  }, [id, isNew, navigate, params]);

  const subtotal = useMemo(() => subtotalOf(form?.items ?? []), [form?.items]);
  if (!form) return <Spinner />;

  const gst = (subtotal * (Number(form.gst_rate) || 0)) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  const balance = Math.max(0, total - (Number(form.advance_paid) || 0));
  const customer = customers.find((c) => c.id === form.customer_id);

  const setItem = (i: number, patch: Partial<OrderItem>) =>
    setForm({ ...form, items: form.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  const chooseCustomer = (customerId: string) => {
    const c = customers.find((x) => x.id === customerId);
    // Fill the delivery address from the customer if it's still empty
    setForm({ ...form, customer_id: customerId, delivery_address: form.delivery_address || [c?.address, c?.city].filter(Boolean).join(', ') });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) return toast('Choose a customer', true);
    const items = form.items
      .filter((i) => i.product.trim())
      .map((i) => ({ product: i.product.trim(), quantity: Number(i.quantity) || 0, unit_price: Number(i.unit_price) || 0 }));
    const row = { ...form, items, total_amount: total, delivery_date: form.delivery_date || null };
    setSaving(true);
    const { data, error } = isNew
      ? await supabase.from('orders').insert({ ...row, created_by: profile?.id }).select('id').single()
      : await supabase.from('orders').update(row).eq('id', id).select('id').single();
    setSaving(false);
    if (error) return toast(error.message, true);
    toast(isNew ? 'Order created' : 'Saved');
    if (isNew) navigate(`/orders/${data.id}`, { replace: true });
  };

  const remove = async () => {
    if (!confirm(`Delete order ${meta ? orderNumber(meta.number) : ''}? This can't be undone.`)) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return toast(error.message, true);
    toast('Order deleted');
    navigate('/orders');
  };

  return (
    <>
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-olive hover:underline"><ArrowLeft size={14} /> All orders</Link>
      <PageHeader
        title={isNew ? 'New order' : orderNumber(meta!.number)}
        subtitle={meta ? `Created ${formatDate(meta.created_at)}` : undefined}
        actions={!isNew && (
          <>
            <OrderStatusBadge status={form.status} />
            {customer && (customer.email || customer.phone) && (
              <>
                <Button onClick={() => setComposing('proposal')}><FileText size={16} /> Send proposal</Button>
                <Button variant="secondary" onClick={() => setComposing('other')}><Send size={16} /> Send message</Button>
              </>
            )}
          </>
        )}
      />

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Customer *">
              <Select value={form.customer_id} onChange={(e) => chooseCustomer(e.target.value)} required>
                <option value="">Choose a customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
              </Select>
            </Field>
            <Field label="Occasion">
              <Input value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} placeholder="e.g. Diwali 2026" />
            </Field>
            <p className="text-xs text-gray-500 sm:col-span-2">
              {customer ? <Link to={`/customers/${customer.id}`} className="underline">Open {customer.name}</Link> : <>New customer? <Link to="/customers/new" className="underline">Add them first</Link>.</>}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Items</h2>
            <datalist id="products">{PRODUCT_SUGGESTIONS.map((p) => <option key={p} value={p} />)}</datalist>
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_90px_120px_110px_32px] gap-2 text-xs uppercase tracking-wide text-gray-500 sm:grid">
                <span>Product</span><span>Qty</span><span>Rate (₹)</span><span className="text-right">Amount</span><span />
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_32px] gap-2 rounded-lg border border-gray-100 p-2 sm:grid-cols-[1fr_90px_120px_110px_32px] sm:border-0 sm:p-0">
                  <Input list="products" placeholder="Product" value={item.product} onChange={(e) => setItem(i, { product: e.target.value })} className="col-span-1" />
                  <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600 sm:order-last" aria-label="Remove item"><X size={18} /></button>
                  <Input type="number" min={0} value={item.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} aria-label="Quantity" />
                  <Input type="number" min={0} step="0.01" value={item.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} aria-label="Rate" />
                  <span className="self-center text-right text-sm font-medium">{formatMoney((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</span>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" className="mt-2" onClick={() => setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] })}><Plus size={16} /> Add item</Button>

            <dl className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2">GST
                  <Input type="number" min={0} step="0.01" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: Number(e.target.value) })} className="!w-20 !py-1" aria-label="GST rate" />%
                </dt>
                <dd>{formatMoney(gst)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatMoney(total)}</dd></div>
            </dl>
          </Card>

          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Delivery date">
              <Input type="date" value={form.delivery_date ?? ''} onChange={(e) => setForm({ ...form, delivery_date: e.target.value || null })} />
            </Field>
            <div className="sm:col-span-2"><Field label="Delivery address"><Textarea rows={2} value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Notes" hint="Branding details, packaging, who to contact at delivery…"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
              </Select>
            </Field>
            <Field label="Advance received (₹)">
              <Input type="number" min={0} step="0.01" value={form.advance_paid} onChange={(e) => setForm({ ...form, advance_paid: Number(e.target.value) })} />
            </Field>
            <div className="rounded-lg bg-brand-off-white p-3 text-sm">
              <div className="flex justify-between"><span>Total</span><span>{formatMoney(total)}</span></div>
              <div className="flex justify-between font-semibold"><span>Balance due</span><span>{formatMoney(balance)}</span></div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving…' : isNew ? 'Create order' : 'Save order'}</Button>
          </Card>
          {!isNew && isAdmin(profile) && (
            <Button type="button" variant="danger" onClick={remove} className="w-full"><Trash2 size={16} /> Delete order</Button>
          )}
        </div>
      </form>

      {!isNew && (
        <div className="mt-6">
          <MessageHistory orderId={id} refreshKey={sentCount} />
        </div>
      )}

      {!isNew && customer && meta && (
        <ComposeMessage
          open={composing !== null}
          onClose={() => setComposing(null)}
          recipient={{ name: customer.name, email: customer.email, phone: customer.phone }}
          context={{
            customer,
            order: { ...form, id: id!, number: meta.number, created_at: meta.created_at, updated_at: meta.created_at, created_by: null, total_amount: total },
          }}
          defaultCategory={composing ?? 'other'}
          onSent={async () => {
            setSentCount((n) => n + 1);
            if (composing !== 'proposal' || !customer.source_lead_id) return;
            // The lead this customer came from is now at "Proposal sent"
            await supabase.from('leads').update({ status: 'proposal' })
              .eq('id', customer.source_lead_id).in('status', ['new', 'contacted', 'qualified']);
          }}
        />
      )}
    </>
  );
}
