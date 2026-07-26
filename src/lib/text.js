// Combining diacritical marks, U+0300–U+036F.
const COMBINING = /[̀-ͯ]/g

/* Fold a string for searching: lowercase and strip accents, so "turk" finds
   Türkiye and "zurich" finds Zürich. Nobody reaches for the umlaut key
   mid-search. */
export const fold = (v) =>
  (v ?? '').toString().toLowerCase().normalize('NFD').replace(COMBINING, '')
