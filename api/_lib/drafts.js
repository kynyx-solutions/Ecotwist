// Website drafts: admin saves wait in Supabase (public.content_drafts, and the
// "content-drafts" bucket for new photos) until someone presses Publish.
// See supabase/07-content-drafts.sql and api/admin/publish.js.
import { StorageError } from './storage.js';

export const BUCKET = 'content-drafts';

const missingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /content_drafts|content_publishes/.test(error.message ?? ''))
    ? new StorageError(500, 'Drafts are not set up yet: run supabase/07-content-drafts.sql in Supabase → SQL Editor.')
    : null;

function check(error) {
  if (!error) return;
  throw missingTable(error) ?? new StorageError(500, `Database error: ${error.message}`);
}

// The version string the editor sends back on save, so two people can't overwrite each other
export const draftVersion = (draft) => `draft:${draft.updated_at}`;

export async function getDraft(db, path) {
  const { data, error } = await db.from('content_drafts').select('*').eq('path', path).maybeSingle();
  check(error);
  return data;
}

export async function listDrafts(db) {
  const { data, error } = await db.from('content_drafts').select('path, kind, label, base_sha, updated_by, updated_at').order('updated_at', { ascending: false });
  check(error);
  return data ?? [];
}

export async function saveDraft(db, row) {
  const { data, error } = await db
    .from('content_drafts')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'path' })
    .select('*')
    .single();
  check(error);
  return data;
}

export async function deleteDraft(db, path) {
  const { data } = await db.from('content_drafts').select('kind').eq('path', path).maybeSingle();
  const { error } = await db.from('content_drafts').delete().eq('path', path);
  check(error);
  if (data?.kind === 'file') await db.storage.from(BUCKET).remove([path]);
}

// New photo: upload to the drafts bucket under its future repo path
export async function savePhotoDraft(db, path, buffer, contentType, who) {
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) {
    if (/bucket/i.test(error.message)) throw new StorageError(500, 'Drafts are not set up yet: run supabase/07-content-drafts.sql in Supabase → SQL Editor.');
    throw new StorageError(502, `Photo upload failed: ${error.message}`);
  }
  return saveDraft(db, { path, kind: 'file', label: path.split('/').pop(), content: null, base_sha: null, updated_by: who });
}

export async function readPhotoDraft(db, path) {
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) throw new StorageError(502, `Could not read the new photo ${path.split('/').pop()}. Remove it from the list and upload it again.`);
  return Buffer.from(await data.arrayBuffer());
}
