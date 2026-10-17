// Clipboard TMA root component. Renders one of three top-level routes
// (Root / CabinetView / SharedView) and threads the drag+drop wiring
// through. Sheets float above the active route.

import React, { useState, useCallback } from 'react';
import { useClipboardStore } from './lib/state.js';
import { getLanguage } from './lib/tg.js';
import * as api from './lib/api.js';
import { useDrag } from './lib/dnd.js';
import { t } from './lib/i18n.js';

import CatchAllStrip from './components/CatchAllStrip.jsx';
import CabinetGrid   from './components/CabinetGrid.jsx';
import CabinetView   from './components/CabinetView.jsx';
import SharedView    from './components/SharedView.jsx';
import {
  CreateCabinetSheet, AddDrawerSheet, AmendCardSheet, ShareDrawerSheet
} from './components/sheets.jsx';

export default function App() {
  const lang = getLanguage();
  const { state, reloadState, loadCabinet, setRoute } = useClipboardStore();
  const [sheet, setSheet] = useState(null);   // 'createCab' | 'addDrawer' | { kind:'amend', card } | { kind:'share', url }
  const [busy, setBusy] = useState(false);
  // v0.62.330 — `/state` now returns catchAllCards in full (PR #3 surgical
  // extension of the PR #2 endpoint). Strip renders from state directly.
  const catchAllCards = state.catchAllCards || [];

  // Drag drop handler — fires when a long-press drag lands on a target.
  const onDrop = useCallback(async ({ kind, cabinetId, drawerIdx, cardId }) => {
    if (!cardId) return;
    try {
      setBusy(true);
      if (kind === 'cabinet') {
        // Dropping on a cabinet tile lands the card in the FIRST drawer.
        const r = await api.getCabinet(cabinetId);
        const firstIdx = (r?.drawers || []).length > 0 ? 0 : null;
        if (firstIdx == null) {
          alert(t('cabinet.empty', lang));
          return;
        }
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

  // Route renderers.
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

  if (state.route.kind === 'cabinet') {
    return (
      <>
        <CabinetView
          payload={state.currentCabinet}
          lang={lang}
          onBack={() => setRoute({ kind: 'root' })}
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
              // PR #2's PATCH /cabinet/:id/drawer/:n accepts `moveTo` for
              // manual reorder. card_locs is re-keyed server-side so the
              // inverse index stays consistent across the shift.
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
              setRoute({ kind: 'root' });
            } catch (err) { alert(err.message); }
            finally { setBusy(false); }
          }}
        />
        {renderSheets({ sheet, setSheet, busy, setBusy, lang, state, reloadState, loadCabinet })}
        {dragging && <div />}
      </>
    );
  }

  // Root view.
  return (
    <div className="px-3 py-3">
      <header className="flex items-center mb-3">
        <h1 className="text-lg font-semibold">📋 {t('chrome.title', lang)}</h1>
      </header>
      <CatchAllStrip
        cards={catchAllCards}
        lang={lang}
        onTapCard={(c) => setSheet({ kind: 'amend', card: c })}
        dragHandle={dragHandle}
        draggingCardId={dragging?.cardId}
      />
      <CabinetGrid
        cabinets={state.cabinets}
        lang={lang}
        onOpen={(cabId) => setRoute({ kind: 'cabinet', cabId })}
        onNew={() => setSheet('createCab')}
      />
      {state.error && (
        <div className="mt-4 text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded p-2">
          ⚠ {state.error}
        </div>
      )}
      {busy && <div className="fixed bottom-2 right-2 text-[10px] text-tg-hint">…</div>}
      {renderSheets({ sheet, setSheet, busy, setBusy, lang, state, reloadState, loadCabinet, setRoute })}
    </div>
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
