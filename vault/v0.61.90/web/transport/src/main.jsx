import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { applyTelegramTheme } from './tg.js';

applyTelegramTheme();
console.log('[Transport-TMA] bundle loaded version=' + (typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev'));

createRoot(document.getElementById('root')).render(<App />);
