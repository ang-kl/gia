import React, { useEffect } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';
// v0.61.411 — durian-belt gate for the special slugs (durian / durian-pastry).
import { isSlugCountryAllowed, SPECIAL_SLUGS } from '../lib/cuisine-selection.js';
import { cuisineName } from '../lib/cuisine-i18n.js';
import { dishDisplayName, localChip } from './ArrivalPlate.jsx';
import { initData } from '../../api/tg.js';
// P1-d — shared dialog behaviour (focus trap / initial focus / Escape / restore).
import { useDialog } from '../../../../_shared/lib/use-dialog.js';
// v0.61.272 — Phase 4 cleanup: the v0.61.193 SG-only chip lock is
// removed. Durian / Durian Pastry / Fruits chips are now selectable
// in every region. The lib/sg-only-slugs.js module is deleted in
// this PR. Country bias now comes from the v0.61.271 countryCode
// plumbing + v0.61.267 OTHER autocomplete; if a region truly has
// no results, the existing "no match" path surfaces that.

// v0.62.463 — dish-type badge colours (12 groups from dish-food-group.js).
// Colour is decorative only; the label text always carries the meaning.
// v0.62.469 — meal-time / dietary badges from the grounded taxonomy. Icons are
// language-neutral; the enum text stays English for now (localising these ~15
// controlled-vocab labels is the planned enum-label translation step).
const MEALTIME_ICON = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍡', anytime: '🕒' };
const DIETARY_ICON = { vegetarian: '🥬', meat: '🍖', seafood: '🦐', mixed: '🍽️' };

// v0.62.670 — operator (O-85 item 2): the solid -100 pastel fills + -800 ink
// were light-mode-only (glaring/illegible on a dark Telegram theme). Same
// decorative hue per group, but as a translucent -500/20 wash over the theme
// surface with theme ink — near-identical tint in light mode, readable in
// dark. The label text still carries the meaning (colour stays decorative).
const GROUP_BADGE_CLASS = {
  noodles: 'bg-amber-500/20 text-tg-text', rice: 'bg-yellow-500/20 text-tg-text',
  'bread-dumpling': 'bg-orange-500/20 text-tg-text', soup: 'bg-sky-500/20 text-tg-text',
  grilled: 'bg-red-500/20 text-tg-text', 'stew-curry': 'bg-rose-500/20 text-tg-text',
  seafood: 'bg-cyan-500/20 text-tg-text', veg: 'bg-green-500/20 text-tg-text',
  snack: 'bg-lime-500/20 text-tg-text', sweet: 'bg-pink-500/20 text-tg-text',
  drink: 'bg-blue-500/20 text-tg-text', other: 'bg-gray-500/20 text-tg-text',
};

// v0.59.6: keep in sync with CuisineDrawer's CATEGORY_LABEL_KEY map.
const CATEGORY_LABEL_KEY = {
  'common-here':     'cat.commonHere',
  'southeast-asian': 'cat.southeastAsian',
  'east-asian':      'cat.eastAsian',
  'china-regional':  'cat.chinaRegional',
  'south-asian':     'cat.southAsian',
  'middle-eastern':  'cat.middleEastern',
  'european':        'cat.european',
  'americas':        'cat.americas',
  'australasia':     'cat.australasia',
  'african':         'cat.african'
};

