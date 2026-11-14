// "Publish changes" in the admin: puts every saved draft live at once.
//   GET  /api/admin/publish  → { drafts: [{ path, kind, label, updated_by, updated_at }], last: { ..., status } | null }
//   POST /api/admin/publish  → commits all drafts to GitHub in ONE commit (Vercel deploys once),
//                              then clears the drafts. { commit, url, files, message }
// Drafts come from api/admin/content.js (page/SEO/store saves) and api/admin/upload.js (photos).
import { requireStaff } from '../_lib/admin.js';
import { StorageError, assertStorage, commitFiles, deployStatus, readFile, storageMode } from '../_lib/storage.js';
import { BUCKET, listDrafts, readPhotoDraft } from '../_lib/drafts.js';

const json = (content) => Buffer.from(JSON.stringify(content, null, 2) + '\n');

export default async function handler(req, res) {
  const ctx = await requireStaff(req, res);
  if (!ctx) return;
  const { db } = ctx;

  try {
    assertStorage();

    if (req.method === 'GET') {
      const drafts = await listDrafts(db);
      const { data: last } = await db.from('content_publishes').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
      return res.status(200).json({ drafts, last: last ? { ...last, status: await deployStatus(last.commit_sha) } : null });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { data: drafts, error } = await db.from('content_drafts').select('*').order('path');
    if (error) throw new StorageError(500, `Database error: ${error.message}`);
    if (!drafts?.length) return res.status(400).json({ error: 'There are no saved changes to publish.' });

    // A developer may have changed one of these files since the draft started
    const clashes = [];
    for (const d of drafts.filter((x) => x.kind === 'json' && x.base_sha)) {
      const live = await readFile(d.path);
      if (live && live.sha !== d.base_sha) clashes.push(d.label || d.path);
    }
    if (clashes.length) {
      return res.status(409).json({
        error: `These were changed on the website since you started editing: ${clashes.join(', ')}. Discard those drafts (×), redo the edits, then publish.`,
      });
    }

    const files = [];
    for (const d of drafts) files.push({ path: d.path, buffer: d.kind === 'file' ? await readPhotoDraft(db, d.path) : json(d.content) });

    const who = ctx.profile.email || ctx.user.email || 'staff';
    const names = drafts.map((d) => d.label || d.path.split('/').pop());
    const message = `Publish ${drafts.length} website change${drafts.length > 1 ? 's' : ''} from the admin (by ${who})\n\n${names.map((n) => `- ${n}`).join('\n')}`;
    const commit = await commitFiles(files, message);

    // Published: clear exactly what went out (anything saved meanwhile stays as a draft)
    for (const d of drafts) {
      await db.from('content_drafts').delete().eq('path', d.path).eq('updated_at', d.updated_at);
    }
    const photos = drafts.filter((d) => d.kind === 'file').map((d) => d.path);
    if (photos.length) await db.storage.from(BUCKET).remove(photos);

    const fileList = drafts.map((d) => ({ path: d.path, label: d.label }));
    if (commit.sha) {
      await db.from('content_publishes').insert({ commit_sha: commit.sha, commit_url: commit.url, files: fileList, published_by: who });
    }
    return res.status(200).json({
      commit: commit.sha,
      url: commit.url,
      files: fileList,
      message: storageMode() === 'github' ? 'Published. The site will be live in about 2 minutes.' : 'Published to your local files.',
    });
  } catch (err) {
    if (err instanceof StorageError) return res.status(err.status).json({ error: err.message });
    console.error('[admin/publish]', err);
    return res.status(500).json({ error: 'Publishing failed. Nothing was changed; please try again.' });
  }
}
