import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { m, useReducedMotion } from 'motion/react';
import { openLink, initData, tg } from './tg.js';
import { withViewTransition } from './lib/view-transition.js';
import { t, tn, useLocale } from './i18n.js';
import { hawkerNameLocal } from '../../_shared/lib/hawker-names-i18n.js';
import HawkerMapPanel from './components/HawkerMapPanel.jsx';
import BottomSheet from '../../_shared/components/BottomSheet.jsx';
import { codeHex } from './lib/mapOverlays.js';
import WeatherBadge from '../../_shared/components/WeatherBadge.jsx';
import { useViewport, viewportTag } from '../../_shared/lib/use-viewport.js';
import LocaleToggle from './components/LocaleToggle.jsx';
import { activeClosure, closureTill, CLOSURE_TAB_BG } from './closure.js';
import StationLocationField from '../../_shared/components/StationLocationField.jsx';

// v0.60.59 — render "🍳 38 stalls · Operating" / "🍳 38 stands ·
// Opérationnel" when stall count and/or status are known. Replaces
// the v0.60.53 closure-tag helper (closures dataset retired by NEA).
// Status values come from the data.gov.sg dataset (typical: "Existing",
// "Under Construction"); we localise via stalls.status.<key> when a
// translation exists, otherwise fall through to the raw English label.
function formatStalls(centre, lang) {
  const bits = [];
  if (Number.isFinite(centre.stalls) && centre.stalls > 0) {
    bits.push(tn('stalls.count', lang, { n: centre.stalls }));
  }
  if (centre.status) {
    const slug = centre.status.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const key = `stalls.status.${slug}`;
    const localised = t(key, lang);
    bits.push(localised === key ? centre.status : localised);
  }
  return bits.join(' · ');
}

// v0.62.547 — the localised NEA status ("Operating"/"Under Construction") on its
// own, for the Cuisine-style status chip (formatStalls joins it with the stall
// count; here we want it separately). Mirrors formatStalls' status lookup.
function statusLabel(centre, lang) {
  if (!centre.status) return '';
  const slug = centre.status.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const key = `stalls.status.${slug}`;
  const localised = t(key, lang);
  return localised === key ? centre.status : localised;
}
// "Operating"/"Existing" → the good (green) state; anything else (Under
// Construction, …) → the amber caution state.
function statusIsOpen(centre) {
  return /^(oper|exist)/i.test(String(centre.status || ''));
}

// v0.62.548/552 — tablet/desktop list⇄map toggle. 🗺 Map hides the carousel to
// reveal the full map; 📋 List brings it back. v0.62.552 (operator): it is no
// longer a separate floating pill — it renders as the FIRST item INSIDE the
// FooterNav cluster (before ⇣ down / 🔚 end), so it reads as part of that row.
// v0.62.648 — the carousel ⇄ list-drawer toggle, mirroring Transport's footer
// pill. The label names the view you'll switch TO, so tapping "⊿ List" opens the
// drawer over the map and tapping "◸ Map" returns to the carousel cards.
function ViewToggleButton({ viewMode, onToggle, lang }) {
  const label = viewMode === 'carousel' ? t('layout.list', lang) : t('layout.map', lang);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
    >{label}</button>
  );
}

function MapToggleButton({ isHidden, onToggle, lang }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isHidden}
      className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
    >
      {isHidden ? `📋 ${t('btn.showList', lang)}` : `🗺 ${t('btn.showMap', lang)}`}
    </button>
  );
}

// v0.62.605 — operator: the footer matches the Cuisine TMA — a compact, full-width
// liquid-glass DOCK (small height) with the toggle (left) + ⇡top/⇣down & ↩back/🔚end
// (right, Cuisine glyphs) and a tiny integrated version line, instead of the old
// floating FooterNav pill + a separate centred version <footer>. `scrollEl` scrolls
// an inner container (the two-panel list); omit it → window.
function FooterDock({ lang, footerTag = '', leading = null, atBottom = false, scrollEl = null, zoneInfo = null }) {
  const resolveScroller = () => {
    const el = scrollEl && (scrollEl.current !== undefined ? scrollEl.current : scrollEl);
    return el || null;
  };
  const onScroll = () => {
    const el = resolveScroller();
    if (el) el.scrollTo({ top: atBottom ? 0 : el.scrollTop + el.clientHeight, behavior: 'smooth' });
    else window.scrollTo({ top: atBottom ? 0 : window.scrollY + window.innerHeight, behavior: 'smooth' });
  };
  const hasHistory = typeof window !== 'undefined' && window.history.length > 1;
  const onBackEnd = () => {
    const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (hasHistory) window.history.back();
    else if (w && typeof w.close === 'function') w.close();
  };
  return (
    <div
      /* v0.62.607 — operator: frost the footer. `liquid-glass-dock` was a
         Cuisine-only CSS class (undefined here), so it wasn't blurring; a plain
         backdrop-blur stood in.
         v0.62.649 — operator: "the footer be 75% liquid glass effect which is
         the standard". The real `.liquid-glass-dock` is now defined in this
         app's styles.css too, so use it, at the standard 75 %. */
      className="fixed bottom-0 inset-x-0 z-40 px-3 pt-1 bg-tg-bg/75 liquid-glass-dock border-t border-tg-border flex flex-col gap-0.5"
      style={{ paddingBottom: 'calc(0.25rem + max(env(safe-area-inset-bottom, 0px), var(--tg-content-safe-area-inset-bottom, 0px)))' }}
    >
      <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-tg-link">
        <div className="flex items-center gap-0.5 min-w-0">
          {leading}
          {/* v0.62.627 — operator: "the NEA should be beside the 'map'" + "reduce
              the footer to the same as CUISINE TMA". NEA ↗ moves from its own line
              INTO the control row, beside the Map toggle (the `leading` slot); the
              zone count + version merge into ONE tiny line. The footer collapses
              from four rows to two — matching the Cuisine footer height, and no
              longer overlapping the bottom-docked card carousel (cards were cut). */}
          <button
            type="button"
            onClick={() => openLink(NEA_HOME)}
            aria-label={t('link.neaAria', lang)}
            className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
          >NEA ↗</button>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onScroll}
            aria-label={atBottom ? t('btn.fabTopAria', lang) : t('btn.fabDownAria', lang)}
            className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
          >{atBottom ? t('btn.fabTop', lang) : t('btn.fabDown', lang)}</button>
          <button
            type="button"
            onClick={onBackEnd}
            aria-label={hasHistory ? t('btn.fabBackAria', lang) : t('btn.fabEndAria', lang)}
            className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
          >{hasHistory ? `↩ ${t('btn.fabBack', lang)}` : `🔚 ${t('btn.fabEnd', lang)}`}</button>
        </div>
      </div>
      {/* v0.62.616 — zone centre-count + v0.62.627 — merged onto the single tiny
          version line (was two separate lines) to keep the footer compact. */}
      <div className="text-[9px] text-tg-hint text-center leading-none pointer-events-none">
        {zoneInfo ? `${zoneInfo} · ` : ''}{t('footer.tag', lang)} · v{BUILD_VERSION}{footerTag ? ` · ${footerTag}` : ''}
      </div>
    </div>
  );
}

