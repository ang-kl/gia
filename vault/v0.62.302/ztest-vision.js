// ztest-vision.js — v0.62.202
//
// Visual-recognition FALLBACK for the /ztest set-menu scout: when the
// deterministic website scrape did NOT find the set-lunch / set-dinner /
// signature keyword (the menu doesn't specify in scrapeable text), fetch the
// venue's first Google-Places photo and ask Gemini (2.5-flash, multimodal)
// whether the image shows that menu/dish and, if so, the items + prices.
//
// Strictly fail-soft + NON-INVENTIVE: any fetch/parse/model error returns a
// null/empty result (the caller just omits the visual line); the prompt forbids
// inventing prices. Networks injectable for tests.

const axios = require('axios');

const PHOTO_TIMEOUT_MS = 6000;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const TYPE_LABEL = {
  'set-lunch':  'set lunch menu',
  'set-dinner': 'set dinner menu',
  'signature':  'signature dish',
  'chef':       "chef's recommendation"
};

// Fetch a Places (New) photo as base64. `photoName` is the Places resource name
// (e.g. "places/<id>/photos/<ref>"). The media endpoint 302-redirects to the
// image bytes; axios follows it. Returns { base64, mimeType } or null.
async function fetchPlacePhotoBase64({ photoName, apiKey, maxWidthPx = 800 }, _get = axios.get) {
  if (!photoName || !apiKey) return null;
  const url = 'https://places.googleapis.com/v1/' + photoName + '/media?maxWidthPx=' + maxWidthPx + '&key=' + apiKey;
  try {
    const res = await _get(url, {
      timeout: PHOTO_TIMEOUT_MS,
      maxRedirects: 4,
      responseType: 'arraybuffer',
      maxContentLength: MAX_PHOTO_BYTES
    });
    const mimeType = (res.headers && (res.headers['content-type'] || res.headers['Content-Type'])) || 'image/jpeg';
    if (!/^image\//i.test(mimeType)) return null;
    return { base64: Buffer.from(res.data).toString('base64'), mimeType: String(mimeType).split(';')[0].trim() };
  } catch {
    return null;
  }
}

function parseVisionJson(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const s = cleaned.indexOf('{');
  const e = cleaned.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

// Run Gemini vision over one photo. Returns { found, items:[{name,price}], note }
// or null on any failure. `_modelFactory` injectable for tests.
async function recognizeSetMenu({ base64, mimeType, type, geminiKey }, _modelFactory = null) {
  if (!base64 || !geminiKey) return null;
  const label = TYPE_LABEL[type] || 'set menu';
  const prompt = 'You are reading ONE photo from a restaurant\'s Google listing. Decide if it clearly shows a ' + label
    + ' — i.e. a menu board / printed menu / price list, or (for a signature dish) a clearly-presented signature plate.\n'
    + 'If yes, extract ONLY what is actually legible: the relevant item name(s) and the price(s) EXACTLY as printed.\n'
    + 'Reply with ONLY minified JSON: {"found":boolean,"items":[{"name":string,"price":string|null}],"note":string}.\n'
    + 'If the photo shows no readable ' + label + ' / price, return {"found":false,"items":[],"note":"no menu/price visible"}.\n'
    + 'NEVER invent a price or an item that is not legibly in the image.';
  try {
    let model;
    if (_modelFactory) {
      model = _modelFactory();
    } else {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      model = new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    }
    const r = await Promise.race([
      model.generateContent([prompt, { inlineData: { data: base64, mimeType: mimeType || 'image/jpeg' } }]),
      new Promise((_, rej) => setTimeout(() => rej(new Error('vision-timeout')), 15000))
    ]);
    const text = r && r.response && typeof r.response.text === 'function' ? r.response.text() : '';
    const parsed = parseVisionJson(text);
    if (!parsed || typeof parsed.found !== 'boolean') return null;
    const items = Array.isArray(parsed.items)
      ? parsed.items.filter((i) => i && i.name).slice(0, 4).map((i) => ({ name: String(i.name).slice(0, 80), price: i.price ? String(i.price).slice(0, 24) : null }))
      : [];
    return { found: !!parsed.found, items, note: parsed.note ? String(parsed.note).slice(0, 140) : '' };
  } catch {
    return null;
  }
}

// Convenience: fetch the photo then recognise. Returns the recognise result or
// null. Used by the /ztest handler for non-hit venues that have a photo.
async function visualScout({ photoName, type, apiKey, geminiKey }, deps = {}) {
  const photo = await (deps.fetchPhotoFn || fetchPlacePhotoBase64)({ photoName, apiKey });
  if (!photo) return null;
  return (deps.recognizeFn || recognizeSetMenu)({ base64: photo.base64, mimeType: photo.mimeType, type, geminiKey });
}

module.exports = { fetchPlacePhotoBase64, recognizeSetMenu, visualScout, parseVisionJson, TYPE_LABEL };
