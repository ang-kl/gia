import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { applyTelegramTheme } from './api/tg.js';

applyTelegramTheme();

// v0.26.4: build mark so Railway logs / browser console can confirm
// the freshly-built bundle is actually being served (vs. a stale cached
// asset). The version is hard-coded at build time by Vite's tree-shake.
// eslint-disable-next-line no-console
console.log('[Cuisine-Diag] D040 bundle loaded version=0.27.2');

createRoot(document.getElementById('root')).render(<App />);
