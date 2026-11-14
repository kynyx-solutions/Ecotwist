// Admin SEO tools in one function (Vercel's Hobby plan allows 12 functions):
//   ?tool=pagespeed  → Google PageSpeed report (SEO → Page speed)
//   ?tool=keywords   → keyword tracker (SEO → Keywords)
//   ?tool=ideas      → trending keyword ideas from Google Autocomplete
import { requireStaff } from '../_lib/admin.js';
import { pagespeed } from '../_lib/pagespeed.js';
import { keywordIdeas, keywords } from '../_lib/keywords.js';

// PageSpeed often takes 20–40 s
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const ctx = await requireStaff(req, res);
  if (!ctx) return;
  const tool = String(req.query?.tool ?? '');
  if (tool === 'pagespeed') return pagespeed(req, res);
  if (tool === 'keywords') return keywords(req, res, ctx);
  if (tool === 'ideas') return keywordIdeas(req, res);
  return res.status(404).json({ error: 'Unknown SEO tool.' });
}
