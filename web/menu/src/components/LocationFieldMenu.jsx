// LocationFieldMenu.jsx — v0.61.123
//
// Menu TMA location anchor picker. Rendered inside the PLAN section
// (above TrainPanel) per operator spec 2026-05-23. Two ways to set
// the anchor:
//
//   1. Dropdown of 17 curated precincts (10 STB + 5 SG region buckets
//      + 2 Malaysia anchors), grouped by section. Server returns the
//      list at /api/menu/precincts.
//   2. Free-text input that POSTs to /api/menu/set-location with
//      { text }, server runs geocodeQuery and stamps the cached
//      location.
//
// When the user picks a Malaysia anchor (region 'JB' or 'MY-PUT'),
// the parent App reads the resolved location and renders SG-only
// tiles + the TrainPanel in a disabled state (greyed + tooltip).
//
// Telegram WebApp `keepalive: true` ensures the POST hits the server
// even if the user immediately taps a tile that closes the webview.

import React, { useEffect, useState } from 'react';
import { tg } from '../tg.js';
import { t } from '../i18n.js';

export default function LocationFieldMenu({ lang, onAnchorChange, currentAnchor }) {
  const [precincts, setPrecincts] = useState({ sg: [], sgRegion: [], my: [] });
  const [pickerValue, setPickerValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/menu/precincts')
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (cancelled || !body?.precincts) return;
        const grouped = { sg: [], sgRegion: [], my: [] };
        for (const p of body.precincts) {
          if (p.source === 'STB') grouped.sg.push(p);
          else if (p.source === 'region') grouped.sgRegion.push(p);
          else grouped.my.push(p);
        }
        setPrecincts(grouped);
      })
      .catch((err) => console.warn('[LocationFieldMenu] precincts fetch failed:', err.message));
    return () => { cancelled = true; };
  }, []);

  async function postSetLocation(payload) {
    const w = tg();
    if (!w) {
      setErrorMsg(t('location.setErr', lang));
      return null;
    }
    setBusy(true);
    setErrorMsg('');
    try {
      const r = await fetch('/api/menu/set-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, initData: w.initData || '' }),
        keepalive: true
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      if (!body?.ok) throw new Error(body?.error || 'set-location failed');
      onAnchorChange?.({
        label: body.label,
        lat: body.lat,
        lng: body.lng,
        region: body.region || 'SG',
        radiusCapM: body.radiusCapM || null
      });
      return body;
    } catch (err) {
      console.warn('[LocationFieldMenu] set-location failed:', err.message);
      setErrorMsg(t('location.setErr', lang));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function onPickerChange(e) {
    const id = e.target.value;
    setPickerValue(id);
    if (!id) return;
    postSetLocation({ precinctId: id }).then(() => setPickerValue(''));
  }

  function onTextSubmit(e) {
    e.preventDefault();
    const text = textValue.trim();
    if (!text) return;
    postSetLocation({ text }).then((body) => {
      if (body?.ok) setTextValue('');
    });
  }

  // Current-anchor summary line, with cap note when present.
  const capKm = currentAnchor?.radiusCapM ? Math.round(currentAnchor.radiusCapM / 1000) : null;
  const capStr = capKm ? t('location.capNote', lang).replace('{km}', String(capKm)) : '';
  const summary = currentAnchor?.label
    ? t('location.currentSet', lang).replace('{label}', escapeHtml(currentAnchor.label)).replace('{cap}', capStr)
    : t('location.currentNone', lang);

  return (
    <div className="rounded-md border border-tg-border bg-tg-card p-2 flex flex-col gap-1.5">
      <div className="text-[11px] font-semibold text-tg-text">{t('location.fieldLabel', lang)}</div>
      <div className="text-[10px] text-tg-hint leading-snug" dangerouslySetInnerHTML={{ __html: summary }} />
      <select
        value={pickerValue}
        onChange={onPickerChange}
        disabled={busy}
        className="text-[12px] px-2 py-1.5 rounded bg-tg-bg border border-tg-border text-tg-text"
      >
        <option value="">{t('location.dropdownLabel', lang)}</option>
        {precincts.sg.length > 0 && (
          <optgroup label={t('location.dropdownGroupSg', lang)}>
            {precincts.sg.map((p) => (
              <option key={p.id} value={p.id}>🇸🇬 {p.label}</option>
            ))}
          </optgroup>
        )}
        {precincts.sgRegion.length > 0 && (
          <optgroup label={t('location.dropdownGroupSgReg', lang)}>
            {precincts.sgRegion.map((p) => (
              <option key={p.id} value={p.id}>🇸🇬 {p.label}</option>
            ))}
          </optgroup>
        )}
        {precincts.my.length > 0 && (
          <optgroup label={t('location.dropdownGroupMy', lang)}>
            {precincts.my.map((p) => (
              <option key={p.id} value={p.id}>🇲🇾 {p.label}{p.radiusCapM ? ` (${Math.round(p.radiusCapM/1000)} km)` : ''}</option>
            ))}
          </optgroup>
        )}
      </select>
      <form onSubmit={onTextSubmit} className="flex gap-1.5 items-center">
        <input
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder={t('location.searchPlaceholder', lang)}
          disabled={busy}
          className="flex-1 text-[12px] px-2 py-1.5 rounded bg-tg-bg border border-tg-border text-tg-text outline-none"
        />
        <button
          type="submit"
          disabled={busy || !textValue.trim()}
          className="text-[11px] px-2.5 py-1.5 rounded bg-tg-accent text-tg-accent-text disabled:opacity-40 active:opacity-90"
        >{busy ? '…' : t('location.searchSubmit', lang)}</button>
      </form>
      {errorMsg && <div className="text-[10px] text-red-500">{errorMsg}</div>}
    </div>
  );
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
