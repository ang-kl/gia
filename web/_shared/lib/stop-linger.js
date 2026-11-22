// stop-linger.js — v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md, B and D.
//
// B. A station card draws the bus stops nearest its exits. They used to vanish the moment the card closed; operator,
// 22-11 '26: "the bus stops related to the station should still be there until 3 minutes later". The four rules they
// approved ("2. Yes"): another station replaces the stops; the same station tapped again clears them at once; turning
// on the Bus Stop layer clears them; otherwise they go 3 minutes after the card closes. The spec adds one guard: the 3
// minutes never take away a stop whose bubble is open, they wait for it to close.
//
// D. The Cuisine eatery cards fold while any map card is open, so something has to say when the overlay's card opens
// and closes. The linger needs the same fact (is a stop's bubble open?), so one watcher serves both.
//
// One module, imported by the three overlay copies (Train, Hawker, Cuisine); nothing is copied into them. Pure apart
// from the timers it is handed, so a fake clock can drive it (__tests__/stop-linger.test.js).

export const LINGER_MS = 180000;

export function createStopLinger({
  ms = LINGER_MS,
  schedule = (fn, t) => setTimeout(fn, t),
  cancel = (h) => clearTimeout(h),
  onExpire = () => {},
  isHeld = () => false,
} = {}) {
  let handle = null;
  let due = false;   // the 3 minutes are up, but a stop's bubble was open

  function stopTimer() {
    if (handle != null) { cancel(handle); handle = null; }
  }
  function clear() {
    stopTimer();
    due = false;
    onExpire();
  }
  return {
    // A station card has drawn (or replaced) the stops: no timer while it is open.
    show() { stopTimer(); due = false; },
    // The card closed: the stops stay, and the 3 minutes start. A second close does not move the deadline.
    close() {
      if (handle != null || due) return;
      handle = schedule(() => {
        handle = null;
        if (isHeld()) { due = true; return; }
        onExpire();
      }, ms);
    },
    // Same station tapped again, or the Bus Stop layer turned on: the stops go now.
    clear,
    // A bubble closed: if the 3 minutes were only waiting for it, the stops go now.
    bubbleClosed() { if (due && !isHeld()) clear(); },
    armed: () => handle != null || due,
    // The map is going: stop the timer; the map clears its own pins.
    destroy() { stopTimer(); due = false; },
  };
}

// Watch one Google InfoWindow: every open and close made through it is reported, and the pin it is anchored to is
// kept, so a caller can ask "is a card open?" and "on which pin?". It wraps the instance's own open and close (each
// still does exactly what it did) and also listens to Google's `close` event, for a close Google makes by itself.
export function watchInfoWindow(info, { onChange = () => {}, onClose = () => {} } = {}) {
  let open = false;
  let anchor = null;
  const set = (v) => {
    if (open === v) return;
    open = v;
    onChange(v);
  };
  const origOpen = info.open.bind(info);
  const origClose = info.close.bind(info);
  info.open = (...a) => {
    const r = origOpen(...a);
    const first = a[0];
    anchor = a.length >= 2 ? (a[1] || null) : (first && typeof first === 'object' && 'anchor' in first ? first.anchor || null : null);
    set(true);
    return r;
  };
  const closed = () => {
    anchor = null;
    set(false);
    onClose();
  };
  info.close = (...a) => {
    const wasOpen = open;
    const r = origClose(...a);
    if (wasOpen) closed();
    return r;
  };
  if (typeof info.addListener === 'function') {
    try { info.addListener('close', () => { if (open) closed(); }); } catch { /* no such event in this Maps version */ }
  }
  return { isOpen: () => open, anchor: () => anchor };
}
