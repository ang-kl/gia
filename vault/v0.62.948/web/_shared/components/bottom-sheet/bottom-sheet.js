/* bottom-sheet.js — v0.62.647
 *
 * A native-feeling, swipe-to-close bottom sheet for Telegram Mini Apps.
 * Vanilla ES module. No React, no dependencies, no build step required.
 *
 *   import { createBottomSheet } from './bottom-sheet.js';
 *   const sheet = createBottomSheet({ title: 'Nearby', onClose: () => {} });
 *   sheet.setContent(listEl);
 *   sheet.open();
 *
 * Pass `element` (a selector or node) to adopt the hand-authored markup in
 * bottom-sheet.html instead of building it. Everything else is identical.
 *
 * The three exported helpers below (resolveGesture / sampleVelocity /
 * rubberBand) are pure and DOM-free so the gesture physics can be unit-tested
 * in the repo's Node-only Vitest suite — see __tests__/bottom-sheet.test.js.
 *
 * Nothing in this module touches `document` at import time; it is safe to
 * import in Node/SSR.
 */

/* ------------------------------------------------------------------ tuning */

export const DEFAULTS = {
  /* Close if the finger is still moving down faster than this on release.
     px/ms — 0.5 px/ms is ~500 px/s, roughly the slowest gesture a human reads
     as a "flick" rather than a "drag". */
  velocityThreshold: 0.5,
  /* …or if the sheet has been dragged more than this fraction of its own
     height, however slowly. Distance alone must be able to close it, or a
     careful drag to the floor snaps back and feels broken. */
  distanceRatio: 0.35,
  /* A fast flick UP always snaps back, even from below the distance
     threshold — the user has visibly reversed their intent. */
  reboundVelocity: -0.6,
  /* Ignore sub-pixel jitter so a tap on the handle is a tap, not a 2px drag. */
  tapSlop: 8,
  /* Velocity is measured over a trailing window, not over the whole gesture:
     a slow drag that ends in a flick must read as a flick. */
  velocityWindowMs: 120,
  /* Resistance applied to upward over-drag past the open position. */
  rubberBandFactor: 0.35,
  rubberBandMax: 48
};

/* --------------------------------------------------------- pure physics */

/**
 * Trailing-window velocity, px/ms, positive = downward.
 * @param {Array<{y:number,t:number}>} samples chronological pointer samples
 * @param {number} windowMs only samples within this window of the last one count
 */
export function sampleVelocity(samples, windowMs = DEFAULTS.velocityWindowMs) {
  if (!Array.isArray(samples) || samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    if (last.t - samples[i].t <= windowMs) first = samples[i];
    else break;
  }
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.y - first.y) / dt;
}

/**
 * Diminishing-returns resistance for dragging past a boundary.
 * @param {number} overshoot px beyond the boundary (>= 0)
 */
export function rubberBand(overshoot, factor = DEFAULTS.rubberBandFactor, max = DEFAULTS.rubberBandMax) {
  if (!(overshoot > 0)) return 0;
  return (overshoot * factor * max) / (overshoot * factor + max);
}

/**
 * The release decision. Velocity AND total travel both get a vote, because
 * either one alone produces a sheet that fights the user:
 *   velocity only  → a deliberate slow drag to the floor springs back
 *   distance only  → a fast flick from the top does nothing
 * @returns {'close'|'snap'}
 */
export function resolveGesture({ dy, velocity, sheetHeight }, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const travel = Number.isFinite(dy) ? dy : 0;
  const v = Number.isFinite(velocity) ? velocity : 0;
  const h = sheetHeight > 0 ? sheetHeight : 1;

  if (v <= o.reboundVelocity) return 'snap';                       // flicked back up
  if (v >= o.velocityThreshold && travel > o.tapSlop) return 'close'; // flicked down
  if (travel >= h * o.distanceRatio) return 'close';               // dragged far enough
  return 'snap';
}

