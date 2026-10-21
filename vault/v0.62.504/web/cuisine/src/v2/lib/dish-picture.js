// dish-picture.js — v0.62.407
//
// Resolve a dish to its authentic Wikipedia/Commons photo and open the image's
// SOURCE page — the Wikimedia Commons "File:" page (the photo plus its author +
// licence), per operator: open "the exact picture place source and not the
// whole page."
//
// No per-dish image is stored, so this is a RUNTIME lookup: hit the Wikipedia
// REST summary for the dish, read its lead image, then derive the Commons
// "File:" page from that image's filename. If the dish has no lead image, fall
// back to a Commons image SEARCH for the dish (still picture-scoped — never the
// prose article page the operator asked us to avoid).

import { openExternal } from '../../api/tg.js';

// Strip the trailing display qualifier so the query matches the article title,
// e.g. "Bak Kut Teh (Teochew)" → "Bak Kut Teh".
function cleanTitle(name) {
  return String(name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// v0.62.415 — split a dish name into its base and its REGIONAL qualifier, e.g.
// "Wanton Mee (SG style)" → { base: 'Wanton Mee', region: 'Singapore' }. The
// qualifier matters: a single Wikipedia lead image can't tell SG-style from
// HK-style wanton mee (the generic "Wonton noodles" article shows the HK one),
// so for a regionally-qualified dish we search Commons for base+region instead
// of opening the one generic photo. Dialect/place qualifiers (Teochew, Penang…)
// pass through verbatim. "style" is dropped.
const REGION_WORD = {
  sg: 'Singapore', singapore: 'Singapore', singaporean: 'Singapore',
  my: 'Malaysia', malaysia: 'Malaysia', malaysian: 'Malaysia',
  hk: 'Hong Kong', tw: 'Taiwan', ph: 'Philippines', id: 'Indonesia',
  th: 'Thailand', jp: 'Japan', kr: 'Korea', vn: 'Vietnam',
};
function splitQualifier(name) {
  const s = String(name || '').trim();
  const m = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { base: s, region: '' };
  let q = m[2].trim().replace(/\bstyle\b/i, '').trim();
  q = REGION_WORD[q.toLowerCase()] || q;
  return { base: m[1].trim(), region: q };
}

// Derive the bare "File:" filename from a Wikimedia image URL. Handles both
// originals (.../commons/a/ab/Foo.jpg) and thumbnails, whose real filename sits
// one segment BEFORE the size suffix (.../thumb/a/ab/Foo.jpg/320px-Foo.jpg).
function fileNameFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const ti = parts.indexOf('thumb');
    if (ti !== -1 && parts.length > ti + 3) return decodeURIComponent(parts[ti + 3]);
    return decodeURIComponent(parts[parts.length - 1]);
  } catch { return ''; }
}

function commonsFilePage(fileName) {
  return 'https://commons.wikimedia.org/wiki/File:' +
    encodeURIComponent(fileName.replace(/ /g, '_'));
}

function commonsSearch(title) {
  return 'https://commons.wikimedia.org/w/index.php?search=' +
    encodeURIComponent(title) + '&title=Special:MediaSearch&type=image';
}

export async function openDishPicture(dishName) {
  const title = cleanTitle(dishName);
  if (!title) return;
  // v0.62.415 — regionally-qualified dish (e.g. "Wanton Mee (SG style)"): the
  // generic Wikipedia article shows the wrong variant, so go straight to a
  // Commons image search scoped by region ("Wanton Mee Singapore") — the user
  // gets the correct regional photos instead of one wrong lead image.
  const { base, region } = splitQualifier(dishName);
  if (region) { openExternal(commonsSearch(`${base} ${region}`)); return; }
  const fallback = commonsSearch(title);
  try {
    const res = await fetch(
      'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title),
      { headers: { accept: 'application/json' } }
    );
    if (res.ok) {
      const j = await res.json();
      const src = (j.originalimage && j.originalimage.source) ||
                  (j.thumbnail && j.thumbnail.source) || '';
      const file = src ? fileNameFromUrl(src) : '';
      if (file) { openExternal(commonsFilePage(file)); return; }
    }
  } catch { /* fall through to the Commons image search */ }
  openExternal(fallback);
}
