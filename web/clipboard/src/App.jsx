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
import CatchAllStrip from './components/CatchAllStrip.jsx';
import CabinetGrid   from './components/CabinetGrid.jsx';
import CabinetView   from './components/CabinetView.jsx';
import SettingsView  from './components/SettingsView.jsx';
import SharedView    from './components/SharedView.jsx';
import {
  CreateCabinetSheet, AddDrawerSheet, AmendCardSheet, ShareDrawerSheet
} from './components/sheets.jsx';

export default function App() {
  const lang = getLanguage();
  const { state, reloadState, loadCabinet, setRoute } = useClipboardStore();
  const [sheet, setSheet] = useState(null);   // 'createCab' | 'addDrawer' | { kind:'amend', card } | { kind:'share', url }
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('clipboard'); // root-level tab when not inside a cabinet
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

  const sheets = renderSheets({ sheet, setSheet, busy, setBusy, lang, state, reloadState, loadCabinet, setRoute });

  return (
    <Shell
      lang={lang}
      screen={screen}
      activeCabinetName={activeCabinetName}
      footerCabinetLabel={footerCabinetLabel}
      onNav={onNav}
      onRefresh={refresh}
    >
      {inCabinet ? (
        <CabinetView
          payload={state.currentCabinet}
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
        />
      ) : tab === 'clipboard' ? (
        <CatchAllStrip
          cards={catchAllCards}
          lang={lang}
          onTapCard={(c) => setSheet({ kind: 'amend', card: c })}
          dragHandle={dragHandle}
          draggingCardId={dragging?.cardId}
        />
      ) : tab === 'cabinets' ? (
        <CabinetGrid
          cabinets={state.cabinets}
          lang={lang}
          onOpen={(cabId) => setRoute({ kind: 'cabinet', cabId })}
          onNew={() => setSheet('createCab')}
        />
      ) : (
        <SettingsView lang={lang} />
      )}

      {state.error && (
        <div className="mt-4 text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded p-2">
          ⚠ {state.error}
        </div>
      )}
      {busy && <div className="fixed bottom-20 right-2 text-[10px] text-tg-hint">…</div>}
      {sheets}
    </Shell>
  );
}

function renderSheets({ sheet, setSheet, busy, setBusy, lang, state, reloadState, loadCabinet, setRoute }) {
  if (!sheet) return null;

  if (sheet === 'createCab') {
    return (
      <CreateCabinetSheet
        lang={lang}
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
