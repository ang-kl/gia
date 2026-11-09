import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { applyTelegramTheme } from './tg.js';

applyTelegramTheme();
console.log('[Menu-TMA] bundle loaded version=0.28.0');

createRoot(document.getElementById('root')).render(<App />);
