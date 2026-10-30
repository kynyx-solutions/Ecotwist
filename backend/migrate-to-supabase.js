// One-off: copy the old MongoDB form submissions into Supabase "leads",
// so past enquiries show up in the admin panel.
//
//   cd backend && npm install
//   MONGO_URI="..." SUPABASE_URL="https://xxxx.supabase.co" SUPABASE_SERVICE_ROLE_KEY="..." node migrate-to-supabase.js
//
// Add --dry-run to only print what would be copied. Safe to run twice:
// rows already copied (same Mongo id) are skipped.
const mongoose = require("mongoose");

const { MONGO_URI, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const DRY_RUN = process.argv.includes("--dry-run");

if (!MONGO_URI || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set MONGO_URI, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const s = (v) => (v == null ? "" : String(v));

async function existingMongoIds() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=mongoId:data->>mongoId&data->>mongoId=not.is.null&limit=100000`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  return new Set((await res.json()).map((r) => r.mongoId));
}

// Returns false when a row is a duplicate (an email already on the newsletter list)
async function insert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (res.status === 409) return false;
  if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} ${await res.text()}`);
  return true;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const done = await existingMongoIds();

  const contacts = await db.collection("contacts").find().toArray();
  const proposals = await db.collection("configurators").find().toArray();
  const subscribers = await db.collection("newsletters").find().toArray();

  const rows = [
    ...contacts.map((c) => ({
      type: "contact",
      created_at: (c.submittedAt ?? c._id.getTimestamp()).toISOString(),
      name: s(c.name), company: s(c.company), email: s(c.email), phone: s(c.phone),
      interest: s(c.interest), message: s(c.message),
      data: { mongoId: String(c._id), source: "mongodb" },
    })),
    ...proposals.map((p) => ({
      type: "proposal",
      created_at: (p.submittedAt ?? p._id.getTimestamp()).toISOString(),
      name: s(p.name), company: s(p.company), email: s(p.email), phone: s(p.phone),
      occasion: s(p.occasion), product: s(p.product), budget: s(p.budget),
      quantity: s(p.quantity), branding: s(p.branding), submission_id: s(p.submissionId),
      data: { mongoId: String(p._id), source: "mongodb" },
    })),
    ...subscribers.map((n) => ({
      type: "newsletter",
      created_at: (n.subscribedAt ?? n._id.getTimestamp()).toISOString(),
      email: s(n.email),
      data: { mongoId: String(n._id), source: "mongodb" },
    })),
  ].filter((r) => !done.has(r.data.mongoId));

  console.log(`Found ${contacts.length} contact, ${proposals.length} proposal, ${subscribers.length} newsletter records; ${rows.length} not copied yet.`);
  if (DRY_RUN) {
    rows.slice(0, 5).forEach((r) => console.log(r));
  } else {
    const enquiries = rows.filter((r) => r.type !== "newsletter");
    for (let i = 0; i < enquiries.length; i += 200) await insert(enquiries.slice(i, i + 200));
    // One at a time, so an email that is already subscribed only skips itself
    let skipped = 0;
    for (const r of rows.filter((r) => r.type === "newsletter")) if (!(await insert([r]))) skipped++;
    console.log(`Copied ${rows.length - skipped} records into Supabase (${skipped} duplicate newsletter emails skipped).`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
