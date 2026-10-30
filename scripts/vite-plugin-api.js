/* ============================
   Run the Vercel functions in api/ on the dev server

   On Vercel, api/<name>.js answers /api/<name>. `npm run dev` doesn't do that
   by itself, so this plugin loads the same file and calls it with the small
   part of Vercel's req/res helpers the functions use (req.query, req.body,
   res.status/json/send/redirect). Server-only variables from .env.local
   (e.g. SUPABASE_SERVICE_ROLE_KEY) are passed in via process.env.
============================ */

import fs from 'fs';
import path from 'path';

/** @returns {import('vite').Plugin} */
export function apiPlugin(env) {
  return {
    name: 'vite-plugin-api',
    apply: 'serve',
    configureServer(server) {
      for (const [k, v] of Object.entries(env)) process.env[k] ??= v;

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        // Same rewrite as vercel.json: the live blog sitemap is a function
        if (url.pathname === '/sitemap-blog.xml') url.pathname = '/api/sitemap-blog';
        const match = /^\/api\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)$/.exec(url.pathname);
        if (!match) return next();
        const file = path.resolve('api', `${match[1]}.js`);
        if (!fs.existsSync(file)) return next();

        try {
          const raw = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (c) => (data += c));
            req.on('end', () => resolve(data));
            req.on('error', reject);
          });
          req.query = Object.fromEntries(url.searchParams);
          req.body = raw && String(req.headers['content-type']).includes('application/json') ? JSON.parse(raw) : raw;

          res.status = (code) => ((res.statusCode = code), res);
          res.json = (obj) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(obj));
            return res;
          };
          res.send = (body) => (res.end(typeof body === 'string' ? body : JSON.stringify(body)), res);
          res.redirect = (code, location) => {
            res.statusCode = typeof code === 'number' ? code : 302;
            res.setHeader('Location', typeof code === 'number' ? location : code);
            res.end();
            return res;
          };

          const mod = await server.ssrLoadModule(file);
          await mod.default(req, res);
        } catch (err) {
          console.error(`[api] /api/${match[1]} failed`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal error');
          }
        }
      });
    },
  };
}
