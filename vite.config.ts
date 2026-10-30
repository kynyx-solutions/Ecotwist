import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';
import { writeSitemap } from './scripts/generate-sitemap.js';
import { webpPlugin } from './scripts/vite-plugin-webp.js';
import { apiPlugin } from './scripts/vite-plugin-api.js';

// The admin panel is its own app (admin/index.html). On the dev server, send
// /admin/<anything> to it, the way vercel.json does on the live site.
function adminFallbackPlugin(): Plugin {
  return {
    name: 'vite-plugin-admin-fallback',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '';
        if (/^\/admin(\/[^.]*)?(\?.*)?$/.test(url)) req.url = '/admin/index.html';
        next();
      });
    },
  };
}

function autoSitemapPlugin(): Plugin {
  return {
    name: 'vite-plugin-auto-sitemap',
    buildStart() {
      try {
        writeSitemap();
      } catch (err) {
        console.error('[sitemap] Error generating sitemap on build:', err);
      }
    },
    configureServer(server) {
      try {
        writeSitemap();
      } catch (err) {
        console.error('[sitemap] Error generating sitemap on server start:', err);
      }

      server.watcher.on('add', (filePath) => {
        if (filePath.includes('App.tsx') || filePath.includes('pages') || filePath.includes('public')) {
          writeSitemap();
        }
      });
      server.watcher.on('unlink', (filePath) => {
        if (filePath.includes('App.tsx') || filePath.includes('pages') || filePath.includes('public')) {
          writeSitemap();
        }
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [webpPlugin(), react(), tailwindcss(), autoSitemapPlugin(), apiPlugin(env), adminFallbackPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin/index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
