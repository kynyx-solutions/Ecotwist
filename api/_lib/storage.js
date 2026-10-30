// Reads and writes repo files for the admin "Website" editor.
// - GITHUB_TOKEN set  → GitHub Contents API (each save is a commit; Vercel redeploys the site)
// - otherwise, dev    → the local files on disk
// - otherwise (live)  → refuse with a clear message
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const API = 'https://api.github.com';

export class StorageError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function storageMode() {
  if (process.env.GITHUB_TOKEN) return 'github';
  if (process.env.NODE_ENV !== 'production') return 'local';
  return null;
}

export function assertStorage() {
  if (!storageMode()) {
    throw new StorageError(500, 'Saving is not set up: add GITHUB_TOKEN (and GITHUB_REPO / GITHUB_BRANCH if different) in Vercel → Settings → Environment Variables, then redeploy.');
  }
}

export const savedMessage = () => (storageMode() === 'github' ? 'Live in about 2 minutes.' : 'Saved to your local files.');

// Same value git uses for a file, so local and GitHub shas look alike
export const blobSha = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');

// Repo-relative path with forward slashes, no "..", no leading slash
export function cleanPath(p) {
  const s = String(p ?? '').replace(/\\/g, '/');
  if (!s || s.startsWith('/') || s.split('/').some((part) => part === '..' || part === '.' || part === '')) {
    throw new StorageError(400, 'Invalid file path.');
  }
  return s;
}

/* ── GitHub ───────────────────────────────────────────────────── */

const repo = () => process.env.GITHUB_REPO || 'kynyx-solutions/Ecotwist';
const branch = () => process.env.GITHUB_BRANCH || 'main';
const contentsUrl = (p) => `${API}/repos/${repo()}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;

async function gh(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ecotwist-admin',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

function ghFail(status, json, what) {
  if (status === 401) return new StorageError(500, 'GitHub rejected GITHUB_TOKEN (expired or wrong). Ask the developer to renew it.');
  if (status === 403) return new StorageError(500, `GITHUB_TOKEN can't ${what} on ${repo()}. It needs "Contents: Read and write" access to this repo.`);
  return new StorageError(502, `GitHub error while trying to ${what}: ${json?.message ?? status}`);
}

/* ── Public API ───────────────────────────────────────────────── */

// Returns { buffer, sha } or null when the file doesn't exist
export async function readFile(p) {
  assertStorage();
  p = cleanPath(p);
  if (storageMode() === 'local') {
    try {
      const buffer = await fs.readFile(path.join(ROOT, p));
      return { buffer, sha: blobSha(buffer) };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }
  const { status, ok, json } = await gh(`${contentsUrl(p)}?ref=${encodeURIComponent(branch())}`);
  if (status === 404) return null;
  if (!ok) throw ghFail(status, json, 'read files');
  if (Array.isArray(json)) return null; // a folder
  let buffer = Buffer.from(json.content ?? '', 'base64');
  // Files over 1 MB come back without content: fetch the blob instead
  if (!buffer.length && json.size > 0) {
    const blob = await gh(`${API}/repos/${repo()}/git/blobs/${json.sha}`);
    if (!blob.ok) throw ghFail(blob.status, blob.json, 'read files');
    buffer = Buffer.from(blob.json.content, 'base64');
  }
  return { buffer, sha: json.sha };
}

// Names of the files directly inside a folder
export async function listDir(dir) {
  assertStorage();
  dir = cleanPath(dir);
  if (storageMode() === 'local') {
    const entries = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true }).catch(() => []);
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  }
  const { status, ok, json } = await gh(`${contentsUrl(dir)}?ref=${encodeURIComponent(branch())}`);
  if (status === 404) return [];
  if (!ok) throw ghFail(status, json, 'list files');
  return json.filter((e) => e.type === 'file').map((e) => e.name);
}

export async function exists(p) {
  assertStorage();
  p = cleanPath(p);
  if (storageMode() === 'local') {
    return fs.access(path.join(ROOT, p)).then(() => true, () => false);
  }
  const { status, ok, json } = await gh(`${contentsUrl(p)}?ref=${encodeURIComponent(branch())}`);
  if (status === 404) return false;
  if (!ok) throw ghFail(status, json, 'read files');
  return true;
}

// Writes a file. Pass the sha you last read to update (409 if it changed since);
// pass sha: null to create a new file (409 if it already exists). Returns the new sha.
export async function writeFile(p, buffer, { sha, message }) {
  assertStorage();
  p = cleanPath(p);
  const conflict = () => new StorageError(409, sha ? 'Someone else saved this page; reload to see their changes.' : 'A file with this name already exists.');

  if (storageMode() === 'local') {
    const full = path.join(ROOT, p);
    const current = await fs.readFile(full).catch(() => null);
    if (sha ? !current || blobSha(current) !== sha : current) throw conflict();
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return blobSha(buffer);
  }

  const body = { message, content: buffer.toString('base64'), branch: branch(), ...(sha ? { sha } : {}) };
  const { status, ok, json } = await gh(contentsUrl(p), { method: 'PUT', body: JSON.stringify(body) });
  // GitHub answers 409 for a stale sha and 422 when creating over an existing file
  if (status === 409 || (status === 422 && !sha)) throw conflict();
  if (!ok) throw ghFail(status, json, 'save files');
  return json.content.sha;
}
