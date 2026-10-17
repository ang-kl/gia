// currency-format.js — v0.61.360 venue-card price-range formatter.
//
// Operator: don't use the 💲 emoji on venue cards. Use the country
// currency prefix ("S$", "M$", "US$", "¥", "€" …) followed by the
// numeric price range. When the user's region differs from the
// venue's, append a parenthetical, marked-up, approximate ("≈")
// conversion into the user's currency.
//
// Examples:
//   SG user, SG venue: "S$25–40"
//   US user, SG venue: "S$25–40 (≈US$19.02–30.43)"
//   SG user, MY venue: "M$50–80 (≈S$14.91–23.85)"
//   priceRange missing: null  (caller drops the line)
//
// FX architecture (v0.61.360) — operator: "currently only in Malaysia
// that is rigid with fixed foreign currency exchange rate". The old
// Frankfurter-only path (ECB, ~33 majors) did NOT cover TWD / VND /
// MOP / BND, so those picker countries fell back to no-conversion.
//
// New model: a USD-pivot rate table.
//   • usdRate(CUR) = USD per 1 unit of CUR, fetched ONCE then cached
//     15 days (operator: "real time only once … 15 days").
//     Primary source  : Alpha Vantage CURRENCY_EXCHANGE_RATE
//                       (process.env.ALPHAVANTAGE_API_KEY; 25 req/day
//                        free tier — hence the long cache + lazy fetch).
//     Fallback source : Frankfurter (no key) when Alpha Vantage is
//                       rate-limited / unreachable.
//   • fetchFxRate(a,b) = usdRate(a) / usdRate(b)  → any-to-any cross
//     rate, so every picker currency converts even if one leg is a
//     "rigid" currency the ECB feed omits.
//
// Traveller honesty (operator): the converted value is an ESTIMATE, so
//   • apply a +2.8% markup (real card/cash spreads), and
//   • round UP — to 2 dp for currencies with cents, to a whole number
//     for no-cents currencies (JPY / KRW / VND / IDR …), and
//   • prefix the parenthetical with "≈" to mark it approximate.
// The native venue-currency range is the real menu price — never
// marked up. Any FX failure → silently drop the parenthetical.

// ISO 3166-1 alpha-2 country → display prefix.
const COUNTRY_PREFIX = {
  SG: 'S$',  MY: 'M$',  US: 'US$', CA: 'C$',  HK: 'HK$', TW: 'NT$',
  MO: 'MOP$', BN: 'B$',
  AU: 'A$',  NZ: 'NZ$', JP: '¥',   CN: '¥',   KR: '₩',   TH: '฿',
  VN: '₫',   ID: 'Rp',  PH: '₱',   IN: '₹',   GB: '£',   CH: 'CHF ',
  // EU zone — pre-2025 callers using ISO-3166 will pass DE/FR/IT/…
  DE: '€',   FR: '€',   IT: '€',   ES: '€',   PT: '€',   NL: '€',
  BE: '€',   AT: '€',   IE: '€',   FI: '€',   GR: '€',   LU: '€'
};

// ISO 4217 currency → display prefix. Used as a secondary lookup when
// we have the currencyCode from Places' priceRange but no country.
const CURRENCY_PREFIX = {
  SGD: 'S$',  MYR: 'M$',  USD: 'US$', CAD: 'C$',  HKD: 'HK$', TWD: 'NT$',
  AUD: 'A$',  NZD: 'NZ$', JPY: '¥',   CNY: '¥',   KRW: '₩',   THB: '฿',
  VND: '₫',   IDR: 'Rp',  PHP: '₱',   INR: '₹',   GBP: '£',   CHF: 'CHF ',
  EUR: '€',
  // v0.61.361 — Option B device currencies: a few widely-recognised
  // symbols so a traveller's home currency renders cleanly. Everything
  // else falls back to the "CODE " prefix (e.g. "SEK 320").
  MOP: 'MOP$', BND: 'B$',  BRL: 'R$',  RUB: '₽',   TRY: '₺',   ILS: '₪',
  AED: 'AED ', SAR: 'SAR ', ZAR: 'R',  MXN: 'Mex$', NGN: '₦'
};

function prefixForCountry(countryCode) {
  if (!countryCode) return null;
  const cc = String(countryCode).toUpperCase();
  return COUNTRY_PREFIX[cc] || null;
}

function prefixForCurrency(currencyCode) {
  if (!currencyCode) return null;
  const cc = String(currencyCode).toUpperCase();
  return CURRENCY_PREFIX[cc] || `${cc} `;
}