/* --------------------------------------------------------------- runtime */

const now = () => (typeof performance !== 'undefined' && performance.now
  ? performance.now()
  : Date.now());

const MARKUP = `
<div class="gia-sheet-scrim" data-gia-sheet-scrim aria-hidden="true"></div>
<section class="gia-sheet" data-gia-sheet role="dialog" aria-modal="true" tabindex="-1">
  <button class="gia-sheet-handle" data-gia-sheet-handle type="button">
    <span class="gia-sheet-grabber" aria-hidden="true"></span>
  </button>
  <h2 class="gia-sheet-title" data-gia-sheet-title></h2>
  <div class="gia-sheet-content" data-gia-sheet-content></div>
</section>`;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),'
  + 'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

let seq = 0;

export function createBottomSheet(options = {}) {
  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('createBottomSheet requires a DOM');

  const cfg = { ...DEFAULTS, ...options };
  const id = `gia-sheet-${(seq += 1)}`;

  /* -------------------------------------------------------- element wiring */

  let root = null;
  if (options.element) {
    root = typeof options.element === 'string' ? doc.querySelector(options.element) : options.element;
  }
  const adopted = !!root;
  if (!root) {
    root = doc.createElement('div');
    root.className = 'gia-sheet-root';
    root.innerHTML = MARKUP;
    (options.container || doc.body).appendChild(root);
  }

  const scrim = root.querySelector('[data-gia-sheet-scrim]');
  const sheet = root.querySelector('[data-gia-sheet]');
  const handle = root.querySelector('[data-gia-sheet-handle]');
  const titleEl = root.querySelector('[data-gia-sheet-title]');
  const content = root.querySelector('[data-gia-sheet-content]');
  if (!scrim || !sheet || !handle || !content) {
    throw new Error('createBottomSheet: markup is missing a required part');
  }

  if (!sheet.id) sheet.id = id;
  if (titleEl) {
    if (!titleEl.id) titleEl.id = `${sheet.id}-title`;
    if (options.title != null) titleEl.textContent = options.title;
    if (titleEl.textContent.trim()) sheet.setAttribute('aria-labelledby', titleEl.id);
    else titleEl.hidden = true;
  }
  if (!content.id) content.id = `${sheet.id}-content`;
  handle.setAttribute('aria-controls', content.id);
  if (!handle.getAttribute('aria-label')) {
    handle.setAttribute('aria-label', options.handleLabel || 'Drag down to close, or press Escape');
  }
  root.setAttribute('data-open', 'false');
  root.hidden = true;

  /* --------------------------------------------------------------- theming */

  const tgApp = () => (typeof window !== 'undefined' ? window.Telegram && window.Telegram.WebApp : null);

  function syncScheme() {
    const w = tgApp();
    /* Telegram's colorScheme is authoritative: a user can run a dark Telegram
       theme on a light OS, and prefers-color-scheme would then be wrong. */
    let scheme = w && w.colorScheme;
    if (scheme !== 'dark' && scheme !== 'light') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        scheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else scheme = 'light';
    }
    root.setAttribute('data-scheme', scheme);
  }
  syncScheme();

  /* ------------------------------------------------- viewport / keyboard */

  const vv = typeof window !== 'undefined' ? window.visualViewport : null;

  function syncViewport() {
    if (typeof window === 'undefined') return;
    if (vv) {
      /* The gap between the layout viewport's bottom and the visual
         viewport's bottom IS the software keyboard (plus any client chrome).
         Lifting the sheet by that inset keeps its handle and first rows
         reachable while an input inside it has focus. */
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty('--gia-kb-inset', `${inset}px`);
      root.style.setProperty('--gia-vvh', `${Math.round(vv.height)}px`);
    } else {
      root.style.setProperty('--gia-vvh', `${Math.round(window.innerHeight)}px`);
    }
  }
  syncViewport();

  /* --------------------------------------------------------- scroll lock */

  let lock = null;

  function lockBackground() {
    if (lock || typeof window === 'undefined') return;
    const body = doc.body;
    const html = doc.documentElement;
    lock = {
      scrollY: window.scrollY || html.scrollTop || 0,
      body: { position: body.style.position, top: body.style.top, left: body.style.left,
        right: body.style.right, width: body.style.width, overflow: body.style.overflow },
      html: { overscrollBehavior: html.style.overscrollBehavior }
    };
    /* position:fixed (not just overflow:hidden) — iOS Safari/WKWebView ignores
       overflow:hidden on <body> for touch scrolling, which is exactly the
       platform a Telegram Mini App runs on. */
    body.style.position = 'fixed';
    body.style.top = `-${lock.scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
  }

  function unlockBackground() {
    if (!lock || typeof window === 'undefined') return;
    const body = doc.body;
    const html = doc.documentElement;
    Object.assign(body.style, lock.body);
    Object.assign(html.style, lock.html);
    window.scrollTo(0, lock.scrollY);
    lock = null;
  }

  /* An unhandled touchmove on the scrim pans the Google Map underneath, so the
     sheet visibly sits on a map that is sliding around behind it. Swallow it.
     Must be passive:false or preventDefault is a no-op. */
  const blockScrimTouch = (e) => { e.preventDefault(); };

  /* ---------------------------------------------------------------- state */

  let open = false;
  let dragging = false;
  let drag = null;
  let restoreFocus = null;

  const sheetHeight = () => sheet.offsetHeight || 1;

  /* Drag offsets are written INLINE and removed on release; the open/closed
     resting positions live in the stylesheet, keyed off data-open. That way
     "let go" and "close" are the same one-line operation and there is no
     third source of truth to drift. */
  function setY(px) {
    root.style.setProperty('--gia-sheet-y', `${px}px`);
    /* Fade the scrim with travel so the map is progressively revealed — the
       single strongest cue that the gesture is doing something. */
    const ratio = Math.min(1, Math.max(0, px / sheetHeight()));
    scrim.style.opacity = String(1 - ratio);
  }

  function clearY() {
    root.style.removeProperty('--gia-sheet-y');
    scrim.style.removeProperty('opacity');
  }

  /* -------------------------------------------------------------- gesture */

  function beginDrag(kind, clientY) {
    if (!open || dragging) return;
    /* A drag that starts inside the scrolled content is the CONTENT's, unless
       the content is already at its top — the standard iOS sheet handoff. */
    dragging = true;
    drag = { kind, startY: clientY, dy: 0, samples: [{ y: clientY, t: now() }], moved: false };
    root.setAttribute('data-dragging', 'true');
  }

  function moveDrag(clientY) {
    if (!dragging || !drag) return false;
    const raw = clientY - drag.startY;
    if (Math.abs(raw) > cfg.tapSlop) drag.moved = true;
    drag.dy = raw >= 0 ? raw : -rubberBand(-raw, cfg.rubberBandFactor, cfg.rubberBandMax);
    drag.samples.push({ y: clientY, t: now() });
    if (drag.samples.length > 24) drag.samples.shift();
    setY(drag.dy);
    return drag.moved;
  }

  function endDrag() {
    if (!dragging || !drag) return;
    const velocity = sampleVelocity(drag.samples, cfg.velocityWindowMs);
    const verdict = resolveGesture({ dy: drag.dy, velocity, sheetHeight: sheetHeight() }, cfg);
    const wasMoved = drag.moved;
    dragging = false;
    drag = null;
    /* Restoring the transition BEFORE clearing the offset is what turns the
       release into the cubic-bezier animation rather than a jump cut. */
    root.removeAttribute('data-dragging');
    if (verdict === 'close' && wasMoved) close('swipe');
    else clearY();
  }

  function cancelDrag() {
    if (!dragging) return;
    dragging = false;
    drag = null;
    root.removeAttribute('data-dragging');
    clearY();
  }

  /* Touch — phones and tablets. */
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    beginDrag('touch', e.touches[0].clientY);
  };
  const onTouchMove = (e) => {
    if (!dragging || drag.kind !== 'touch') return;
    /* preventDefault keeps the webview from also scrolling/rubber-banding.
       Requires the listener to be registered passive:false. */
    if (e.cancelable) e.preventDefault();
    moveDrag(e.touches[0].clientY);
  };
  const onTouchEnd = () => { if (dragging && drag.kind === 'touch') endDrag(); };
  const onTouchCancel = () => { if (dragging && drag.kind === 'touch') cancelDrag(); };

  /* Mouse — Telegram Desktop and any pointer device. Kept as a separate
     family from touch (rather than Pointer Events) so a hybrid device that
     emits BOTH cannot start two drags: `drag.kind` locks the winner. Listeners
     go on the document so a fast drag that leaves the handle still tracks. */
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    beginDrag('mouse', e.clientY);
    doc.addEventListener('mousemove', onMouseMove);
    doc.addEventListener('mouseup', onMouseUp);
  };
  const onMouseMove = (e) => { if (dragging && drag.kind === 'mouse') moveDrag(e.clientY); };
  const onMouseUp = () => {
    doc.removeEventListener('mousemove', onMouseMove);
    doc.removeEventListener('mouseup', onMouseUp);
    if (dragging && drag.kind === 'mouse') endDrag();
  };

  /* Content handoff: only take over the gesture when the list is at its top
     and the finger is heading down. Otherwise the content scrolls normally. */
  let contentStart = null;
  const onContentTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    contentStart = { y: e.touches[0].clientY, atTop: content.scrollTop <= 0 };
  };
  const onContentTouchMove = (e) => {
    if (!contentStart) return;
    if (dragging) { onTouchMove(e); return; }
    const dy = e.touches[0].clientY - contentStart.y;
    if (contentStart.atTop && content.scrollTop <= 0 && dy > cfg.tapSlop) {
      beginDrag('touch', contentStart.y);
      if (e.cancelable) e.preventDefault();
      moveDrag(e.touches[0].clientY);
    }
  };
  const onContentTouchEnd = () => {
    contentStart = null;
    if (dragging && drag.kind === 'touch') endDrag();
  };

  /* Keyboard — the pointer-free path. */
  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); close('escape'); return; }
    if (e.key !== 'Tab') return;
    const items = Array.from(sheet.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const onHandleKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      close('handle');
    }
  };

  const onScrimClick = () => { if (cfg.dismissOnScrim !== false) close('scrim'); };
  const onThemeChanged = () => syncScheme();
  const onViewportChange = () => syncViewport();

  /* ------------------------------------------------------------- binding */

  handle.addEventListener('touchstart', onTouchStart, { passive: true });
  handle.addEventListener('touchmove', onTouchMove, { passive: false });
  handle.addEventListener('touchend', onTouchEnd);
  handle.addEventListener('touchcancel', onTouchCancel);
  handle.addEventListener('mousedown', onMouseDown);
  handle.addEventListener('keydown', onHandleKey);

  content.addEventListener('touchstart', onContentTouchStart, { passive: true });
  content.addEventListener('touchmove', onContentTouchMove, { passive: false });
  content.addEventListener('touchend', onContentTouchEnd);
  content.addEventListener('touchcancel', onContentTouchEnd);

  scrim.addEventListener('click', onScrimClick);
  scrim.addEventListener('touchmove', blockScrimTouch, { passive: false });

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
    if (vv) {
      vv.addEventListener('resize', onViewportChange);
      vv.addEventListener('scroll', onViewportChange);
    }
    const w = tgApp();
    if (w && typeof w.onEvent === 'function') w.onEvent('themeChanged', onThemeChanged);
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', onThemeChanged);
    }
  }
  doc.addEventListener('keydown', onKeyDown);

  /* ----------------------------------------------------------------- api */

  function doOpen() {
    if (open) return api;
    open = true;
    restoreFocus = doc.activeElement;
    root.hidden = false;
    syncScheme();
    syncViewport();
    lockBackground();
    /* Force layout so the browser has a "from" value for the transition:
       without this, unhiding and translating in the same frame is a jump. */
    void root.offsetHeight;
    root.setAttribute('data-open', 'true');
    clearY();
    sheet.focus({ preventScroll: true });
    if (typeof cfg.onOpen === 'function') cfg.onOpen();
    return api;
  }

  function close(reason) {
    if (!open) return api;
    open = false;
    dragging = false;
    drag = null;
    root.removeAttribute('data-dragging');
    root.setAttribute('data-open', 'false');
    /* Drop the inline drag offset so the stylesheet's closed position (100 %)
       takes over and the release transition carries the sheet out. */
    clearY();
    unlockBackground();
    const finish = () => {
      if (open) return;             // reopened mid-animation
      root.hidden = true;
      clearY();
    };
    /* transitionend is the accurate signal; the timeout is the guarantee (a
       hidden tab, or reduced-motion, may never fire it). */
    let done = false;
    const once = () => { if (done) return; done = true; sheet.removeEventListener('transitionend', once); finish(); };
    sheet.addEventListener('transitionend', once);
    setTimeout(once, 420);
    if (restoreFocus && typeof restoreFocus.focus === 'function') {
      try { restoreFocus.focus({ preventScroll: true }); } catch { /* noop */ }
    }
    restoreFocus = null;
    if (typeof cfg.onClose === 'function') cfg.onClose(reason || 'api');
    return api;
  }

  function destroy() {
    handle.removeEventListener('touchstart', onTouchStart);
    handle.removeEventListener('touchmove', onTouchMove);
    handle.removeEventListener('touchend', onTouchEnd);
    handle.removeEventListener('touchcancel', onTouchCancel);
    handle.removeEventListener('mousedown', onMouseDown);
    handle.removeEventListener('keydown', onHandleKey);
    content.removeEventListener('touchstart', onContentTouchStart);
    content.removeEventListener('touchmove', onContentTouchMove);
    content.removeEventListener('touchend', onContentTouchEnd);
    content.removeEventListener('touchcancel', onContentTouchEnd);
    scrim.removeEventListener('click', onScrimClick);
    scrim.removeEventListener('touchmove', blockScrimTouch);
    doc.removeEventListener('keydown', onKeyDown);
    doc.removeEventListener('mousemove', onMouseMove);
    doc.removeEventListener('mouseup', onMouseUp);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
      if (vv) {
        vv.removeEventListener('resize', onViewportChange);
        vv.removeEventListener('scroll', onViewportChange);
      }
      const w = tgApp();
      if (w && typeof w.offEvent === 'function') w.offEvent('themeChanged', onThemeChanged);
    }
    unlockBackground();
    if (!adopted && root.parentNode) root.parentNode.removeChild(root);
  }

  const api = {
    open: doOpen,
    close,
    toggle: () => (open ? close('toggle') : doOpen()),
    get isOpen() { return open; },
    setTitle(text) {
      if (!titleEl) return api;
      titleEl.textContent = text == null ? '' : String(text);
      titleEl.hidden = !titleEl.textContent.trim();
      return api;
    },
    setContent(node) {
      content.replaceChildren();
      if (node == null) return api;
      if (typeof node === 'string') content.innerHTML = node;
      else content.appendChild(node);
      return api;
    },
    element: root,
    sheetElement: sheet,
    contentElement: content,
    destroy
  };

  return api;
}

/* UMD-ish convenience for a plain <script> tag (no bundler). */
if (typeof window !== 'undefined') {
  window.GiaBottomSheet = Object.assign(window.GiaBottomSheet || {}, {
    createBottomSheet, resolveGesture, sampleVelocity, rubberBand, DEFAULTS
  });
}

export default createBottomSheet;
