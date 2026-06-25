// state.js — Clipboard TMA store.
//
// Minimal hand-rolled store; no redux/zustand. The TMA is a single user
// + small data set (≤50 catch-all cards + ≤12 cabinets), so a useReducer
// keeps things readable and obvious.

import { useEffect, useReducer, useCallback } from 'react';
import * as api from './api.js';

const initial = {
  ready: false,
  error: null,
  catchAllCount: 0,
  catchAllCards: [],
  cabinets: [],
  currentCabinet: null,        // { cabinet, drawers: [...] }
  currentCabinetId: null,
  // route: { kind: 'root' } | { kind: 'cabinet', cabId } | { kind: 'shared', token }
  route: parseRoute()
};

function parseRoute() {
  if (typeof window === 'undefined') return { kind: 'root' };
  const hash = window.location.hash || '#/';
  // #/cabinet/<id> | #/shared/<token> | else root
  const m = hash.match(/^#\/cabinet\/([^/]+)$/);
  if (m) return { kind: 'cabinet', cabId: m[1] };
  const s = hash.match(/^#\/shared\/(.+)$/);
  if (s) return { kind: 'shared', token: s[1] };
  return { kind: 'root' };
}

function reducer(state, action) {
  switch (action.type) {
    case 'state.load':
      return { ...state, ready: true, error: null, catchAllCount: action.catchAllCount, catchAllCards: action.catchAllCards || [], cabinets: action.cabinets };
    case 'cabinet.load':
      return { ...state, currentCabinet: action.payload, currentCabinetId: action.payload?.cabinet?.cabId || null };
    case 'route':
      return { ...state, route: action.route };
    case 'error':
      return { ...state, error: action.error };
    default:
      return state;
  }
}

export function useClipboardStore() {
  const [state, dispatch] = useReducer(reducer, initial);

  const reloadState = useCallback(async () => {
    try {
      const r = await api.getState();
      dispatch({ type: 'state.load', catchAllCount: r.catchAllCount || 0, catchAllCards: r.catchAllCards || [], cabinets: r.cabinets || [] });
    } catch (err) {
      dispatch({ type: 'error', error: err.message });
    }
  }, []);

  const loadCabinet = useCallback(async (cabId) => {
    try {
      const r = await api.getCabinet(cabId);
      dispatch({ type: 'cabinet.load', payload: r });
    } catch (err) {
      dispatch({ type: 'error', error: err.message });
    }
  }, []);

  const setRoute = useCallback((route) => {
    let hash = '#/';
    if (route.kind === 'cabinet') hash = `#/cabinet/${route.cabId}`;
    else if (route.kind === 'shared') hash = `#/shared/${route.token}`;
    if (typeof window !== 'undefined' && window.location.hash !== hash) {
      window.location.hash = hash;
    }
    dispatch({ type: 'route', route });
  }, []);

  // Initial load + hash-change listener.
  useEffect(() => {
    reloadState();
    function onHash() {
      dispatch({ type: 'route', route: parseRoute() });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', onHash);
      return () => window.removeEventListener('hashchange', onHash);
    }
    return undefined;
  }, [reloadState]);

  // When the route is a cabinet, load it.
  useEffect(() => {
    if (state.route.kind === 'cabinet' && state.route.cabId !== state.currentCabinetId) {
      loadCabinet(state.route.cabId);
    }
  }, [state.route, state.currentCabinetId, loadCabinet]);

  return { state, dispatch, reloadState, loadCabinet, setRoute };
}