// v0.62.552 — operator: the carousel shows the middle cards IN FOCUS (opaque) and
// the two "half-seen" cards peeking at each end as GLASS (translucent + frosted).
// An IntersectionObserver (root = the scroll track) marks a card focused once it
// is ≥ 92 % visible; anything less peeks and renders glass. `basisClass` sets how
// many are in focus (3 on wide tablets/desktop, 2 on an iPad-mini-width screen).
// v0.62.679 — O-96 (operator, device check): on PHONE this IntersectionObserver
// path could get "stuck" — a card that scrolled to a peeking edge sometimes kept
// rendering opaque, because IO callback timing during a scroll-snap gesture is
// implementation-defined and can coalesce/delay in Telegram's embedded WebView;
// if a below-threshold crossing never fires, the index never leaves `focused`.
// Cuisine's own carousel (ResultDrawer.jsx) never had this bug because it only
// uses IntersectionObserver on tablet/desktop (`glassPeek = vp.isWide`, multiple
// cards can be simultaneously "visible"); on phone it bypasses IO entirely and
// tracks the single centred card via `detectCentre()` — a synchronous
// getBoundingClientRect() geometry match re-run on every native `scroll` event,
// which cannot get stuck. Ported that same dual-mode split here: IO stays for
// `isWide` (unaffected, not what the operator reported), phone now uses the
// scroll-driven geometry match instead.
function CentreCarousel({ items, renderCard, basisClass, isWide = false, isShort = false }) {
  const trackRef = useRef(null);
  const [focused, setFocused] = useState(() => new Set());
  const [centeredIdx, setCenteredIdx] = useState(0);
  useEffect(() => {
    if (!isWide) { setFocused(new Set()); return undefined; }
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === 'undefined') {
      // No IO (very old webview): treat all as focused/opaque.
      setFocused(new Set(items.map((_, i) => i)));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      setFocused((prev) => {
        const next = new Set(prev);
        for (const e of entries) {
          const idx = Number(e.target.getAttribute('data-idx'));
          if (e.intersectionRatio >= 0.92) next.add(idx); else next.delete(idx);
        }
        return next;
      });
    }, { root: track, threshold: [0, 0.5, 0.92, 1] });
    track.querySelectorAll('[data-idx]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items, isWide]);
  // v0.62.679 — phone-only scroll-geometry fallback (mirrors Cuisine's
  // ResultDrawer.jsx detectCentre()). Re-measures on every scroll tick, so it
  // cannot desync from what's actually visible the way IO callback timing can.
  useEffect(() => {
    if (isWide) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;
    const detectCentre = () => {
      const trackRect = track.getBoundingClientRect();
      const mid = trackRect.left + trackRect.width / 2;
      let best = null;
      let bestDist = Infinity;
      track.querySelectorAll('[data-idx]').forEach((node) => {
        const idx = Number(node.getAttribute('data-idx'));
        const r = node.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDist) { bestDist = d; best = idx; }
      });
      if (best != null) setCenteredIdx((prev) => (best !== prev ? best : prev));
    };
    track.addEventListener('scroll', detectCentre, { passive: true });
    detectCentre();
    const seed = setTimeout(detectCentre, 80);
    return () => { track.removeEventListener('scroll', detectCentre); clearTimeout(seed); };
  }, [items, isWide]);
  const glassFor = (i) => (isWide ? !focused.has(i) : i !== centeredIdx);
  // v0.62.694 — operator: "the card can be shorter, can you shorten it down by
  // 15% until the pill to 'details'". Measured rather than nudged, the same way
  // Cuisine's ResultDrawer was fixed in v0.62.693 (D-63) — and the measurement
  // says the real slack is ~30%, not 15%: an 8rem/128px box around 90px of
  // content. A constant cannot be right for both a 2-row and a 4-row centre, so
  // read every collapsed card's natural height and pin them all to the tallest:
  // uniform (D-51 holds) and tight (lands exactly on the ▸ details pill).
  // `height:auto` is applied momentarily because once a height is set the content
  // no longer overflows and scrollHeight would just echo it back.
  const [uniformH, setUniformH] = useState(null);
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !items.length) { setUniformH(null); return; }
    const els = Array.from(track.querySelectorAll('[data-card-root]'));
    if (!els.length) return;
    let max = 0;
    for (const el of els) {
      const prev = el.style.height;
      el.style.height = 'auto';
      max = Math.max(max, el.scrollHeight);
      el.style.height = prev;
    }
    const cap = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.46) : 240;
    const next = Math.min(Math.max(max, 64), cap);
    setUniformH((prev) => (prev != null && Math.abs(prev - next) < 2 ? prev : next));
  }, [items, isShort, basisClass]);
  return (
    // v0.62.554 — operator: the cards showed a horizontal "boundary line across
    // the screen". Cause: the flex track defaulted to align-items:stretch, so
    // every card grew to the tallest card's height and their aligned bottom edges
    // + the heavy shadow-xl merged into one line spanning the width. `items-end`
    // sits the cards on a common baseline (natural heights, ragged tops) and the
    // lighter shadow-lg stops the drop shadows from bridging the gaps into a line.
    <div
      ref={trackRef}
      className="flex items-end gap-2 overflow-x-auto snap-x snap-mandatory px-[6%] pb-1 pointer-events-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {items.map((c, i) => (
        <div key={i} data-idx={i} className={`snap-center shrink-0 ${basisClass} max-h-[46vh] overflow-y-auto rounded-lg shadow-lg`}>
          {/* v0.62.694 — `centred` is new: the accent border used to require a TAP
              (activePill), so the card the user had scrolled to carried the same
              grey tg-border as the peeking ones and nothing read as active. */}
          {renderCard(c, i, glassFor(i), true, isShort, !isWide && i === centeredIdx, uniformH)}
        </div>
      ))}
    </div>
  );
}

const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
const NEA_HOME = 'https://www.nea.gov.sg/our-services/hawker-management';
const REGION_EMOJI = {
  Central: '🏙️', South: '🛳️', East: '🌅', North: '🌳', West: '🌇'
};

// v0.62.595/596 — cleaning / renovation / redevelopment closure tab + pin recolour.
// The shared helpers (activeClosure / closureTill / CLOSURE_TAB_BG) live in
// ./closure.js so the card tab here and the map pin in HawkerMapPanel never drift.