// Map an ISO-3166-1 alpha-2 country → ISO-4217 currency code. Used to
// resolve BOTH the venue currency and — for Option B (v0.61.361) — the
// user's *device* home currency, which can be any of ~170 nations.
// Falls back to null for unknowns (caller then drops the conversion).
const COUNTRY_TO_CURRENCY = {
  // — Asia-Pacific (picker + neighbours) —
  SG: 'SGD', MY: 'MYR', HK: 'HKD', TW: 'TWD', MO: 'MOP', BN: 'BND',
  JP: 'JPY', CN: 'CNY', KR: 'KRW', TH: 'THB', VN: 'VND', ID: 'IDR',
  PH: 'PHP', IN: 'INR', AU: 'AUD', NZ: 'NZD', KH: 'KHR', LA: 'LAK',
  MM: 'MMK', BD: 'BDT', LK: 'LKR', NP: 'NPR', PK: 'PKR', BT: 'BTN',
  MV: 'MVR', MN: 'MNT', FJ: 'FJD', PG: 'PGK',
  // — North America —
  US: 'USD', CA: 'CAD', MX: 'MXN',
  // — Central America & Caribbean —
  GT: 'GTQ', BZ: 'BZD', SV: 'USD', HN: 'HNL', NI: 'NIO', CR: 'CRC',
  PA: 'USD', CU: 'CUP', DO: 'DOP', JM: 'JMD', TT: 'TTD', BS: 'BSD',
  BB: 'BBD', HT: 'HTG',
  // — South America —
  BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', VE: 'VES',
  EC: 'USD', BO: 'BOB', PY: 'PYG', UY: 'UYU', GY: 'GYD', SR: 'SRD',
  // — Eurozone —
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
  SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', CY: 'EUR',
  MT: 'EUR', HR: 'EUR', AD: 'EUR', MC: 'EUR', SM: 'EUR', VA: 'EUR',
  ME: 'EUR', XK: 'EUR',
  // — Rest of Europe —
  GB: 'GBP', CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', RS: 'RSD',
  UA: 'UAH', RU: 'RUB', BY: 'BYN', MD: 'MDL', MK: 'MKD', BA: 'BAM',
  AL: 'ALL', TR: 'TRY', GE: 'GEL', AM: 'AMD', AZ: 'AZN', LI: 'CHF',
  // — Middle East —
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  JO: 'JOD', LB: 'LBP', IL: 'ILS', IQ: 'IQD', IR: 'IRR', YE: 'YER',
  SY: 'SYP',
  // — Africa —
  EG: 'EGP', ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS', MA: 'MAD',
  TN: 'TND', DZ: 'DZD', ET: 'ETB', TZ: 'TZS', UG: 'UGX', RW: 'RWF',
  ZM: 'ZMW', ZW: 'ZWL', MU: 'MUR', BW: 'BWP', NA: 'NAD', AO: 'AOA',
  MZ: 'MZN', SN: 'XOF', CI: 'XOF', CM: 'XAF', GA: 'XAF', LY: 'LYD',
  SD: 'SDG'
};

function currencyForCountry(countryCode) {
  if (!countryCode) return null;
  return COUNTRY_TO_CURRENCY[String(countryCode).toUpperCase()] || null;
}

// 15-day cache TTL for the USD-pivot table (operator: "real time only
// once … 15 days"). Long TTL is also what keeps us inside Alpha
// Vantage's 25-req/day free tier.
const USD_RATE_TTL_S = 15 * 24 * 3600;
const FX_TIMEOUT_MS = 8000;

function fxTimeout() {
  // 8 s upper bound so a degraded FX API never stalls venue rendering.
  return AbortSignal.timeout ? AbortSignal.timeout(FX_TIMEOUT_MS) : undefined;
}

// fetchUsdRateAlphaVantage(cur) → Promise<number|null>
//   USD per 1 unit of `cur`, via Alpha Vantage CURRENCY_EXCHANGE_RATE.
//   Returns null when: no API key, network/parse failure, or the
//   rate-limit envelope (`Information` / `Note`) — so the caller falls
//   through to Frankfurter and/or keeps the cached value.
async function fetchUsdRateAlphaVantage(cur) {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE`
      + `&from_currency=${encodeURIComponent(cur)}&to_currency=USD`
      + `&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: fxTimeout() });
    if (!res.ok) return null;
    const json = await res.json();
    // Free-tier throttle / informational envelope → treat as a miss.
    if (json && (json.Information || json.Note || json['Error Message'])) return null;
    const r = json?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
    const n = Number(r);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

