import React from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domAnimation } from 'motion/react';
import App from './App.jsx';
import './styles.css';
import { applyTelegramTheme } from './tg.js';

applyTelegramTheme();
console.log('[Hawker-TMA] bundle loaded version=' + (typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev'));

// v0.62.637 (C3) — LazyMotion + domAnimation loads only Motion's DOM-animation
// subset (~⅓ the full `motion` import); the `m` components pick features up here.
createRoot(document.getElementById('root')).render(
  <LazyMotion features={domAnimation}>
    <App />
  </LazyMotion>
);