// v0.56.0 — TMA simplified per Human Lead. Only the regional browser
// remains. Closures, R&R, About tabs removed (the LLM scrape was
// unreliable; users now see only the deterministic 122-centre vault).
// TMA renamed: "Hawker Centre Status" → "Hawker Centre".
// v0.59.15 — full FR localisation. Reads locale from the same
// localStorage key the cuisine TMA uses ('gia.locale'); flips
// instantly on the 'gia:locale' CustomEvent so the user's /language
// or cuisine-TMA toggle propagates here without a reload.
export default function App() {
  const lang = useLocale();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(null);
  const [activeRegion, setActiveRegion] = useState('Central');
  const [savingName, setSavingName] = useState(null);
  // v0.62.547 — tablet "list" toggle (operator, mirrors Cuisine's hide-results):
  // hide the list/panel to reveal the full-bleed map, and bring it back.
  const [listHidden, setListHidden] = useState(false);
  // v0.62.550 — operator (point 4a): in the PORTRAIT tablet/desktop layout the map
  // is anchored at the top with a separate scrollable list panel below; tapping
  // the map's ⇲ expand flips `mapExpanded` so the layout switches to the full-map
  // + bottom-carousel (the point-2 landscape carousel), and ⇱ collapses back.
  const [mapExpanded, setMapExpanded] = useState(false);
  // v0.62.648 — operator: "better experience to have both Hawker TMA and Train TMA
  // in Cuisine's carousel card mode … these 2 TMA like Cuisine TMA can toggle to
  // list which is how the drawer effect takes place." Mirrors Transport's
  // `viewMode`: 'carousel' is the default on every device/orientation, and the
  // footer toggle is the ONE way into the drawer.
  const [viewMode, setViewMode] = useState('carousel');
  // v0.62.637 (C2/C3) — AutoAnimate the centre list (cards fade/slide as the
  // region changes; honours reduced-motion) + a reduced-motion flag for the
  // Motion selected-card spring. Both hooks stay above any early return.
  const [listParent] = useAutoAnimate();
  const reduceMotion = useReducedMotion();
  // v0.62.549 — operator: a station / bus-stop pill in a card is a two-tap
  // control. 1st tap → highlight the point on the embedded map (3 s pulse) and
  // mark THIS pill toggled (only one at a time); 2nd tap on the same pill →
  // open external Google Maps and clear the toggle. `activePill` is the toggled
  // pill's id, or null.
  const [activePill, setActivePill] = useState(null);
  // v0.62.678 — operator: card collapse/expand parity with Cuisine's
  // card.detailsMore/detailsLess and Train's mrt.detailsMore/detailsLess.
  // A Set (not a single value like activePill above) since, unlike the pill
  // toggle, multiple centre cards can be expanded at once — each card's own
  // disclosure is independent. Keyed by centre name (unique within a region's
  // result set, same key `renderCentreCard` already uses for `tr`/`activePill`).
  const [expandedCards, setExpandedCards] = useState(() => new Set());
  const toggleCardExpanded = (name) => setExpandedCards((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  // v0.62.679 — O-95 (operator): "Copy" should stay open like Cuisine's, so the
  // user can copy several cards in one session, instead of closing the WebApp.
  // A Set (not a single value) so more than one card can show "✓ Sent" if the
  // user copies several in quick succession — mirrors Cuisine's `copied`/
  // `card.sent` UX (ResultCard.jsx), 3s auto-revert.
  const [sentNames, setSentNames] = useState(() => new Set());
  const markSent = (name) => {
    setSentNames((prev) => new Set(prev).add(name));
    setTimeout(() => setSentNames((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    }), 3000);
  };
  // v0.62.551 — 1st tap runs `show` (reveal the station/bus stop ON the map) and
  // toggles the pill; 2nd tap on the same pill opens external Google Maps and
  // clears the toggle. `show` is a callback so each kind reveals itself properly
  // (station → focusStation; bus → a labelled bus-stop pin) — the old highlight
  // drew only a faint halo, so "the bus stop didn't appear".
  const handlePillTap = (id, show, url) => {
    if (activePill === id) {
      if (url) openLink(url);
      setActivePill(null);
    } else {
      if (typeof show === 'function') show();
      setActivePill(id);
    }
  };
  // v0.62.556 — operator: tapping anywhere in a centre card (except the pills)
  // is wired like the station/bus-stop pills — 1st tap highlights the centre PIN
  // on the map (same flow as tapping the pin) + toggles the card active; 2nd tap
  // opens the centre's Google Maps + clears the toggle.
  const handleCardTap = (c) => {
    handlePillTap(`${c.name}|card`,
      () => { if (typeof window !== 'undefined') window.__giaHawkerFocusCentre?.(c.name); },
      c.mapsUrl || null);
  };
  // v0.62.557 — operator "vice versa": tapping a centre PIN on the map highlights
  // the matching card in the list (the accent ring), mirroring card-tap → pin.
  // v0.62.558 — operator: the matching card should also come INTO FOCUS — scroll
  // it into view (centres it in the carousel, or into the list panel), both
  // orientations. Deferred a frame so the ring re-render + DOM settle first.
  const onCentreTap = (name) => {
    setActivePill(`${name}|card`);
    if (typeof document === 'undefined') return;
    setTimeout(() => {
      const sel = (window.CSS && CSS.escape) ? CSS.escape(name) : name.replace(/"/g, '\\"');
      const el = document.querySelector(`[data-centre-card="${sel}"]`);
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 80);
  };
  // v0.61.0 — map overlay layer toggles (parks / attractions / taxis).
  const [overlayLayers, setOverlayLayers] = useState({ attractions: false, carpark: false, busstop: false, colour: true, train: true, exits: false, taxis: false, parks: false, police: false, clinics: false, hospitals: false });
  // v0.65.0 — per-centre transit (nearest MRT station + 2 bus stops),
  // lazy-fetched per active region from /api/hawker/centre-transit.
  const [transitByName, setTransitByName] = useState({});
  // v0.60.96 — operator: "flip to Top when I am at the bottom of the
  // screen". Detect when user has scrolled to (or near) the bottom of
  // the document, not just past the hero. Threshold 50 px to absorb
  // momentum-overshoot on iOS. FAB labels "⇣ down" while there's more
  // to scroll; "⇡ top" when there isn't.
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const reached = window.scrollY + window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      setAtBottom(reached >= fullH - 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // v0.62.590 — the two-panel layout (phone + portrait tablet) scrolls an INNER
  // list container, not the window, so the footer ⇣/⇡ + its atBottom label must
  // track THAT element (the window can't scroll under `fixed inset-0`).
  const panelScrollRef = useRef(null);
  const [panelAtBottom, setPanelAtBottom] = useState(false);
  const onPanelScroll = () => {
    const el = panelScrollRef.current;
    if (el) setPanelAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 50);
  };

  // v0.60.53 — POST /api/hawker/save-pick. Server validates initData,
  // looks up the centre in the vault, and sends a formatted chat card
  // back via the bot. On success, close the WebApp.
  const saveToChat = async (centreName) => {
    if (savingName) return;
    setSavingName(centreName);
    try {
      const res = await fetch('/api/hawker/save-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData(), centreName })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // v0.62.679 — O-95 (operator): stay open like Cuisine's "Copy" (was
      // tg().close() on success — closed the WebApp after every single copy,
      // unlike Cuisine which lets the user copy several cards in one session).
      markSent(centreName);
    } catch (e) {
      const w = tg();
      const msg = t('msg.saveFailed', lang);
      if (w && typeof w.showAlert === 'function') w.showAlert(msg);
      else alert(msg);
      console.warn('[hawker] save-to-chat failed:', e.message);
    } finally {
      setSavingName(null);
    }
  };

  // v0.62.689 — station-pick inspection overlay. The field was rendered without a
  // handler since v0.62.659, so picking a station did nothing at all; it now drops
  // ONE temporary amber pin on the map, rings it, and labels the nearest 3 hawker
  // centres. Nothing else moves — the active region, the card list and the
  // carousel are untouched, because this is an inspection, not a search anchor.
  const inspectStation = (s) => {
    if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return;
    window.__giaHawkerInspect?.(s.lat, s.lng, s.name || '');
  };

  useEffect(() => {
    fetch('/api/hawker/centres-by-region')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((b) => setData(b))
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  }, []);

  const regionList = data?.regions || [];
  const active = regionList.find((r) => r.region === activeRegion);

  // v0.65.0 — fetch transit (nearest station + bus stops) for every
  // centre of the active region; results merge into transitByName.
  useEffect(() => {
    const act = (data?.regions || []).find((r) => r.region === activeRegion);
    if (!act || !Array.isArray(act.centres)) return undefined;
    let cancelled = false;
    const todo = act.centres.filter(
      (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && !transitByName[c.name]
    );
    if (!todo.length) return undefined;
    Promise.all(todo.map((c) =>
      fetch(`/api/hawker/centre-transit?lat=${c.lat}&lng=${c.lng}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => ({ name: c.name, data: d }))
        .catch(() => ({ name: c.name, data: null }))
    )).then((results) => {
      if (cancelled) return;
      setTransitByName((prev) => {
        const next = { ...prev };
        for (const r of results) if (r.data) next[r.name] = r.data;
        return next;
      });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRegion, data]);

  // v0.62.590 — the multi-pin "open all on a map" URL + the per-region tour-range
  // buttons were retired with the old phone stacked layout (the two-panel layout
  // now owns the map surface; each card still carries its own 📍 Maps link). The
  // /app/map full-screen route is still reachable from the map panel itself.

  // Localised region label — the API returns canonical EN names
  // (Central/South/East/North/West); we render the FR equivalent at
  // chip + heading time via `region.<EN>` keys.
  const regionLabel = (en) => t(`region.${en}`, lang);
  // v0.62.616 — operator: footer line (above the version) with the count of
  // hawker centres in the currently-selected zone. "centres" reads the same in
  // en/fr; the emoji + localised zone name front it.
  const zoneInfo = active
    ? `${REGION_EMOJI[activeRegion] || ''} ${regionLabel(activeRegion)} · ${active.centres.length} ${lang === 'fr' ? 'centres' : 'centres'}`.trim()
    : null;

  // v0.62.544/590 — responsive layout. The map + cards render one of two shapes,
  // now for EVERY device (phone + tablet + desktop): a full-bleed map + bottom
  // CAROUSEL in landscape (or when the map is expanded), else the two-panel
  // (top-fixed map + scrolling list). Orientation — not width — picks the shape;
  // `isWide` only widens the list grid to 2 columns on tablets/desktop.
  const vp = useViewport();
  // v0.62.698 — operator: re-tapping the ALREADY-ACTIVE zone pill should re-frame
  // that zone. Zoom is per device, per the operator's numbers: 12 on a phone,
  // 13 on Desktop/iPad. (Higher = closer; the wider screen can hold more detail
  // at the same apparent size, which is why it is the larger number.)
  const ZONE_ZOOM_PHONE = 12;
  const ZONE_ZOOM_WIDE = 13;
  const pickRegion = (region) => {
    if (region === activeRegion) {
      window.__giaHawkerFitZone?.(vp.isWide ? ZONE_ZOOM_WIDE : ZONE_ZOOM_PHONE);
      return;
    }
    setActiveRegion(region);
  };
  const isWide = vp.isWide;
  const footerTag = viewportTag(vp);
  // List grid: 2 columns on tablet/desktop, single column on phones.
  const listClass = isWide ? 'grid grid-cols-2 gap-1.5 mt-1' : 'flex flex-col gap-1.5 mt-1';

  // v0.62.548 — one centre card, shared by the portrait/mobile grid AND the
  // landscape carousel. Cuisine-style: numbered name header, 📇 address, stall +
  // status chip, codeHex MRT line-code chips + station name, and bus-stop pills
  // that now carry the stop DESCRIPTION (operator: "Bus Stop 41129 · Opposite
  // S'pore Bible College") — mirroring the map InfoWindow's `🚌 code desc`
  // standard. Rounded-full pill actions (📍 Maps / Save to chat).
  // v0.62.692 — URGENT FIX: `isShort` was added to this function's BODY in
  // v0.62.686 (the D-51 height tiers) and is passed by CentreCarousel as the 5th
  // argument, but it was never added to the SIGNATURE. Reading an undeclared
  // identifier is a ReferenceError, so every centre card threw and the whole TMA
  // white-screened as soon as centre data arrived. Line 550's `!isShort && …`
  // evaluates unconditionally, which is why both the carousel and the list card
  // died — not just the compact path.
  const renderCentreCard = (c, i, glass = false, compact = false, isShort = false, centred = false, collapsedHeightPx = null) => {
    const tr = transitByName[c.name];
    const cardOn = activePill === `${c.name}|card`;
    // v0.62.678 — details/less parity with Cuisine (card.detailsMore/detailsLess)
    // and Train (mrt.detailsMore/detailsLess). Collapsed = the always-useful
    // identity row (name/address/stall-count/status, already above this point);
    // Bib Gourmand links, MRT/bus-stop chips, and the Maps/Copy pills move
    // behind the toggle. Content-sized in both states (no fixed height).
    const expanded = expandedCards.has(c.name);
    // v0.62.595 — cleaning/renovation/redevelopment closure tab: only when TODAY is in a window.
    const closure = activeClosure(c.closures);
    const card = (
      // v0.62.549 — opaque card surface (operator: carousel cards in focus with
      // an opaque background = the card background colour, not translucent).
      // v0.62.552 — operator: the two "half-seen" cards peeking at the carousel
      // ends read as GLASS (translucent + frosted); the in-focus cards stay opaque.
      // v0.62.555 — operator: carousel (landscape) cards have very tiny white
      // spacing between the border and the content (compact padding + gap).
      // v0.62.556 — operator: the whole card is tappable (except the pills) — it
      // highlights the centre pin + toggles the card's active state (accent ring).
      <m.div
        role="button"
        tabIndex={0}
        data-centre-card={c.name}
        onClick={() => handleCardTap(c)}
        /* P1-d — the card announced itself as a button but ignored the
           keyboard; Enter/Space now mirror the tap. */
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardTap(c); } }}
        animate={reduceMotion ? undefined : { scale: cardOn ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
        /* v0.62.686 — D-51 applied to Hawker: the COLLAPSED carousel card is a
           FIXED height so every card in the strip is identical, same rule as
           Cuisine. The VALUES differ on purpose — Hawker's collapsed card
           carries 4 rows (name / address / stalls+status / toggle) against
           Cuisine's 10, so reusing Cuisine's 13rem would render a mostly-empty
           208px card. Sized to Hawker's own rows instead: 8rem standard,
           5.5rem short (phone landscape, where the stalls/status chip row
           moves behind the toggle). Only the carousel (`compact`) is pinned —
           the two-panel list card stays content-sized. */
        /* v0.62.694 — measured by CentreCarousel; inline height beats the class,
           which stays as the pre-measurement first-paint fallback. */
        data-card-root={compact && !expanded ? '' : undefined}
        style={compact && !expanded && Number.isFinite(collapsedHeightPx) ? { height: `${collapsedHeightPx}px` } : undefined}
        /* v0.62.694 — operator: "where is the border for active card". The accent
           border was gated on `cardOn`, i.e. an explicit card TAP (activePill), so
           the card the user scrolled to carried the same grey tg-border as the
           peeking ones — measured on device: all five cards identical borderColor.
           `centred` now carries the accent too; a TAP keeps the stronger
           ring + shadow + lift so the two states stay distinguishable. */
        className={`rounded-lg border text-xs flex flex-col cursor-pointer ${compact ? 'p-1.5 gap-0.5' : 'p-2.5 gap-1'} ${compact && !expanded ? `${isShort ? 'h-[5.5rem]' : 'h-[8rem]'} overflow-hidden` : ''} ${cardOn ? 'border-tg-accent ring-1 ring-tg-accent shadow-xl relative z-10' : (centred ? 'border-tg-accent' : 'border-tg-border')} ${glass ? 'bg-tg-card/40 liquid-glass' : 'bg-tg-card'}`}>
        {/* v0.62.679 — O-97 (operator): "Hawker's centre card follows Cuisine's
            category card 12px" — was a flat text-[13px]; now the same
            isCompact-responsive rule Phase C applied to Cuisine's category-grid
            label (11px compact phone / 12px everywhere else). */}
        <div className={`font-semibold ${vp.isCompact ? 'text-type-meta' : 'text-type-body'} leading-tight text-tg-text`}>
          <span className="text-tg-hint font-semibold tabular-nums">{i + 1} · </span>{c.name}{c.isNew ? ' 🆕' : ''}
          {/* v0.62.829 — O-344: the curated name in the reader's language, on its own line
              under the English, never in place of it. `c.name` stays the card key
              (data-centre-card, activePill) and `displayName` stays the Maps query, so a
              wrong string here costs a hint and not the ability to find the place. */}
          {hawkerNameLocal(c.displayName || c.name, lang) && (
            <div className="text-[11px] text-tg-hint leading-tight">({hawkerNameLocal(c.displayName || c.name, lang)})</div>
          )}
        </div>
        {c.address && <div className="text-[11px] text-tg-hint leading-snug">📇 {c.address}</div>}
        {!isShort && (Number.isFinite(c.stalls) || c.status) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* v0.62.558 — `stalls.count` already carries the 🍳 emoji; the
                extra hard-coded 🍳 here rendered a DOUBLE frying pan (operator:
                "two search icons"). Drop the prefix. */}
            {Number.isFinite(c.stalls) && c.stalls > 0 && (
              <span className="text-[10px] text-tg-text/80">{tn('stalls.count', lang, { n: c.stalls })}</span>
            )}
            {c.status && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusIsOpen(c) ? 'bg-blue-600/20 text-blue-500' : 'bg-amber-500/20 text-amber-600'}`}>
                {statusLabel(c, lang)}
              </span>
            )}
          </div>
        )}
        {/* v0.62.678 — collapse toggle. Collapsed = identity + meta (above);
            Bib Gourmand / MRT+bus / Maps+Copy all move below, revealed on
            expand. stopPropagation so it doesn't fire the card's own tap
            (map pin highlight). */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleCardExpanded(c.name); }}
          aria-expanded={expanded}
          className="self-start px-1.5 py-0.5 rounded-full border border-tg-accent/30 text-[11px] text-tg-accent/70 font-medium active:scale-95"
        >
          <span aria-hidden className="mr-0.5">{expanded ? '▾' : '▸'}</span>{expanded ? t('btn.detailsLess', lang) : t('btn.detailsMore', lang)}
        </button>
        {expanded && (
        <>
        {/* v0.62.553 — operator: Michelin Bib Gourmand stall(s) in this centre,
            house style "✳️ Bib Gourmand · <stall>". The ✳️ + word carry the
            meaning (CVD-safe), mirroring the map pin's macaron-red + ✳️ marker. */}
        {Array.isArray(c.bibStalls) && c.bibStalls.length > 0 && (
          <div className="text-[11px] leading-snug text-tg-text">
            <span aria-hidden="true">✳️</span> <span className="font-semibold">Bib Gourmand</span>
            <span className="text-tg-hint"> · </span>
            {/* v0.62.557/558 — each Bib stall name is a hyperlink to that stall's
                Google Maps location within the centre. v0.62.558 (operator: "why
                isn't there hyperlinks?") — the v0.62.557 hint-coloured/no-underline
                style was indistinguishable from plain text; make it read as a link
                (accent + underline). stopPropagation so it never fires the card tap. */}
            {c.bibStalls.map((s, k) => (
              <React.Fragment key={k}>
                {k > 0 && <span className="text-tg-hint">, </span>}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${s} ${c.displayName || c.name} Singapore`)}`}
                  target="_blank" rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-tg-accent"
                >{s}</a>
              </React.Fragment>
            ))}
          </div>
        )}
        {/* v0.65.0/0.62.549 — nearest MRT (codeHex chips + station name) + bus
            stops (pills WITH description). Two-tap (operator): 1st tap highlights
            the point on the embedded map (3 s pulse) + toggles the pill to a pale
            accent; 2nd tap opens external Google Maps + clears the toggle. */}
        {tr && (tr.station || (tr.busStops || []).length) && (
          <div className="flex flex-col gap-1">
            {tr.station && (() => {
              const id = `${c.name}|stn`;
              const on = activePill === id;
              return (
                <button type="button"
                  aria-pressed={on}
                  onClick={(e) => { e.stopPropagation(); handlePillTap(id,
                    () => { const cd = (tr.station.codes || [])[0]; if (cd) window.__giaHawkerFocusStation?.(cd); },
                    `https://maps.google.com/?q=${encodeURIComponent(`${tr.station.name || ''} MRT Station Singapore`)}`); }}
                  className={`self-start flex items-center flex-wrap gap-1 text-[11px] rounded px-1 py-0.5 border ${on ? 'bg-tg-accent/20 border-tg-accent' : 'border-transparent'}`}
                >
                  {(tr.station.codes || []).map((cd, k) => (
                    <span key={k} style={{ background: codeHex(cd) }}
                      className="text-white font-bold rounded px-1 text-[10px] leading-[1.5]">{cd}</span>
                  ))}
                  <span className="text-tg-text/80">{tr.station.name}</span>
                </button>
              );
            })()}
            {(tr.busStops || []).length > 0 && (
              /* v0.62.604 — operator: pack the bus stops TWO to a row when size
                 permits (each capped at ~half width, long labels truncate),
                 instead of one per row. */
              <div className="flex flex-wrap gap-1 items-start">
                {(tr.busStops || []).map((b, j) => {
                  const desc = b.description || b.roadName || '';
                  const id = `${c.name}|bus|${b.code}`;
                  const on = activePill === id;
                  return (
                    <button key={j} type="button"
                      aria-pressed={on}
                      onClick={(e) => { e.stopPropagation(); handlePillTap(id,
                        () => window.__giaHawkerShowBusStop?.(b.code, b.lat, b.lng, desc),
                        `https://maps.google.com/?q=${encodeURIComponent(['Bus Stop', b.code, desc, 'Singapore'].filter(Boolean).join(' '))}`); }}
                      className={`rounded border px-1.5 py-0.5 text-[10px] text-tg-text leading-snug truncate max-w-[calc(50%-0.125rem)] ${on ? 'bg-tg-accent/20 border-tg-accent' : 'bg-tg-bg border-tg-border'}`}>
                      🚌 {b.code}{desc ? ` · ${desc}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {c.mapsUrl && (
            <a href={c.mapsUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="text-[11px] px-2.5 py-0.5 rounded-full border border-tg-border bg-tg-bg text-tg-text">
              {/* v0.62.605 — btn.maps already carries the 📍; drop the duplicate glyph. */}
              {t('btn.maps', lang)}
            </a>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); saveToChat(c.name); }}
            disabled={savingName === c.name}
            className="text-[11px] px-2.5 py-0.5 rounded-full border border-tg-border bg-tg-bg text-tg-text disabled:opacity-60">
            {savingName === c.name ? t('btn.saving', lang) : sentNames.has(c.name) ? t('card.sent', lang) : t('btn.saveToChat', lang)}
          </button>
        </div>
        </>
        )}
      </m.div>
    );
    // v0.62.595 — no active closure → the card unchanged (zero regression). Else a
    // protruding tab above the card (mirrors the Cuisine TMA "Closed" tab): red for
    // a cleaning day, grey for renovation works. Applies to every layout (carousel +
    // list) since they all render through renderCentreCard.
    if (!closure) return card;
    const till = closureTill(closure.end);
    // v0.62.596 — three kinds: red "Closed for cleaning", grey "Under Renovation",
    // near-black "Redevelopment" (operator: light text on black).
    const label = closure.kind === 'cleaning'
      ? (lang === 'fr' ? `Fermé pour nettoyage jusqu'au ${till}` : `Closed for cleaning till ${till}`)
      : closure.kind === 'redevelopment'
        ? (lang === 'fr' ? `Réaménagement jusqu'au ${till}` : `Redevelopment till ${till}`)
        : (lang === 'fr' ? `En rénovation jusqu'au ${till}` : `Under Renovation till ${till}`);
    return (
      <div className="flex flex-col">
        <div className={`ml-3 -mb-1 self-start relative z-10 px-3 py-0.5 rounded-t-lg text-white text-[10px] font-bold leading-snug ${CLOSURE_TAB_BG[closure.kind] || 'bg-gray-500'}`}>
          {label}
        </div>
        {card}
      </div>
    );
  };

  // v0.62.548/550 — the Cuisine-style FULL CAROUSEL: full-bleed map + a slim
  // translucent top bar (header + region chips) + a bottom-docked horizontal
  // swipe carousel of the centre cards. Used by LANDSCAPE tablet/desktop AND by
  // PORTRAIT tablet/desktop once the map is expanded (point 4a). `collapsible`
  // wires the map's ⇲/⇱ to App's `mapExpanded` so portrait can collapse back to
  // the anchored-map + list-panel view; landscape has no collapse (always full).
  const carouselLayout = (collapsible) => (
      <div className="fixed inset-0 overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        {active && (
          <HawkerMapPanel centres={active.centres} region={activeRegion} overlayLayers={overlayLayers} onOverlayChange={setOverlayLayers} fill
            onCentreTap={onCentreTap}
            expanded={collapsible ? mapExpanded : null}
            onToggleExpand={collapsible ? () => withViewTransition(() => setMapExpanded(false)) : null} />
        )}
        {/* Top bar over the map: slim header + region chips. Cleared below
            Telegram's fullscreen top controls with the content-safe-area inset.
            v0.62.549 — operator: the temperature + NEA link move DOWN onto the
            chips row (row 2) so they no longer sit level with Telegram's top-right
            ⌄ ··· system buttons; row 1 is the title alone, padded right to clear
            those buttons. */}
        <div
          className="font-inter absolute top-0 inset-x-0 z-20 bg-tg-bg/80 backdrop-blur-md border-b border-tg-border px-2 py-1.5 flex flex-col gap-1.5"
          /* v0.62.593 — operator: a hair more headroom on the landscape title row so
             the "🍚 Hawker Centre (2025)" title isn't clipped by the bar's top edge
             (0.375rem → 0.625rem). */
          style={{ paddingTop: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.625rem)' }}
        >
          <div className="flex items-center pr-24">
            {/* v0.62.679 — O-97 (operator): unify with the other 2 layouts'
                header title size (16px) and Cuisine's — was text-sm (14px),
                the one layout that disagreed. */}
            <h1 className="text-base font-semibold leading-tight truncate">{t('header.title', lang)}</h1>
          </div>
          {/* v0.62.659 — operator: "have the same location (show current location
              and nearest station) like cuisine TMA... apply this to Hawker TMA as
              well" — sits directly below the title. */}
          <StationLocationField lang={lang} onSelectStation={inspectStation} />
          <div className="flex items-start gap-2">
            {/* v0.62.607 — one row, no "(##)" count. */}
            <div className="flex gap-1 flex-1 min-w-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {regionList.map((r) => {
                const sel = r.region === activeRegion;
                return (
                  <button key={r.region} onClick={() => pickRegion(r.region)} aria-pressed={sel}
                    className={`px-2 py-1 rounded-full text-xs whitespace-nowrap shrink-0 active:scale-95 ${sel ? 'skeuo-pill--selected border border-tg-accent/50 font-semibold' : 'bg-tg-bg/90 liquid-glass text-tg-text'}`}>
                    <span className="mr-0.5">{REGION_EMOJI[r.region] || '·'}</span>{regionLabel(r.region)}
                  </button>
                );
              })}
            </div>
            {/* v0.62.603 — Cuisine-standard flush-right cluster: language, temp,
                refresh; NEA trails the trio. */}
            <div className="flex items-center gap-2 shrink-0">
              <LocaleToggle className="flex-shrink-0" />
              <span className="text-[10px] text-tg-hint flex items-center"><WeatherBadge /></span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                aria-label={lang === 'fr' ? 'Actualiser' : 'Refresh'}
                title={lang === 'fr' ? 'Actualiser' : 'Refresh'}
                className="text-[10px] text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90"
              >↻</button>
            </div>
          </div>
        </div>
        {busy && <p className="absolute top-24 left-1/2 -translate-x-1/2 text-xs text-tg-hint bg-tg-bg/90 rounded-full px-3 py-1 z-20">{t('status.loading', lang)}</p>}
        {err && <p className="absolute top-24 left-1/2 -translate-x-1/2 text-xs text-red-500 bg-tg-bg/90 rounded-full px-3 py-1 z-20">⚠ {err}</p>}
        {/* Bottom-docked horizontal carousel (mirrors ResultCarousel.jsx): the
            middle cards ride IN FOCUS (opaque), the two peeking at each end read
            GLASS (CentreCarousel + IntersectionObserver). v0.62.552 — operator:
            THREE in focus on wide tablets/desktop, TWO on an iPad-mini width
            (basis 44%); the map 🗺 toggle collapses it entirely. */}
        {active && !listHidden && (
          <div className="fixed inset-x-0 bottom-16 z-30 px-1 pb-1 pointer-events-none">
            <CentreCarousel
              items={active.centres}
              renderCard={renderCentreCard}
              basisClass="basis-[min(82%,20rem)]"
              isWide={vp.isWide}
              isShort={vp.isShort}
            />
          </div>
        )}
        <FooterDock
          lang={lang}
          footerTag={footerTag}
          atBottom={atBottom}
          zoneInfo={zoneInfo}
          leading={(
            <>
              <ViewToggleButton viewMode={viewMode} lang={lang}
                onToggle={() => withViewTransition(() => setViewMode('list'))} />
              {active && <MapToggleButton isHidden={listHidden} onToggle={() => withViewTransition(() => setListHidden((v) => !v))} lang={lang} />}
            </>
          )}
        />
      </div>
  );

  // v0.62.550 — PORTRAIT tablet/desktop panel (point 4a): header + region chips +
  // the map ANCHORED at the top + a SEPARATE scrollable list panel below (the map
  // does not scroll away with the list). The map's ⇲ expand switches to the
  // full-map carousel above; ⇱ collapses back here.
  // v0.62.642 — the dispatcher stopped calling this for portrait tablets (moved
  // to the drawer instead); kept unreferenced on purpose.
  // v0.62.661 — un-orphaned: now the landscape-PHONE + list-mode branch too, so
  // the drawer doesn't obstruct the map on a short landscape-phone viewport. The
  // function itself needed no changes — it was already device/orientation-
  // agnostic (a static map-on-top / scroll-list-below split), just unused.
  const portraitTabletPanel = () => (
    <div className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}>
      {/* v0.62.603 — operator: standardise on the Cuisine TMA header — the
          language selector, temperature and refresh are grouped flush right
          (in that order); NEA trails the trio. */}
      <div className="font-inter skeuo-card mx-2 mt-2 rounded-2xl px-3 py-2 flex items-center gap-2 relative z-10 shrink-0">
        <h1 className="text-base font-semibold leading-tight min-w-0 flex-1 truncate">{t('header.title', lang)}</h1>
        <div className="flex items-center gap-3 shrink-0">
          <LocaleToggle className="flex-shrink-0" />
          <span className="text-[11px] text-tg-hint flex items-center"><WeatherBadge /></span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label={lang === 'fr' ? 'Actualiser' : 'Refresh'}
            title={lang === 'fr' ? 'Actualiser' : 'Refresh'}
            className="text-[11px] text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90"
          >↻</button>
        </div>
      </div>
      {/* v0.62.590 — operator (IMG_3554): the 5 zone pills wrapped raggedly. On a
          PHONE lay them out as a tidy 3+2 TWO-ROW grid (segmented-control feel).
          v0.62.591 — operator (iPad Pro portrait): on a WIDE tablet squeeze all 5
          into ONE row like the landscape top bar (there's room), not the 2-row grid. */}
      {/* v0.62.607 — operator: drop the "(##)" count and squeeze all 5 zones onto
          ONE row. Content-sized + centre-justified; scrolls only if a narrow
          phone truly can't fit them. */}
      {/* v0.62.616 — operator: keep the zone pills LEFT-aligned (was justify-center). */}
      <div className="flex justify-start gap-1 px-2 py-1.5 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {regionList.map((r) => {
          const sel = r.region === activeRegion;
          return (
            <button key={r.region} onClick={() => pickRegion(r.region)} aria-pressed={sel}
              className={`px-2 py-1 rounded-full text-[11px] whitespace-nowrap shrink-0 active:scale-95 ${sel ? 'skeuo-pill--selected border border-tg-accent/50 font-semibold' : 'bg-tg-bg/90 liquid-glass text-tg-text'}`}>
              <span className="mr-0.5">{REGION_EMOJI[r.region] || '·'}</span>{regionLabel(r.region)}
            </button>
          );
        })}
      </div>
      {/* Map anchored at the top (does not scroll with the list); ⇲ → carousel.
          v0.62.605 — operator: a tiny bottom margin below the fixed map so the
          scrolling list beneath doesn't butt against it / read as an afterthought. */}
      {active && (
        <div className="px-2 pb-1.5 shrink-0">
          <HawkerMapPanel centres={active.centres} region={activeRegion} overlayLayers={overlayLayers} onOverlayChange={setOverlayLayers}
            onCentreTap={onCentreTap}
            expanded={mapExpanded} onToggleExpand={() => withViewTransition(() => setMapExpanded(true))} />
        </div>
      )}
      {/* Separate scrollable list panel (the operator's "scroll up/down" panel).
          v0.62.605 — reserve space at the bottom for the fixed Cuisine-style dock. */}
      <div ref={panelScrollRef} onScroll={onPanelScroll} className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2"
        style={{ paddingBottom: 'calc(3.5rem + max(env(safe-area-inset-bottom, 0px), var(--tg-content-safe-area-inset-bottom, 0px)))' }}>
        {busy && <p className="text-xs text-tg-hint p-3">{t('status.loading', lang)}</p>}
        {err && <p className="text-xs text-red-500 p-3">⚠ {err}</p>}
        {!busy && !err && active && (
          /* v0.62.590 — operator (IMG_3554): the "Central — 22 hawker centres
             (alphabetical)" strip was redundant (the selected zone chip already
             shows the count) — dropped. The list follows the map directly. */
          <div ref={listParent} className={listClass}>
            {active.centres.map((c, i) => (
              <React.Fragment key={i}>{renderCentreCard(c, i)}</React.Fragment>
            ))}
          </div>
        )}
      </div>
      {/* v0.62.605 — the Cuisine-style dock replaces the floating pill + the
          separate centred version footer; the version line lives inside it. */}
      <FooterDock
        lang={lang}
        footerTag={footerTag}
        atBottom={panelAtBottom}
        scrollEl={panelScrollRef}
        zoneInfo={zoneInfo}
      />
    </div>
  );

  // v0.62.608 — operator (IMG_3594): on a PHONE in portrait, the listing is a
  // Google-Maps-style DRAGGABLE bottom-sheet drawer over a full-bleed map — a
  // floating header (title + zone pills), the map behind, and the list in a
  // BottomSheet with a short centred handle (drag up for more, down to collapse).
  const drawerLayout = () => (
    <div className="fixed inset-0 overflow-hidden"
      style={{
        paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}>
      {/* full-bleed map behind everything.
          v0.62.646 — NO z-0 on this wrapper: an explicit z-index on a positioned
          element creates a STACKING CONTEXT, which trapped the map's fullscreen
          `fixed inset-0 z-[35]` expand overlay inside it — so ⇲ Expand appeared to
          do nothing (the map DID expand, behind the z-30 drawer). */}
      {active && (
        <div className="absolute inset-0">
          <HawkerMapPanel centres={active.centres} region={activeRegion} overlayLayers={overlayLayers} onOverlayChange={setOverlayLayers}
            fill onCentreTap={onCentreTap} />
        </div>
      )}
      {/* floating header (title + zone pills) over the map — pointer-events only
          on the controls so the map stays tappable around them. */}
      <div className="absolute top-0 inset-x-0 z-20 px-2 flex flex-col gap-1.5 pointer-events-none"
        style={{ paddingTop: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.5rem)' }}>
        <div className="font-inter skeuo-card rounded-2xl px-3 py-2 flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold leading-tight min-w-0 flex-1 truncate">{t('header.title', lang)}</h1>
            <div className="flex items-center gap-3 shrink-0">
              <LocaleToggle className="flex-shrink-0" />
              <span className="text-[11px] text-tg-hint flex items-center"><WeatherBadge /></span>
              <button type="button" onClick={() => window.location.reload()}
                aria-label={lang === 'fr' ? 'Actualiser' : 'Refresh'} title={lang === 'fr' ? 'Actualiser' : 'Refresh'}
                className="text-[11px] text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90">↻</button>
              </div>
          </div>
          {/* v0.62.659 — same location/station-search row as the carousel header. */}
          <StationLocationField lang={lang} onSelectStation={inspectStation} />
        </div>
        {/* v0.62.609 — operator (IMG_3595): the zone pills sat translucent directly
            over the busy map ("horrible"). Seat them on a SOLID skeuo-card (same as
            the title card) so they read cleanly, matching the two-panel styling. */}
        <div className="skeuo-card rounded-2xl px-2 py-1.5 pointer-events-auto">
          <div className="flex justify-start gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {regionList.map((r) => {
              const sel = r.region === activeRegion;
              return (
                <button key={r.region} onClick={() => pickRegion(r.region)} aria-pressed={sel}
                  className={`px-2 py-1 rounded-full text-[11px] whitespace-nowrap shrink-0 active:scale-95 ${sel ? 'skeuo-pill--selected border border-tg-accent/50 font-semibold' : 'bg-tg-bg/90 liquid-glass text-tg-text'}`}>
                  <span className="mr-0.5">{REGION_EMOJI[r.region] || '·'}</span>{regionLabel(r.region)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* the draggable list drawer */}
      {active && (
        <BottomSheet contentRef={panelScrollRef} onContentScroll={onPanelScroll}
          ariaLabel={t('sheet.dragHandle', lang)}>
          {busy && <p className="text-xs text-tg-hint p-3">{t('status.loading', lang)}</p>}
          {err && <p className="text-xs text-red-500 p-3">⚠ {err}</p>}
          {!busy && !err && (
            // v0.62.642 — the drawer now serves TABLETS too (portrait), so lay the
            // centres out in 2 columns on a wide screen (the two-panel's listClass)
            // and a single column on a phone.
            // v0.62.651 — operator: "Can you create dynamic awareness for desktop
            // and ipad landscape version? … I haven't check the hawker tma in
            // desktop mode." It had the same device-class problem Transport did:
            // `isWide` collapsed an iPad-landscape (1133 px) and a desktop window
            // (1440 px+) into one 2-column layout. Same viewport-width breakpoints
            // as the Train list — 2 / 3 / 4 — so both apps re-flow identically and
            // a resized Telegram Desktop window is handled, which no device guess
            // can do. (A {/* … */} comment cannot open a parenthesised JSX
            // expression — that mistake has now broken five builds.)
            <div ref={listParent} className="grid grid-cols-2 min-[700px]:grid-cols-3 xl:grid-cols-4 items-start gap-2 px-2 pt-1">
              {active.centres.map((c, i) => (
                <React.Fragment key={i}>{renderCentreCard(c, i)}</React.Fragment>
              ))}
            </div>
          )}
        </BottomSheet>
      )}
      <FooterDock lang={lang} footerTag={footerTag} atBottom={panelAtBottom} scrollEl={panelScrollRef} zoneInfo={zoneInfo}
        leading={<ViewToggleButton viewMode={viewMode} lang={lang}
          onToggle={() => withViewTransition(() => setViewMode('carousel'))} />} />
    </div>
  );

  // v0.62.590 — operator: PHONES now use the SAME responsive layout as tablet/
  // desktop (no more phone-only stacked scroll where the map scrolled away).
  //   • landscape (any device) → full-bleed map + bottom carousel
  //   • portrait + map expanded → that same carousel (collapsible via ⇱)
  //   • portrait otherwise      → two-panel: top-fixed map + scrolling list
  // The map's ⇲/⇱ toggles a phone between the listing and the carousel, exactly
  // as it already did on portrait tablets.
  // v0.62.608 — operator: a PHONE in portrait uses the draggable drawer instead
  // of the static two-panel (tablets keep the two-panel — more room).
  // v0.62.642 — operator: "Where is the drawer overlay effect while Google map is
  // behind in all three TMA." PORTRAIT on ANY device now uses the draggable
  // BottomSheet drawer over a full-bleed map (was: phone → drawer, tablet →
  // portraitTabletPanel's static two-panel split, where the map was a fixed block
  // ABOVE the list rather than BEHIND it). portraitTabletPanel() is kept in the
  // file (unreferenced) so the two-panel can be restored in one line if wanted.
  // v0.62.648 — operator: Cuisine's model, exactly. CAROUSEL is the default on
  // every device and orientation; the footer's ⊿ List toggle is the ONE route
  // into the drawer, which is where the over-the-map overlay effect lives. The
  // portrait-only auto-drawer (v0.62.642) is gone — it meant a portrait iPad
  // never saw the carousel cards at all.
  // `false` (not `vp.orientation !== 'landscape'`): with the portrait two-panel
  // gone there is nothing for the map's ⇱ to collapse BACK to, so the map keeps
  // its own internal ⇲ fullscreen overlay rather than a dead layout toggle.
  //
  // v0.62.661 — operator: an iPhone in LANDSCAPE + list mode has too little
  // vertical room for the over-the-map drawer to both show the list AND leave
  // the map visible — even its tightest peek snap obstructs a large share of
  // an already-short (~375-430px) viewport. Carved out to the below-map,
  // independently-scrollable two-panel `portraitTabletPanel()` instead — the
  // exact static split tablets used before v0.62.642, kept unreferenced for
  // precisely this "restore it in one line" scenario. Every other case
  // (portrait phone, any tablet/desktop orientation) is unchanged.
  if (viewMode === 'list') {
    if (vp.deviceClass === 'mobile' && vp.orientation === 'landscape') return portraitTabletPanel();
    return drawerLayout();
  }
  return carouselLayout(false);
}
