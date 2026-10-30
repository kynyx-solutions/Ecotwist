/* ============================
   Photos for spots across the site, set from the admin panel (/admin → Website → "Photos to add").
   The list lives in src/content/site-images.json; a spot with no photo yet
   shows /placeholder.svg ("Photo coming soon").
============================ */

import data from '../content/site-images.json';

const PLACEHOLDER = '/placeholder.svg';

const photos = new Map(data.images.map(i => [i.id, i.image]));

export const hasSiteImage = (id: string) => !!photos.get(id);

// File names may contain spaces, so encode them for the URL
export const siteImage = (id: string) => {
  const src = photos.get(id);
  return src ? encodeURI(src) : PLACEHOLDER;
};
