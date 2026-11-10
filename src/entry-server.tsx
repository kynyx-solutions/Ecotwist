// Build-time pre-rendering: renders one route of the website to HTML.
// Used by scripts/prerender.mjs after `vite build`; never shipped to the browser.
import { StrictMode } from 'react';
import { prerender } from 'react-dom/static';
import { StaticRouter } from 'react-router-dom';
import { AppShell } from './App';

export async function render(url: string): Promise<string> {
  const { prelude } = await prerender(
    <StrictMode>
      <StaticRouter location={url}>
        <AppShell />
      </StaticRouter>
    </StrictMode>,
  );
  const reader = prelude.getReader();
  const decoder = new TextDecoder();
  let html = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}
