import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Pages are pre-rendered to HTML at build time (scripts/prerender.mjs): take over that
// HTML instead of rebuilding it. Pages that weren't pre-rendered start empty.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
