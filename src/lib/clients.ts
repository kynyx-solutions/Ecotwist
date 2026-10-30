/* ============================
   Client logos, added from the admin panel (/admin → Website → Clients).
   The list lives in src/content/clients.json and feeds the "Our Clients"
   slider and the "Trusted by" strips. Each of those stays hidden while the
   list is empty; a client with no logo shows its name instead.
============================ */

import data from '../content/clients.json';

export interface Client {
  name: string;
  logo: string; // URL, or "" for none
}

// File names may contain spaces, so encode them for the URL
export const clients: Client[] = data.clients.map(c => ({
  name: c.name,
  logo: c.logo ? encodeURI(c.logo) : '',
}));
