// Emails for website store orders: an alert to the team and a confirmation to the customer.
// Sent once a paid order is confirmed, or right away for a 500+ quote request.
// Needs RESEND_API_KEY (and ALERT_FROM_EMAIL / MAIL_FROM); without it nothing is sent.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function send(apiKey, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

function table(order) {
  const items = order.items ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const total = Number(order.total_amount);
  const quote = items.some((i) => i.quote_only);
  const delivery = Number(order.delivery_fee ?? 0);
  const rows = items.map((i) => `<tr>
    <td style="padding:8px 12px 8px 0;border-bottom:1px solid #eee"><b>${esc(i.product)}</b><br><span style="color:#666;font-size:13px">${esc(i.branding)}${i.brand_text ? ` · "${esc(i.brand_text)}"` : ''}${i.logo_path ? ' · logo uploaded' : ''}</span></td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${esc(i.quantity_label ?? i.quantity)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${i.quote_only ? 'Quote' : inr(i.quantity * i.unit_price)}</td></tr>`).join('');
  return `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%;max-width:560px">
    <tr><th align="left" style="padding-bottom:6px">Item</th><th align="right" style="padding:0 12px 6px">Qty</th><th align="right" style="padding-bottom:6px">Amount</th></tr>
    ${rows}
    <tr><td colspan="2" style="padding:8px 12px 0 0;text-align:right">Subtotal</td><td style="padding-top:8px;text-align:right">${inr(subtotal)}</td></tr>
    <tr><td colspan="2" style="padding:4px 12px 0 0;text-align:right">GST ${Number(order.gst_rate)}%</td><td style="padding-top:4px;text-align:right">${inr(total - subtotal - delivery)}</td></tr>
    <tr><td colspan="2" style="padding:4px 12px 0 0;text-align:right">Delivery</td><td style="padding-top:4px;text-align:right">${quote ? 'Quoted' : delivery ? inr(delivery) : 'Free'}</td></tr>
    <tr><td colspan="2" style="padding:4px 12px 0 0;text-align:right"><b>${quote ? 'Total (excl. quoted items)' : 'Total'}</b></td><td style="padding-top:4px;text-align:right"><b>${inr(total)}</b></td></tr></table>`;
}

export async function sendOrderEmails(db, order, { paid }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const c = order.contact ?? {};
  const orderNo = `ECO-${order.number}`;

  const { data } = await db.from('settings').select('value').eq('key', 'lead_alert_emails').maybeSingle();
  const team = Array.isArray(data?.value) ? data.value.filter((e) => EMAIL_RE.test(e)) : [];

  if (team.length) {
    await send(apiKey, {
      from: process.env.ALERT_FROM_EMAIL || 'Ecotwist <onboarding@resend.dev>',
      to: team,
      reply_to: c.email,
      subject: paid ? `Paid order ${orderNo}: ${c.company} (${inr(order.total_amount)})` : `Quote request ${orderNo}: ${c.company}`,
      html: `<h2 style="font-family:sans-serif">${paid ? `New paid order ${orderNo}` : `New 500+ quote request ${orderNo}`}</h2>
        <p style="font-family:sans-serif">${esc(c.name)} · ${esc(c.company)} · ${esc(c.email)} · ${esc(c.phone)}${c.gstin ? ` · GST ${esc(c.gstin)}` : ''}</p>
        ${table(order)}
        <p style="font-family:sans-serif"><a href="https://ecotwist.in/admin/orders/${order.id}">Open the order in admin</a> to download logos and send the mockup.</p>`,
    });
  }

  if (!c.email) return;
  await send(apiKey, {
    from: process.env.MAIL_FROM || process.env.ALERT_FROM_EMAIL || 'Ecotwist <onboarding@resend.dev>',
    to: [c.email],
    reply_to: team[0],
    subject: paid ? `Payment received: your Ecotwist order ${orderNo}` : `We've received your quote request ${orderNo}`,
    html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;max-width:560px">
      <h2>Thank you, ${esc(String(c.name ?? '').split(' ')[0])}!</h2>
      ${paid
        ? `<p>We've received your payment of <b>${inr(order.total_amount)}</b> for order <b>${orderNo}</b> (${esc(c.company)}). Here's what happens next:</p>
           <ol><li>Within 2 working days we email a mockup showing your branding.</li>
           <li>Once you approve it, we produce your gifts.</li>
           <li>We deliver them with a GST invoice.</li></ol>`
        : `<p>We've received your quote request <b>${orderNo}</b> for ${esc(c.company)}. We will email you a quote and a branded mockup within 2 working days.</p>`}
      ${table(order)}
      <p>Questions? Just reply to this email or WhatsApp +91 70913 23777.</p>
      <p>Team Ecotwist</p></div>`,
  });
}
