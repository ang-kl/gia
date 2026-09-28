import React from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domAnimation } from 'motion/react';
import App from './App.jsx';
import './styles.css';
import { applyTelegramTheme } from './tg.js';

applyTelegramTheme();
console.log('[Transport-TMA] bundle loaded version=' + (typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev'));

// v0.62.636 (C3) — LazyMotion + the `domAnimation` feature bundle loads only the
// DOM animation subset of Motion (~⅓ the size of the full `motion` import); the
// `m` components used in the tree pick their features up from this provider.
createRoot(document.getElementById('root')).render(
  <LazyMotion features={domAnimation}>
    <App />
  </LazyMotion>
);