// fetchUsdRateFrankfurter(cur) → Promise<number|null>
//   USD per 1 unit of `cur`, via Frankfurter (no key). Fallback only.
//   Frankfurter omits the "rigid" currencies (TWD/VND/MOP/BND); for
//   those this also returns null and the parenthetical is dropped.
async function fetchUsdRateFrankfurter(cur) {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(cur)}&to=USD`, {
      signal: fxTimeout()
    });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.rates?.USD;
    return Number.isFinite(r) && r > 0 ? r : null;
  } catch {
    return null;
  }
}

// v0.62.6 — USD-per-unit BASELINE table + plausibility guard. Operator
// (deployed VN bug): ₫300000 rendered as ≈S$129162 — a corrupt/inverted FX
// leg (VND is Frankfurter-OMITTED so it relies on Alpha Vantage + cache).
// These approximate fixed rates (snapshot ~2026-06, USD per 1 unit) serve two
// jobs: (1) authoritative fallback for the "rigid" Frankfurter-omitted
// currencies (VND/TWD/MOP/BND) and the SE-Asian long tail; (2) a sanity
// reference so a cached/fetched rate more than BASELINE_TOLERANCE× off the
// baseline (a real FX move never is — only corruption/inversion) is rejected.
const USD_RATE_BASELINE = Object.freeze({
  USD: 1.0,
  // SE-Asia (picker belt + neighbours)
  SGD: 0.778, MYR: 0.246, THB: 0.0305, IDR: 0.0000557, PHP: 0.0163,
  VND: 0.0000390, BND: 0.778, KHR: 0.000245, LAK: 0.0000462, MMK: 0.000476,
  // East-Asia (Michelin picker)
  JPY: 0.00624, KRW: 0.000656, CNY: 0.148, HKD: 0.128, TWD: 0.0315, MOP: 0.124,
  // common home currencies
  INR: 0.0105, AUD: 0.706, NZD: 0.584, CAD: 0.718, GBP: 1.340, EUR: 1.157,
  CHF: 1.257, AED: 0.272, SAR: 0.267
});
const BASELINE_TOLERANCE = 5;      // accept a live rate within ±5× of baseline
const RATE_ABS_MIN = 1e-7;         // loose absolute band for currencies w/o a baseline
const RATE_ABS_MAX = 1e4;

// sanitizeUsdRate(cur, val) → number | null
//   Guards a candidate USD-per-unit rate. With a baseline: accept the candidate
//   only when within ±BASELINE_TOLERANCE× (else fall back to the fixed baseline
//   — this is what stops a corrupt/inverted VND or SGD leg rendering S$129k).
//   Without a baseline: accept only within a loose absolute band, else null.
function sanitizeUsdRate(cur, val) {
  const c = String(cur || '').toUpperCase();
  const base = USD_RATE_BASELINE[c];
  const ok = Number.isFinite(val) && val > 0;
  if (base != null) {
    if (ok && val >= base / BASELINE_TOLERANCE && val <= base * BASELINE_TOLERANCE) return val;
    return base;   // missing / implausibly-far candidate → the fixed baseline
  }
  if (ok && val >= RATE_ABS_MIN && val <= RATE_ABS_MAX) return val;
  return null;     // no baseline + garbage candidate → drop (caller omits parens)
}

// usdRate(cur, redis) → Promise<number|null>
//   USD per 1 unit of `cur`. USD short-circuits to 1.0. Reads the 15-day Redis
//   cache (fx:usd:<CUR>); a cached value is used ONLY if it passes the
//   plausibility guard (so a stale/corrupt cache can't render S$129k). On miss
//   / rejection, tries Alpha Vantage then Frankfurter, guards the result
//   (baseline fallback), and re-caches the sanitized value (self-healing).
async function usdRate(cur, redis) {
  const c = String(cur || '').toUpperCase();
  if (!c) return null;
  if (c === 'USD') return 1.0;
  const cacheKey = `fx:usd:${c}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached != null) {
        const n = Number(cached);
        // Trust the cache only when it survives the guard unchanged; otherwise
        // it's corrupt → fall through to re-fetch + heal.
        if (Number.isFinite(n) && n > 0 && sanitizeUsdRate(c, n) === n) return n;
      }
    } catch { /* cache miss is non-fatal */ }
  }
  let rate = await fetchUsdRateAlphaVantage(c);
  if (rate == null) rate = await fetchUsdRateFrankfurter(c);
  rate = sanitizeUsdRate(c, rate);   // reject inverted/garbage live value → baseline
  if (!Number.isFinite(rate) || rate <= 0) return null;
  if (redis) {
    // v0.62.6 — node-redis v4 is camelCase `setEx` (was `setex` → silently
    // threw, so this module NEVER cached → every render re-hit Alpha Vantage).
    try { await redis.setEx(cacheKey, USD_RATE_TTL_S, String(rate)); }
    catch { /* setEx failure is non-fatal */ }
  }
  return rate;
}

