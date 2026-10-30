/* ============================
   Helpers for page content from src/content/pages/*.json, which is edited
   in the admin panel (/admin → Website → Pages).
============================ */

// Photos uploaded from the admin keep their file names, which may contain spaces.
// Only spaces are encoded so full URLs (already encoded) pass through unchanged.
export const asset = (src: string) => src.replace(/ /g, '%20');
