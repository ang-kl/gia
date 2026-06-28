// Clipboard / Sketchbook TMA root component.
//
// v0.62.417 (P2) — the app is now framed by Shell (sticky header + fixed 4-tab
// footer + hamburger). Four screens: Clipboard (catch-all), {default cabinet}
// (footer tab 2), Cabinets (grid), Settings. A shared-drawer deep link renders
// SharedView full-screen WITHOUT the chrome. Sheets float above the active screen.

import React, { useState, useCallback } from 'react';
import { useClipboardStore } from './lib/state.js';
import { getLanguage } from './lib/tg.js';
import * as api from './lib/api.js';
import { useDrag } from './lib/dnd.js';
import { t } from './lib/i18n.js';

import Shell         from './components/Shell.jsx';
import FilterSheet   from './components/FilterSheet.jsx';
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
  const [cuisineFilter, setCuisineFilter] = useState(null); // cuisine string | null
  const [dishFilter, setDishFilter] = useState(null);       // keyword string | null
  const [filterSheet, setFilterSheet] = useState(null);     // 'cuisine' | 'dish' | null
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
  const activeCabinetName = inCabinet ? (state.currentCabinet?.cabinet?.name || '') : '';

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
  const cardMatches = (c) => {
    if (!c) return false;
    if (cuisineFilter) {
      const cs = (c.cuisines || []).map((x) => String(x).toLowerCase());
      if (!cs.includes(cuisineFilter.toLowerCase())) return false;
    }
    if (dishFilter) {
      const hay = `${c.name || ''} ${c.preview || ''} ${c.body || ''} ${c.note || ''}`.toLowerCase();
      if (!hay.includes(dishFilter.toLowerCase())) return false;
    }
    return true;
  };
  const filterActive = !!(cuisineFilter || dishFilter);
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
      cuisineFilter={cuisineFilter}
      dishFilter={dishFilter}
      onOpenCuisineFilter={() => setFilterSheet('cuisine')}
      onOpenDishFilter={() => setFilterSheet('dish')}
      onClearCuisine={() => setCuisineFilter(null)}
      onClearDish={() => setDishFilter(null)}
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
        />
      ) : tab === 'clipboard' ? (
        <CatchAllStrip
          cards={filteredCatchAll}
          lang={lang}
          onTapCard={(c) => setSheet({ kind: 'amend', card: c })}
          onFileCard={(c) => setFileCard(c)}
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

      {filterSheet === 'cuisine' && (
        <FilterSheet
          lang={lang} mode="list" title={t('filter.cuisineTitle', lang)}
          options={cuisineOptions} active={cuisineFilter}
          onPick={(v) => { setCuisineFilter(v); setFilterSheet(null); }}
          onClose={() => setFilterSheet(null)}
        />
      )}
      {filterSheet === 'dish' && (
        <FilterSheet
          lang={lang} mode="text" title={t('filter.dishTitle', lang)}
          active={dishFilter}
          onPick={(v) => { setDishFilter(v); setFilterSheet(null); }}
          onClose={() => setFilterSheet(null)}
        />
      )}

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