// fetchFxRate(from, to, redis) → Promise<number|null>.
//   from/to: 3-letter ISO-4217 codes (e.g. "SGD", "USD").
//   redis:   optional ioredis client; when present, caches the USD legs
//            for 15 days.
// Cross-rate via the USD pivot: (USD per 1 `from`) / (USD per 1 `to`),
// which equals how many `to` units 1 `from` unit buys. Same currencies
// short-circuit to 1.0; any failed leg → null.
async function fetchFxRate(from, to, redis) {
  if (!from || !to) return null;
  const a = String(from).toUpperCase();
  const b = String(to).toUpperCase();
  if (a === b) return 1.0;
  const ra = await usdRate(a, redis); // USD per 1 a
  const rb = await usdRate(b, redis); // USD per 1 b
  if (!Number.isFinite(ra) || ra <= 0 || !Number.isFinite(rb) || rb <= 0) return null;
  return ra / rb;
}

// Traveller FX markup (operator: "2.8% across all"). Applied to the
// converted (parenthetical) value only — never to the native price.
const FX_MARKUP = 1.028;

// Currencies with no minor (fractional) unit — render & round to whole
// numbers. Operator-named JPY/KRW/VND/IDR plus the ISO 4217 zero-decimal
// set, so the 170-nation long tail rounds sensibly too. (IDR is
// nominally 2-decimal but is quoted whole in practice — operator's call.)
const NO_CENTS = new Set([
  'JPY', 'KRW', 'VND', 'IDR',
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'KMF', 'PYG', 'RWF',
  'UGX', 'VUV', 'XAF', 'XOF', 'XPF'
]);

// convAmount(n, userCurrency) — apply the +2.8% markup and ROUND UP:
// whole numbers for no-cents currencies, otherwise to 2 dp. Returns the
// formatted string for the parenthetical conversion.
function convAmount(n, userCurrency) {
  if (!Number.isFinite(n)) return '';
  const m = n * FX_MARKUP;
  const cur = String(userCurrency || '').toUpperCase();
  if (NO_CENTS.has(cur)) return String(Math.ceil(m));
  return (Math.ceil(m * 100) / 100).toFixed(2);
}

function fmtNative(n) {
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// formatPriceRangeForVenue(priceRange, venueCountry, userCountry, redis)
//   → Promise<string|null>
//
// priceRange:    { currencyCode, start, end }  (from pipeline.normalisePriceRange)
// venueCountry:  ISO-3166 alpha-2 (e.g. 'SG'); may be null — falls
//                back to the currencyCode-derived prefix.
// userCountry:   ISO-3166 alpha-2 (e.g. 'US'); when equal to venueCountry
//                (or null) the conversion-in-parens is omitted.
// redis:         optional ioredis client for FX cache.
//
// Returns null when priceRange is unusable.
async function formatPriceRangeForVenue(priceRange, venueCountry, userCountry, redis) {
  if (!priceRange) return null;
  const { currencyCode, start, end } = priceRange;
  // Pick venue prefix: prefer the country (operator-specified
  // "S$" / "M$"), fall back to the currencyCode mapping.
  const vPrefix = prefixForCountry(venueCountry) || prefixForCurrency(currencyCode);
  if (!vPrefix) return null;
  const native = (() => {
    if (start != null && end != null && start !== end) return `${vPrefix}${fmtNative(start)}–${fmtNative(end)}`;
    if (start != null) return `${vPrefix}${fmtNative(start)}`;
    if (end != null)   return `${vPrefix}${fmtNative(end)}`;
    return null;
  })();
  if (!native) return null;
  // Same-country (or unknown user country) → no parens conversion.
  if (!userCountry || !venueCountry || String(userCountry).toUpperCase() === String(venueCountry).toUpperCase()) {
    return native;
  }
  // Cross-border → fetch FX and append parens.
  const userCurrency = currencyForCountry(userCountry);
  if (!userCurrency || !currencyCode) return native;
  const rate = await fetchFxRate(currencyCode, userCurrency, redis);
  if (!Number.isFinite(rate) || rate <= 0) return native;     // FX unreachable → silently drop parens
  const uPrefix = prefixForCountry(userCountry) || prefixForCurrency(userCurrency);
  if (!uPrefix) return native;
  const cs = start != null ? convAmount(start * rate, userCurrency) : null;
  const ce = end   != null ? convAmount(end   * rate, userCurrency) : null;
  // "≈" marks the marked-up estimate (operator). Range collapses to a
  // single value when the two bounds round equal.
  const conv = (cs != null && ce != null && cs !== ce) ? `${uPrefix}${cs}–${ce}`
             : (cs != null) ? `${uPrefix}${cs}`
             : (ce != null) ? `${uPrefix}${ce}`
             : null;
  return conv ? `${native} (≈${conv})` : native;
}

module.exports = {
  COUNTRY_PREFIX,
  CURRENCY_PREFIX,
  COUNTRY_TO_CURRENCY,
  prefixForCountry,
  prefixForCurrency,
  currencyForCountry,
  usdRate,
  fetchFxRate,
  formatPriceRangeForVenue,
  NO_CENTS,
  FX_MARKUP,
  USD_RATE_BASELINE,
  sanitizeUsdRate
};
