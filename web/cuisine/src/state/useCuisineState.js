import { useReducer, useCallback } from 'react';

const ALL_CUISINES = [
  'Japanese', 'Korean', 'Chinese',
  'Italian', 'Indian', 'Thai',
  'Vietnamese', 'Malay', 'Western'
];

const PRESET_CONFIG = {
  'transit-efficiency': { radius: 1000, mode: 'transit', when: 'now', cuisines: [] },
  'after-hours':        { radius: 1000, mode: 'walk',    when: 'now', cuisines: [] },
  'holiday-special':    { radius: 1000, mode: 'walk',    when: 'now', cuisines: [] },
  'cuisine-discovery':  { radius: 1000, mode: 'walk',    when: 'now', cuisines: 'preserve' }
};

const initial = {
  cuisines: [],          // multi-select chip state
  radius: 1000,          // 250 (walking) | 1000 (transit)
  mode: 'walk',          // 'walk' | 'transit' | 'drive'
  when: 'now',           // 'now' | <ISO datetime-local string>
  preset: null,          // null | one of PRESET_CONFIG keys
  loc: null,             // {lat,lng} | null — set by Header location button or saved
  loading: false,
  error: null,
  results: null,         // { venues:[], meal:{}, holidayContext:{} } | null
  expanded: false        // false=show 5, true=show 15
};

function reducer(state, action) {
  switch (action.type) {
    case 'toggleCuisine': {
      const set = new Set(state.cuisines);
      set.has(action.value) ? set.delete(action.value) : set.add(action.value);
      return { ...state, cuisines: Array.from(set) };
    }
    case 'setRadius':  return { ...state, radius: action.value };
    case 'setMode':    return { ...state, mode: action.value };
    case 'setWhen':    return { ...state, when: action.value };
    case 'setLoc':     return { ...state, loc: action.value };
    case 'applyPreset': {
      const cfg = PRESET_CONFIG[action.value];
      if (!cfg) return state;
      return {
        ...state,
        preset: action.value,
        radius: cfg.radius,
        mode: cfg.mode,
        when: cfg.when,
        cuisines: cfg.cuisines === 'preserve' ? state.cuisines : []
      };
    }
    case 'clearPreset': return { ...state, preset: null };
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
    toggleCuisine: useCallback((v) => dispatch({ type: 'toggleCuisine', value: v }), []),
    setRadius:     useCallback((v) => dispatch({ type: 'setRadius', value: v }), []),
    setMode:       useCallback((v) => dispatch({ type: 'setMode', value: v }), []),
    setWhen:       useCallback((v) => dispatch({ type: 'setWhen', value: v }), []),
    setLoc:        useCallback((v) => dispatch({ type: 'setLoc', value: v }), []),
    applyPreset:   useCallback((v) => dispatch({ type: 'applyPreset', value: v }), []),
    clearPreset:   useCallback(()  => dispatch({ type: 'clearPreset' }), []),
    searchStart:   useCallback(()  => dispatch({ type: 'searchStart' }), []),
    searchOk:      useCallback((v) => dispatch({ type: 'searchOk', value: v }), []),
    searchErr:     useCallback((v) => dispatch({ type: 'searchErr', value: v }), []),
    expand:        useCallback(()  => dispatch({ type: 'expand' }), [])
  };
  return [state, actions];
}

export { ALL_CUISINES, PRESET_CONFIG };
