// Clipboard / Sketchbook TMA root component.
//
// v0.62.417 (P2) — the app is now framed by Shell (sticky header + fixed 4-tab
// footer + hamburger). Four screens: Clipboard (catch-all), {default cabinet}
// (footer tab 2), Cabinets (grid), Settings. A shared-drawer deep link renders
// SharedView full-screen WITHOUT the chrome. Sheets float above the active screen.

import React, { useState, useCallback, useEffect } from 'react';
import { useClipboardStore } from './lib/state.js';
import { getLanguage } from './lib/tg.js';
import * as api from './lib/api.js';
import { useDrag } from './lib/dnd.js';
import { t } from './lib/i18n.js';

import Shell         from './components/Shell.jsx';
import CatchAllStrip from './components/CatchAllStrip.jsx';
import CabinetGrid   from './components/CabinetGrid.jsx';
import CabinetView   from './components/CabinetView.jsx';
import SettingsView  from './components/SettingsView.jsx';
import SharedView    from './components/SharedView.jsx';
import {
  CreateCabinetSheet, AddDrawerSheet, AmendCardSheet, ShareDrawerSheet, FileSheet
} from './components/sheets.jsx';

export default function App() {
  const lang = getLanguage();
  const { state, reloadState, loadCabinet, setRoute } = useClipboardStore();
  const [sheet, setSheet] = useState(null);   // 'createCab' | 'addDrawer' | { kind:'amend', card } | { kind:'share', url }
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('clipboard'); // root-level tab when not inside a cabinet
  // v0.62.418 — header chips filter the user's OWN saved cards (not new search).
  const [cuisineSel, setCuisineSel] = useState([]);          // v0.62.451 — selected cuisine slugs (multi, ≤5)
  const [catalogue, setCatalogue] = useState([]);           // v0.62.451 — cuisine groups from /api/cuisine/catalogue (mirror Cuisine TMA)
  useEffect(() => {
    let live = true;
    fetch('/api/cuisine/catalogue').then((r) => r.ok ? r.json() : null)
      .then((d) => { if (live && d && Array.isArray(d.categories)) setCatalogue(d.categories); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  const [dishFilter, setDishFilter] = useState(null);       // keyword string | null
  const [facets, setFacets] = useState({ minRating: null, price: null, openNow: false, crowd: null, michelin: false }); // v0.62.441
  const [fileCard, setFileCard] = useState(null);           // v0.62.420 — card being filed
  const catchAllCards = state.catchAllCards || [];

  // Drag drop handler — fires when a long-press drag lands on a target.
  const onDrop = useCallback(async ({ kind, cabinetId, drawerIdx, cardId }) => {
    if (!cardId) return;
    try {
      setBusy(true);
      if (kind === 'cabinet') {
        const r = await api.getCabinet(cabinetId);
        const firstIdx = (r?.drawers || []).length > 0 ? 0 : null;
        if (firstIdx == null) { alert(t('cabinet.empty', lang)); return; }
        await api.placeCard(cardId, cabinetId, firstIdx);
      } else if (kind === 'drawer') {
        await api.placeCard(cardId, cabinetId, drawerIdx);
      }
      await reloadState();
      if (state.currentCabinetId) await loadCabinet(state.currentCabinetId);
    } catch (err) {
      alert(`Drop failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }, [reloadState, loadCabinet, state.currentCabinetId, lang]);
  const { dragging, dragHandle } = useDrag({ onDrop });

  // ── Shared-drawer deep link: full-screen, no chrome ──
  if (state.route.kind === 'shared') {
    return (
      <SharedView
        token={state.route.token}
        lang={lang}
        cabinets={state.cabinets}
        onBack={() => setRoute({ kind: 'root' })}
        onForkDone={(r) => {
          reloadState();
          if (r?.cabinetId) setRoute({ kind: 'cabinet', cabId: r.cabinetId });
          else setRoute({ kind: 'root' });
        }}
      />
    );
  }

  // ── Tab + footer wiring ──
  const inCabinet = state.route.kind === 'cabinet';
  const screen = inCabinet ? 'cabinet' : tab;
  const defaultCab = state.cabinets.find((c) => c.cabId === state.defaultCabinetId) || null;
  const footerCabinetLabel = defaultCab
    ? `${defaultCab.emoji ? defaultCab.emoji + ' ' : ''}${defaultCab.name}`
    : null;
  // v0.62.430 — header title follows the DEFAULT cabinet (items 1+2), not the
  // currently-open one; falls back to the open cabinet, then nothing.
  const activeCabinetName = (defaultCab && defaultCab.name)
    || (inCabinet ? (state.currentCabinet?.cabinet?.name || '') : '');

  const onNav = (s) => {
    if (s === 'cabinet') {
      // Footer tab 2 opens the DEFAULT cabinet; with none set, fall to Cabinets.
      if (state.defaultCabinetId) { setRoute({ kind: 'cabinet', cabId: state.defaultCabinetId }); }
      else { setRoute({ kind: 'root' }); setTab('cabinets'); }
      return;
    }
    if (inCabinet) setRoute({ kind: 'root' });
    setTab(s);
  };
  const refresh = () => { reloadState(); if (state.currentCabinetId) loadCabinet(state.currentCabinetId); };
  const backToCabinets = () => { setRoute({ kind: 'root' }); setTab('cabinets'); };

  // ── Card filtering (header chips) ──
  const cabinetCards = inCabinet
    ? (state.currentCabinet?.drawers || []).flatMap((d) => d.cards || [])
    : [];
  const baseCards = inCabinet ? cabinetCards : catchAllCards;
  // Cuisine options: distinct cuisines across the visible base set, with counts.
  const cuisineOptions = (() => {
    const counts = new Map();
    for (const c of baseCards) {
      for (const cu of (c.cuisines || [])) {
        const v = String(cu || '').trim();
        if (v) counts.set(v.toLowerCase(), (counts.get(v.toLowerCase()) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }));
  })();
  // v0.62.450 — derive REAL dish choices from the saved cards' venue data
  // (the same "🍲 Try" source: signatureDish / cityDish / dishes[]). Only cards
  // that carry a notable dish contribute, ranked by frequency — so "Pick Local
  // Dish" offers places with significant dishes, not a blind keyword box.
  const dishOptions = (() => {
    const counts = new Map();
    for (const c of baseCards) {
      const v = c.venue; if (!v) continue;
      const cand = [v.signatureDish, v.cityDish, ...(Array.isArray(v.dishes) ? v.dishes : [])];
      for (const d of cand) {
        const val = String(d || '').trim();
        if (!val) continue;
        const key = val.toLowerCase();
        const prev = counts.get(key);
        counts.set(key, { label: prev?.label || val, count: (prev?.count || 0) + 1 });
      }
    }
    return [...counts.entries()].sort((a, b) => b[1].count - a[1].count)
      .map(([value, m]) => ({ value, label: m.label, count: m.count }));
  })();
  // v0.62.451 — grey-out map: which catalogue cuisine slugs actually appear in
  // the saved cards (match saved cuisine strings against catalogue slug/name).
  const savedCuisineSet = (() => {
    const set = new Set();
    for (const c of baseCards) for (const cu of (c.cuisines || [])) {
      const v = String(cu || '').trim().toLowerCase(); if (v) set.add(v);
    }
    return set;
  })();
  const slugName = new Map();
  for (const cat of catalogue) for (const cu of (cat.cuisines || [])) slugName.set(cu.slug, cu.name);
  const availableSlugs = (() => {
    const set = new Set();
    for (const cat of catalogue) for (const cu of (cat.cuisines || [])) {
      if (savedCuisineSet.has(String(cu.name || '').toLowerCase()) || savedCuisineSet.has(String(cu.slug || '').toLowerCase())) set.add(cu.slug);
    }
    if (baseCards.some((c) => c.venue && c.venue.michelinCategory)) set.add('michelin');
    return set;
  })();
  const cardMatches = (c) => {
    if (!c) return false;
    if (cuisineSel.length) {
      const wanted = new Set();
      for (const sl of cuisineSel) { wanted.add(String(sl).toLowerCase()); const nm = slugName.get(sl); if (nm) wanted.add(String(nm).toLowerCase()); }
      const cs = (c.cuisines || []).map((x) => String(x).toLowerCase());
      const cuisineHit = cs.some((x) => wanted.has(x));
      const michHit = cuisineSel.includes('michelin') && c.venue && c.venue.michelinCategory;
      if (!cuisineHit && !michHit) return false;
    }
    if (dishFilter) {
      const df = dishFilter.toLowerCase();
      const vv = c.venue;
      const dishHay = vv ? [vv.signatureDish, vv.cityDish, ...(Array.isArray(vv.dishes) ? vv.dishes : [])].filter(Boolean).join(' ').toLowerCase() : '';
      const textHay = `${c.name || ''} ${c.preview || ''} ${c.body || ''} ${c.note || ''}`.toLowerCase();
      if (!dishHay.includes(df) && !textHay.includes(df)) return false;
    }
    // v0.62.441 — richer facets (over the stored venue): rating / price / open /
    // crowd / michelin. Cards with no structured venue fail an active facet.
    const v = c.venue;
    if (facets.minRating && !(v && v.rating >= facets.minRating)) return false;
    if (facets.price && !(v && v.priceLevel === facets.price)) return false;
    if (facets.openNow && !(v && v.openNow === true)) return false;
    if (facets.crowd && !(v && v.crowdLevel === facets.crowd)) return false;
    if (facets.michelin && !(v && v.michelinCategory)) return false;
    return true;
  };
  const facetsActive = !!(facets.minRating || facets.price || facets.openNow || facets.crowd || facets.michelin);
  const filterActive = !!(cuisineSel.length || dishFilter || facetsActive);
  const filteredCatchAll = filterActive ? catchAllCards.filter(cardMatches) : catchAllCards;
  const filteredPayload = (inCabinet && filterActive && state.currentCabinet)
    ? { ...state.currentCabinet, drawers: (state.currentCabinet.drawers || []).map((d) => ({ ...d, cards: (d.cards || []).filter(cardMatches) })) }
    : state.currentCabinet;

  const sheets = renderSheets({ sheet, setSheet, busy, setBusy, lang, state, reloadState, loadCabinet, setRoute });

  return (
    <Shell
      lang={lang}
      screen={screen}
      activeCabinetName={activeCabinetName}
      footerCabinetLabel={footerCabinetLabel}
      onNav={onNav}
      onRefresh={refresh}
      cuisineSel={cuisineSel}
      dishFilter={dishFilter}
      catalogue={catalogue}
      availableSlugs={availableSlugs}
      dishOptions={dishOptions}
      onSetCuisine={(arr) => setCuisineSel(arr)}
      onSetDish={(v) => setDishFilter(v)}
      facets={facets}
      onSetFacet={(k, v) => setFacets((f) => ({ ...f, [k]: v }))}
      onClearFacets={() => { setCuisineSel([]); setFacets({ minRating: null, price: null, openNow: false, crowd: null, michelin: false }); }}
    >
      {inCabinet ? (
        <CabinetView
          payload={filteredPayload}
          lang={lang}
          onBack={backToCabinets}
          onAddDrawer={() => setSheet('addDrawer')}
          onTapCard={(c) => setSheet({ kind: 'amend', card: c })}
          onDeleteDrawer={async (n) => {
            try {
              setBusy(true);
              await api.deleteDrawer(state.currentCabinetId, n);
              await loadCabinet(state.currentCabinetId);
              await reloadState();
            } catch (err) { alert(err.message); }
            finally { setBusy(false); }
          }}
          onMoveDrawer={async (from, to) => {
            try {
              setBusy(true);
              await api.updateDrawer(state.currentCabinetId, from, { moveTo: to });
              await loadCabinet(state.currentCabinetId);
            } catch (err) { alert(err.message); }
            finally { setBusy(false); }
          }}
          onDeleteCabinet={async () => {
            try {
              setBusy(true);
              await api.deleteCabinet(state.currentCabinetId);
              await reloadState();
              backToCabinets();
            } catch (err) { alert(err.message); }
            finally { setBusy(false); }
          }}
          isDefault={state.defaultCabinetId === state.currentCabinetId}
          onSetDefault={async () => {
            try { setBusy(true); await api.setDefaultCabinet(state.currentCabinetId); await reloadState(); }
            catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
          onSaveCabinet={async (patch) => {
            try { setBusy(true); await api.updateCabinet(state.currentCabinetId, patch); await loadCabinet(state.currentCabinetId); await reloadState(); }
            catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
          onDuplicateCabinet={async () => {
            try { setBusy(true); const r = await api.duplicateCabinet(state.currentCabinetId); await reloadState(); if (r?.cabinet?.cabId) setRoute({ kind: 'cabinet', cabId: r.cabinet.cabId }); }
            catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
          onDuplicateDrawer={async (n) => {
            try { setBusy(true); await api.duplicateDrawer(state.currentCabinetId, n); await loadCabinet(state.currentCabinetId); }
            catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
          onUnplace={async (cardId, n) => {
            try { setBusy(true); await api.unplaceCard(cardId, state.currentCabinetId, n); await loadCabinet(state.currentCabinetId); await reloadState(); }
            catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
          onUpdateDrawer={async (n, patch) => {
            try { setBusy(true); await api.updateDrawer(state.currentCabinetId, n, patch); await loadCabinet(state.currentCabinetId); }
            catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
        />
      ) : tab === 'clipboard' ? (
        <CatchAllStrip
          cards={filteredCatchAll}
          lang={lang}
          archivedCount={state.archivedCount}
          onTapCard={(c) => setSheet({ kind: 'amend', card: c })}
          onFileCard={(c) => setFileCard(c)}
          onArchiveAll={async () => {
            try { setBusy(true); await api.archiveAll(); await reloadState(); }
            catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
          onRestore={async () => {
            try { setBusy(true); await api.restoreArchive(); await reloadState(); }
            catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
          onNewCard={async () => {
            try {
              setBusy(true);
              const r = await api.createBlankCard();
              await reloadState();
              if (r?.cardId) setSheet({ kind: 'amend', card: { cardId: r.cardId, name: '', note: '' } });
            } catch (err) { alert(err.message); } finally { setBusy(false); }
          }}
          dragHandle={dragHandle}
          draggingCardId={dragging?.cardId}
        />
      ) : tab === 'cabinets' ? (
        <CabinetGrid
          cabinets={state.cabinets}
          lang={lang}
          defaultCabinetId={state.defaultCabinetId}
          activeCabinetId={state.currentCabinetId}
          onOpen={(cabId) => setRoute({ kind: 'cabinet', cabId })}
          onNew={() => setSheet('createCab')}
        />
      ) : (
        <SettingsView
          lang={lang}
          onForgetMe={async () => {
            try {
              setBusy(true);
              for (const c of (state.cabinets || [])) { try { await api.deleteCabinet(c.cabId); } catch { /* continue */ } }
              for (const card of (state.catchAllCards || [])) { try { await api.deleteCard(card.cardId); } catch { /* continue */ } }
              await reloadState();
              setRoute({ kind: 'root' }); setTab('clipboard');
            } catch (err) { alert(err.message); }
            finally { setBusy(false); }
          }}
        />
      )}

      {state.error && (
        <div className="mt-4 text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded p-2">
          ⚠ {state.error}
        </div>
      )}
      {busy && <div className="fixed bottom-20 right-2 text-[10px] text-tg-hint">…</div>}
      {sheets}

      {fileCard && (
        <FileSheet
          card={fileCard}
          cabinets={state.cabinets}
          lang={lang}
          getCabinet={(cabId) => api.getCabinet(cabId)}
          onCreateCabinet={async (name) => {
            const r = await api.createCabinet({ name });
            await reloadState();
            return r?.cabinet || null;
          }}
          onPlaceExisting={async (cabId, idx) => {
            try {
              setBusy(true);
              await api.placeCard(fileCard.cardId, cabId, idx);
              setFileCard(null);
              await reloadState();
              if (state.currentCabinetId) await loadCabinet(state.currentCabinetId);
            } catch (err) { alert(err.message); }
            finally { setBusy(false); }
          }}
          onPlaceNewDrawer={async (cabId, segment) => {
            try {
              setBusy(true);
              const r = await api.addDrawer(cabId, { segment });
              const idx = Number.isInteger(r?.index) ? r.index : 0;
              await api.placeCard(fileCard.cardId, cabId, idx);
              setFileCard(null);
              await reloadState();
              if (state.currentCabinetId) await loadCabinet(state.currentCabinetId);
            } catch (err) { alert(err.message); }
            finally { setBusy(false); }
          }}
          onClose={() => setFileCard(null)}
        />
      )}
    </Shell>
  );
}

function renderSheets({ sheet, setSheet, busy, setBusy, lang, state, reloadState, loadCabinet, setRoute }) {
  if (!sheet) return null;

  if (sheet === 'createCab') {
    return (
      <CreateCabinetSheet
        lang={lang}
        defaultName={(state.cabinets || []).length === 0 ? t('cabinet.firstName', lang) : ''}
        onCancel={() => setSheet(null)}
        onSave={async (patch) => {
          try {
            setBusy(true);
            const r = await api.createCabinet(patch);
            setSheet(null);
            await reloadState();
            if (r?.cabinet?.cabId && setRoute) setRoute({ kind: 'cabinet', cabId: r.cabinet.cabId });
          } catch (err) { alert(err.message); }
          finally { setBusy(false); }
        }}
      />
    );
  }

  if (sheet === 'addDrawer') {
    return (
      <AddDrawerSheet
        lang={lang}
        cabinetName={state.currentCabinet?.cabinet?.name || ''}
        onCancel={() => setSheet(null)}
        onSave={async (patch) => {
          try {
            setBusy(true);
            await api.addDrawer(state.currentCabinetId, patch);
            setSheet(null);
            await loadCabinet(state.currentCabinetId);
          } catch (err) { alert(err.message); }
          finally { setBusy(false); }
        }}
      />
    );
  }

  if (sheet.kind === 'amend') {
    return (
      <AmendCardSheet
        card={sheet.card}
        lang={lang}
        cabinets={state.cabinets}
        onCancel={() => setSheet(null)}
        onSave={async (patch) => {
          try {
            setBusy(true);
            await api.amendCard(sheet.card.cardId, patch);
            setSheet(null);
            await reloadState();
            if (state.currentCabinetId) await loadCabinet(state.currentCabinetId);
          } catch (err) { alert(err.message); }
          finally { setBusy(false); }
        }}
        onDelete={async () => {
          if (!window.confirm('Delete this card?')) return;
          try {
            setBusy(true);
            await api.deleteCard(sheet.card.cardId);
            setSheet(null);
            await reloadState();
            if (state.currentCabinetId) await loadCabinet(state.currentCabinetId);
          } catch (err) { alert(err.message); }
          finally { setBusy(false); }
        }}
        onMove={async (targetCabId) => {
          try {
            setBusy(true);
            const r = await api.getCabinet(targetCabId);
            const firstIdx = (r?.drawers || []).length > 0 ? 0 : null;
            if (firstIdx == null) { alert(t('cabinet.empty', lang)); return; }
            await api.placeCard(sheet.card.cardId, targetCabId, firstIdx);
            setSheet(null);
            await reloadState();
            if (state.currentCabinetId) await loadCabinet(state.currentCabinetId);
          } catch (err) { alert(err.message); }
          finally { setBusy(false); }
        }}
      />
    );
  }

  if (sheet.kind === 'share') {
    return <ShareDrawerSheet url={sheet.url} lang={lang} onClose={() => setSheet(null)} />;
  }

  return null;
}
