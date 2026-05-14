import { useReducer, useCallback } from 'react';
import { MAX_CUISINE_SELECTIONS } from './cuisines.js';

// v0.23.0: free-form integer ranges for radius, recency, queue.
// Radius:    200 m … 5000 m
// Recency:   5 days … 180 days (≈ 6 months)
// Queue:     5 min … 60 min (default 15)
//
// Preset combos retained from v0.22.0 but reshaped: they pre-fill these
// numerical fields rather than the old radius toggle.

const PRESET_CONFIG = {
  'transit-efficiency': { radius: 1500, mode: 'transit', when: 'now', recencyDays: 90, queueMaxMin: 15, cuisines: [] },
  'after-hours':        { radius: 1500, mode: 'walk',    when: 'now', recencyDays: 90, queueMaxMin: 15, cuisines: [] },
  'holiday-special':    { radius: 1500, mode: 'walk',    when: 'now', recencyDays: 90, queueMaxMin: 15, cuisines: [] },
  'cuisine-discovery':  { radius: 1500, mode: 'walk',    when: 'now', recencyDays: 90, queueMaxMin: 15, cuisines: 'preserve' }
};

const initial = {
  cuisines: [],          // multi-select chip state
  otherCuisine: '',      // free-text addendum
  radius: 1000,          // metres, 200..5000
  recencyDays: 90,       // 5..180
  queueMaxMin: 15,       // 5..60
  mode: 'walk',          // 'walk' | 'transit' | 'drive'
  when: 'now',           // 'now' | ISO datetime string
  preset: null,
  loc: null,
  loading: false,
  error: null,
  results: null,
  expanded: false        // false=show 5, true=show 15
};

function reducer(state, action) {
  switch (action.type) {
    case 'toggleCuisine': {
      const set = new Set(state.cuisines);
      if (set.has(action.value)) {
        set.delete(action.value);
      } else {
        if (set.size >= MAX_CUISINE_SELECTIONS) return state; // hard cap
        set.add(action.value);
      }
      return { ...state, cuisines: Array.from(set), preset: null };
    }
    case 'setOtherCuisine': return { ...state, otherCuisine: action.value, preset: null };
    case 'setRadius':       return { ...state, radius: action.value, preset: null };
    case 'setRecency':      return { ...state, recencyDays: action.value, preset: null };
    case 'setQueueMax':     return { ...state, queueMaxMin: action.value, preset: null };
    case 'setMode':         return { ...state, mode: action.value, preset: null };
    case 'setWhen':         return { ...state, when: action.value, preset: null };
    case 'setLoc':          return { ...state, loc: action.value };
    case 'applyPreset': {
      const cfg = PRESET_CONFIG[action.value];
      if (!cfg) return state;
      return {
        ...state,
        preset: action.value,
        radius: cfg.radius,
        mode: cfg.mode,
        when: cfg.when,
        recencyDays: cfg.recencyDays,
        queueMaxMin: cfg.queueMaxMin,
        cuisines: cfg.cuisines === 'preserve' ? state.cuisines : []
      };
    }
    case 'searchStart': return { ...state, loading: true, error: null, results: null, expanded: false };
    case 'searchOk':    return { ...state, loading: false, results: action.value };
    case 'searchErr':   return { ...state, loading: false, error: action.value };
    case 'expand':      return { ...state, expanded: true };
    default: return state;
  }
}

export function useCuisineState() {
  const [state, dispatch] = useReducer(reducer, initial);
  const actions = {
    toggleCuisine:   useCallback((v) => dispatch({ type: 'toggleCuisine', value: v }), []),
    setOtherCuisine: useCallback((v) => dispatch({ type: 'setOtherCuisine', value: v }), []),
    setRadius:       useCallback((v) => dispatch({ type: 'setRadius', value: v }), []),
    setRecency:      useCallback((v) => dispatch({ type: 'setRecency', value: v }), []),
    setQueueMax:     useCallback((v) => dispatch({ type: 'setQueueMax', value: v }), []),
    setMode:         useCallback((v) => dispatch({ type: 'setMode', value: v }), []),
    setWhen:         useCallback((v) => dispatch({ type: 'setWhen', value: v }), []),
    setLoc:          useCallback((v) => dispatch({ type: 'setLoc', value: v }), []),
    applyPreset:     useCallback((v) => dispatch({ type: 'applyPreset', value: v }), []),
    searchStart:     useCallback(()  => dispatch({ type: 'searchStart' }), []),
    searchOk:        useCallback((v) => dispatch({ type: 'searchOk', value: v }), []),
    searchErr:       useCallback((v) => dispatch({ type: 'searchErr', value: v }), []),
    expand:          useCallback(()  => dispatch({ type: 'expand' }), [])
  };
  return [state, actions];
}

export { PRESET_CONFIG };
