/* ============================
   Build-time WebP conversion

   On `vite build`, every JPG/PNG the site uses is shipped as a WebP instead:
     - images imported in code (src/...)        -> emitted as hashed .webp assets
     - images in public/ (referenced by path)   -> written next to the original as
       <name>.webp, and references to "<name>.jpg" in the built JS/CSS point to it

   Originals are never changed, and `npm run dev` keeps serving them. A file is
   only swapped when its WebP is smaller. Large photos are scaled down to
   MAX_WIDTH; smaller ones keep their size.

   Converted files are cached in node_modules/.cache/webp, so later builds
   only convert new or changed images.
============================ */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const MAX_WIDTH = 2000; // px; wider images are scaled down, never up
const QUALITY = 82;     // WebP quality: visually the same as the original at normal viewing size
const IMAGE_RE = /\.(png|jpe?g)$/i;
const CACHE_DIR = path.resolve('node_modules/.cache/webp');
const SETTINGS = `w${MAX_WIDTH}-q${QUALITY}`;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const webpName = (file) => file.replace(IMAGE_RE, '.webp');

// Returns the WebP bytes, or null when the WebP would not be smaller
async function toWebp(source) {
  const hash = crypto.createHash('sha1').update(SETTINGS).update(source).digest('hex');
  const cached = path.join(CACHE_DIR, `${hash}.webp`);
  const skipped = path.join(CACHE_DIR, `${hash}.skip`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  if (fs.existsSync(skipped)) return null;

  const out = await sharp(source)
    .rotate() // apply the camera's EXIF orientation before metadata is dropped
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, alphaQuality: 90, smartSubsample: true, effort: 5 })
    .toBuffer();

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (out.length >= source.length) {
    fs.writeFileSync(skipped, '');
    return null;
  }
  fs.writeFileSync(cached, out);
  return out;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

/** @returns {import('vite').Plugin} */
export function webpPlugin() {
  let publicDir = '';
  let publicFiles = []; // { rel, webp: Buffer }
  let renames = [];     // [RegExp, replacement] for public file names
  const stats = { files: 0, before: 0, after: 0 };

  const count = (before, after) => {
    stats.files += 1;
    stats.before += before;
    stats.after += after;
  };

  return {
    name: 'vite-plugin-webp',
    apply: 'build',
    enforce: 'pre',

    configResolved(config) {
      publicDir = config.publicDir;
    },

    // Convert public/ images up front so their names can be rewritten in the bundle
    async buildStart() {
      publicFiles = [];
      if (!publicDir || !fs.existsSync(publicDir)) return;

      const images = walk(publicDir).filter((f) => IMAGE_RE.test(f));
      const results = await Promise.all(
        images.map(async (file) => {
          const source = fs.readFileSync(file);
          const webp = await toWebp(source);
          // Leave the file alone if a different .webp with that name already exists
          if (webp && fs.existsSync(webpName(file))) return { file, webp: null };
          if (webp) count(source.length, webp.length);
          return { file, webp };
        }),
      );

      // A name is rewritten only when every file with that name was converted,
      // so a file shared by two folders can't end up pointing at a missing WebP
      const byName = new Map();
      for (const r of results) {
        const name = path.basename(r.file);
        byName.set(name, (byName.get(name) ?? true) && r.webp !== null);
      }

      publicFiles = results
        .filter((r) => r.webp)
        .map((r) => ({ rel: path.relative(publicDir, r.file).split(path.sep).join('/'), webp: r.webp }));

      // Match the file name only as a whole path segment inside a string or url()
      renames = [...byName]
        .filter(([, ok]) => ok)
        .map(([name]) => [
          new RegExp(`(?<=[/"'\`(])${escapeRe(name)}(?=["'\`?#)])`, 'g'),
          webpName(name),
        ]);
    },

    // Images imported from code: ship the WebP in place of the original
    async load(id) {
      if (id.includes('?') || !IMAGE_RE.test(id)) return null;
      const source = fs.readFileSync(id);
      const webp = await toWebp(source);
      if (!webp) return null; // not smaller: let Vite handle the original
      count(source.length, webp.length);
      const ref = this.emitFile({ type: 'asset', name: webpName(path.basename(id)), source: webp });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },

    generateBundle(_, bundle) {
      for (const { rel, webp } of publicFiles) {
        this.emitFile({ type: 'asset', fileName: webpName(rel), source: webp });
      }

      for (const out of Object.values(bundle)) {
        if (out.type === 'chunk') {
          for (const [re, to] of renames) out.code = out.code.replace(re, to);
        } else if (out.fileName.endsWith('.css') && typeof out.source === 'string') {
          for (const [re, to] of renames) out.source = out.source.replace(re, to);
        }
      }

      if (stats.files) {
        const mb = (n) => (n / 1024 / 1024).toFixed(1);
        this.info(`${stats.files} images as WebP: ${mb(stats.before)} MB -> ${mb(stats.after)} MB`);
      }
    },
  };
}