// v0.59.0: drill-down overlay for a single cuisine category. Replaces
// the v0.58.x inline-expansion drawer (which fought CSS-grid row
// heights and produced ragged chip-wraps in narrow cells). Layout:
// fixed full-screen overlay with a back-arrow header and a 2-column
// grid of flag-prefixed pills. Tapping a pill toggles selection;
// tapping back-arrow / scrim closes.
export default function CuisineCategoryDrawer({ category, selected, onToggle, onClose, maxSelected, region = 'SG', beltCountry = '', michelinCuisines = null, onPickDish = null, onDrillChange = null }) {
  // v0.61.272 — `region` is still threaded through for future
  // per-country UX hooks (e.g. flag preview, regional sort) but no
  // longer gates chip selectability.
  // v0.61.411 — `beltCountry` DOES gate the durian / durian-pastry chips: they
  // disable (grey + non-tappable) outside the SE-Asian durian belt.
  const [lang] = useLocale();
  // v0.62.453 — "Dishes" reveal: a pop-up (like Pick local classic) listing this
  // cuisine's curated iconicDishes (name + native `local`); tap a dish → search.
  const [dishModal, setDishModal] = React.useState(null); // { slug, name, flag } | null
  const [dishList, setDishList] = React.useState([]);
  const [dishLoading, setDishLoading] = React.useState(false);
  const [dishDetail, setDishDetail] = React.useState(null); // one dish's full-explanation view | null
  const openDishes = (slug, name, flag) => {
    setDishModal({ slug, name, flag }); setDishList([]); setDishLoading(true);
    fetch(`/api/cuisine/dishes?slug=${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json', 'X-Telegram-Init-Data': initData() || '' } }).then((r) => (r.ok ? r.json() : null))
      .then((d) => setDishList(d && Array.isArray(d.dishes) ? d.dishes : []))
      .catch(() => {}).finally(() => setDishLoading(false));
  };
  // P1-d — one focus-trap per stacked layer, each active only while its layer
  // is TOPMOST (so exactly one trap owns Tab/Escape at a time and Escape pops
  // only that layer — the old always-on document Escape listener, which closed
  // the ROOT drawer even under the dish pop-ups, is replaced by these).
  const rootDialogRef = useDialog({
    open: !!category && !dishModal && !dishDetail,
    onClose,
  });
  const dishListDialogRef = useDialog({
    open: !!dishModal && !dishDetail,
    onClose: () => setDishModal(null),
  });
  const dishDetailDialogRef = useDialog({
    open: !!dishDetail,
    onClose: () => setDishDetail(null),
  });

  // v0.62.479 — report the drill DEPTH + the topmost "back" handler UP to App,
  // so the 🔙 back FAB can render inside the App bottom FAB cluster. (v0.62.478
  // rendered the FAB inside this modal, but a child's z-index can't escape this
  // root's `fixed … z-30` stacking context, so it painted BEHIND the later App
  // FAB cluster and mis-aligned over the Search FAB.) depth: 1 = this sub-cuisine
  // drawer, 2 = the dish list pop-up, 3 = the dish detail. goBack pops the
  // TOPMOST layer only; a ref keeps App calling the latest handler.
  const drillDepth = dishDetail ? 3 : dishModal ? 2 : 1;
  const goBack = dishDetail ? () => setDishDetail(null)
    : dishModal ? () => setDishModal(null)
    : (onClose || (() => {}));
  const goBackRef = React.useRef(goBack);
  goBackRef.current = goBack;
  useEffect(() => {
    onDrillChange?.(drillDepth, () => goBackRef.current?.());
    return () => onDrillChange?.(0, null);
  }, [drillDepth, onDrillChange]);

  if (!category) return null;

  const labelKey = CATEGORY_LABEL_KEY[category.id];
  const localisedLabel = labelKey ? tr(labelKey, lang) : category.label;
  const selectedInCat = category.cuisines.filter((c) => selected.includes(c.slug)).length;
  // v0.61.445 — when Michelin is in the selection, grey cuisine chips that
  // have NO star/bib venue for the picked country+city (and the durian/fruit/
  // durian-pastry special modes, which are never Michelin). `michelinCuisines`
  // is the allowed-slug array for the current country+city, or null when the
  // coverage is unknown (e.g. SG, whose Michelin data carries no routing-slug
  // cuisines) → fail OPEN (grey nothing but the special modes).
  const michelinActive = Array.isArray(selected) && selected.includes('michelin');

  return (
    // v0.58.29: was a full-screen `fixed inset-0` overlay which made
    // the bottom "Done" button hard to reach on tall phones. Reworked
    // as a backdrop-scrim + centered modal capped at min(560 px,
    // 90vh / 90vw) so the user perceives it as a popup and the Done
    // button is always visible without scrolling the body.
    <div
      /* v0.62.702 (O-130) — z-30 → z-40, same defect as MichelinFilterDrawer
         and worse here. At z-30 this root sat on the SAME tier as Cuisine's
         footer dock (App.jsx:5591), which renders LATER in the DOM, so the
         footer painted over it and stayed tappable while `aria-modal="true"`
         claimed the app was inert. And because this root is `fixed` WITH a
         z-index it opens a stacking context — the exact fact recorded at line
         ~97 below — so the nested dish pop-up (z-40) and dish detail (z-50)
         were clamped to this root's z-30 too and lost to the footer as well.
         Raising the ROOT lifts all three layers at once; their relative order
         inside is unchanged. Re-derived, not copied (D-70): z-40 is Cuisine's
         own modal tier, above the z-30 chrome, below the z-50 loading overlay. */
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={`${localisedLabel} cuisines`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={rootDialogRef}
        className="flex flex-col w-full max-w-[480px] max-h-[80vh] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden"
      >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-tg-border bg-tg-card">
        <span aria-hidden>{category.emoji}</span>
        <h2 className="text-sm font-semibold flex-1 truncate">{localisedLabel}</h2>
        {selectedInCat > 0 && (
          <span className="text-tg-accent text-xs font-semibold">[{selectedInCat}]</span>
        )}
        {/* v0.62.446 — subtle top-right × (matches the QuickFilters dropdown
            reference); replaces the ← back arrow + full-width "Done" pill. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('loc.close', lang)}
          className="text-tg-hint text-sm leading-none px-1 flex-shrink-0"
        >✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-2 gap-1.5">
          {category.cuisines.map((cu) => {
            const sel = selected.includes(cu.slug);
            // v0.61.272 — no per-slug region lock; only the maxSelected
            // dim-when-full state remains.
            const dim = !sel && selected.length >= maxSelected;
            // v0.61.411 — durian / durian-pastry disable outside the belt
            // (SG/MY/ID/TH/PH/BN/VN). Already-selected chips stay tappable so the
            // user can still DESELECT a stale pick after switching country.
            const beltBlocked = !sel && !isSlugCountryAllowed(cu.slug, beltCountry);
            // v0.61.445 — Michelin grey-out: special modes always; covered-set
            // miss only when the set is KNOWN (array). Already-selected chips
            // stay tappable so a stale pick can be removed.
            const michBlocked = !sel && michelinActive && cu.slug !== 'michelin' && (
              SPECIAL_SLUGS.has(cu.slug)
              || (Array.isArray(michelinCuisines) && !michelinCuisines.includes(cu.slug))
            );
            const disabled = (dim && !sel) || beltBlocked || michBlocked;
            return (
              <React.Fragment key={cu.slug}>
                {/* v0.62.284 — "hollow lite line": a full grid-width hairline
                    that opens a new visual group (East-Asian regional China;
                    the 5 European sub-regions). Light + borderless so it
                    reads as a soft separator, not a heavy rule. */}
                {cu.dividerBefore && (
                  <div className="col-span-2 h-px bg-tg-border/40 my-1.5" aria-hidden />
                )}
              <div className="flex flex-col">
              <button
                type="button"
                onClick={() => { if (!disabled) onToggle(cu.slug); }}
                aria-pressed={sel}
                aria-disabled={disabled || undefined}
                disabled={disabled}
                title={michBlocked
                  ? (tr('ccd.noMichelin', lang))
                  : (beltBlocked ? tr('special.beltOnly', lang) : undefined)}
                aria-label={michBlocked
                  ? (tr('ccd.noMichelin', lang))
                  : (beltBlocked ? tr('special.beltOnly', lang) : undefined)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs leading-tight whitespace-normal text-left transition-colors ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : `bg-tg-card text-tg-text border-tg-border ${(dim || beltBlocked || michBlocked) ? 'opacity-40 cursor-not-allowed' : 'hover:border-tg-accent'}`}`}
              >
                {/* v0.61.142 — operator-supplied PNG icon for the
                    durian chip (cuisines-vault.IMG_FLAG_BY_SLUG ships
                    `imgFlag: "durian.png"` on the cuisine entry).
                    Falls back to the emoji `flag` (or the default
                    🍽️ plate) when the file fails to load — so a
                    missing asset never leaves the chip iconless.
                    Other cuisines (without imgFlag) continue to
                    render the emoji span as before. */}
                {cu.imgFlag ? (
                  <span aria-hidden className="flex-shrink-0 inline-flex items-center justify-center w-4 h-4">
                    <img
                      src={`/app/cuisine/${cu.imgFlag}`}
                      alt=""
                      width="16"
                      height="16"
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        // Hide the broken <img>, then show the emoji
                        // fallback sibling.
                        e.currentTarget.style.display = 'none';
                        const fb = e.currentTarget.nextElementSibling;
                        if (fb) fb.style.display = 'inline';
                      }}
                    />
                    <span style={{ display: 'none' }} className="text-base leading-none">{cu.flag || '🍽️'}</span>
                  </span>
                ) : (
                  <span aria-hidden className="flex-shrink-0 text-base leading-none">{cu.flag || '🍽️'}</span>
                )}
                <span className="flex-1 break-words">{cuisineName(cu.slug, cu.name, lang)}</span>
                {sel && <span aria-hidden className="text-tg-accent-text flex-shrink-0">✓</span>}
              </button>
              {/* v0.62.453 — tappable "Dishes" (footer hide/list style: text-[11px]
                  font-semibold text-tg-link) opens the curated dish pop-up. */}
              <button type="button" onClick={() => openDishes(cu.slug, cuisineName(cu.slug, cu.name, lang), cu.flag)}
                className="self-start ml-3 -mt-px px-2 py-0.5 text-[10px] font-normal text-tg-link no-underline bg-tg-card border border-tg-border border-t-0 rounded-b-lg">{tr('cat.dishes', lang)} ›</button>
              </div>
              </React.Fragment>
            );
          })}
        </div>
        {selected.length >= maxSelected && (
          <div className="text-[11px] text-tg-hint italic mt-3 px-1">
            Max {maxSelected} cuisines selected. Untoggle one to add another.
          </div>
        )}
      </div>
      </div>
      {dishModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
          role="dialog" aria-modal="true" aria-labelledby="gia-drawer-dishes-title"
          onClick={(e) => { if (e.target === e.currentTarget) setDishModal(null); }}>
          <div ref={dishListDialogRef} className="flex flex-col w-full max-w-[420px] max-h-[80vh] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-3 border-b border-tg-border bg-tg-card">
              <h3 id="gia-drawer-dishes-title" className="text-sm font-semibold flex-1 truncate">{tr('cat.dishes', lang)} · {dishModal.flag ? dishModal.flag + ' ' : ''}{dishModal.name}</h3>
              <button type="button" onClick={() => setDishModal(null)} aria-label={tr('loc.close', lang)}
                className="text-tg-hint text-sm leading-none px-1 flex-shrink-0">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {dishLoading ? (
                <div className="text-center text-xs text-tg-hint py-6">…</div>
              ) : dishList.length === 0 ? (
                <div className="text-center text-xs text-tg-hint py-6">{tr('ccd.noDishes', lang)}</div>
              ) : (
                <div className="grid grid-cols-2 gap-x-3">
                  {dishList.map((d, i) => (
                    <button key={`${d.name}-${i}`} type="button"
                      onClick={() => setDishDetail(d)}
                      className="flex flex-col items-start text-left py-2 px-1 min-h-[44px] border-b border-tg-border/30">
                      {/* v0.62.463 — dish-type badge (noodles/soup/dessert/drink/…), from the
                          existing dish-food-group classifier — no new data needed. */}
                      {d.groupLabel && (
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full mb-0.5 ${GROUP_BADGE_CLASS[d.group] || GROUP_BADGE_CLASS.other}`}>
                          {d.groupLabel[lang] || d.groupLabel.en}
                        </span>
                      )}
                      <span className="text-[12px] font-medium leading-tight">{dishDisplayName(d, lang)}</span>
                      {localChip(d, lang) && <span className="text-[11px] text-tg-hint leading-tight">{localChip(d, lang)}</span>}
                      {/* v0.62.462/463 — one-line curated description preview, device-language
                          when translated; EN fallback; hidden if neither exists. Tap the dish for
                          the full, un-truncated explanation. v0.62.864 — the dish NAME is now
                          localised too (operator: "translate all the dishes into 6 languages"),
                          superseding the "stays verbatim (identity)" rule that stood here. The
                          identity that must stay verbatim is `d.name`, which is what onPickDish()
                          searches for — not what the reader sees. */}
                      {(d.note && (d.note[lang] || d.note.en)) && (
                        <span className="text-[10px] text-tg-hint leading-snug mt-0.5 line-clamp-2">{d.note[lang] || d.note.en}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* v0.62.463 — full-explanation sub-view (like Pick local classic): the
          list preview is truncated; tapping a dish opens the complete,
          un-truncated note text + a "Find eateries" search action. Sits above
          the dishes pop-up (z-50 > z-40). */}
      {dishDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog" aria-modal="true" aria-labelledby="gia-drawer-dishdetail-title"
          onClick={(e) => { if (e.target === e.currentTarget) setDishDetail(null); }}>
          <div ref={dishDetailDialogRef} className="flex flex-col w-full max-w-[380px] max-h-[70vh] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-3 border-b border-tg-border bg-tg-card">
              <h3 id="gia-drawer-dishdetail-title" className="text-sm font-semibold flex-1 truncate">{dishDisplayName(dishDetail, lang)}</h3>
              <button type="button" onClick={() => setDishDetail(null)} aria-label={tr('loc.close', lang)}
                className="text-tg-hint text-sm leading-none px-1 flex-shrink-0">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {dishDetail.groupLabel && (
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${GROUP_BADGE_CLASS[dishDetail.group] || GROUP_BADGE_CLASS.other}`}>
                  {dishDetail.groupLabel[lang] || dishDetail.groupLabel.en}
                </span>
              )}
              {/* v0.62.469 — meal-time / dietary / course from the grounded taxonomy
                  (only present once a dish is classified; hidden otherwise). */}
              {(Array.isArray(dishDetail.mealTime) || dishDetail.dietary || dishDetail.course) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {Array.isArray(dishDetail.mealTime) && dishDetail.mealTime.map((m) => (
                    <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-tg-bg border border-tg-border capitalize">
                      {MEALTIME_ICON[m] ? `${MEALTIME_ICON[m]} ` : ''}{m}
                    </span>
                  ))}
                  {dishDetail.dietary && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-tg-bg border border-tg-border capitalize">
                      {DIETARY_ICON[dishDetail.dietary] ? `${DIETARY_ICON[dishDetail.dietary]} ` : ''}{dishDetail.dietary}
                    </span>
                  )}
                  {dishDetail.course && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-tg-bg border border-tg-border capitalize">🍽 {dishDetail.course}</span>
                  )}
                </div>
              )}
              {localChip(dishDetail, lang) && (
                <div className="text-sm text-tg-hint mb-2">{localChip(dishDetail, lang)}</div>
              )}
              <p className="text-[13px] leading-relaxed text-tg-text">
                {(dishDetail.note && (dishDetail.note[lang] || dishDetail.note.en)) || (tr('ccd.descSoon', lang))}
              </p>
            </div>
            <div className="px-3 py-3 border-t border-tg-border bg-tg-card">
              <button type="button"
                onClick={() => { setDishDetail(null); setDishModal(null); onPickDish?.(dishDetail.name); }}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl bg-tg-accent text-tg-accent-text active:scale-[0.99]">
                <span aria-hidden>🔍</span>{tr('plate.findEateries', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
