/* ============================
   Helpers for page content from src/content/pages/*.json, which is edited
   in the admin panel (/admin → Website → Pages).
============================ */

// Photos uploaded from the admin keep their file names, which may contain spaces.
// Only spaces are encoded so full URLs (already encoded) pass through unchanged.
export const asset = (src: string) => src.replace(/ /g, '%20');

// Smaller copies of every photo in public/ are made at build time
// (scripts/vite-plugin-webp.js): "<name>.w480.webp", ".w768.webp" and ".w1200.webp".
// Spread onto an <img> so phones download a phone-sized photo:
//   <img {...responsive(kit.image, '(min-width: 1024px) 33vw, 100vw')} alt="…" />
export const RESPONSIVE_WIDTHS = [480, 768, 1200] as const;
export function responsive(src: string, sizes: string) {
  const url = asset(src);
  if (!/^\/[^?#]*\.(png|jpe?g|webp)$/i.test(src)) return { src: url };
  const base = url.replace(/\.(png|jpe?g|webp)$/i, '');
  return {
    src: url,
    srcSet: [...RESPONSIVE_WIDTHS.map((w) => `${base}.w${w}.webp ${w}w`), `${url} 1600w`].join(', '),
    sizes,
  };
}
