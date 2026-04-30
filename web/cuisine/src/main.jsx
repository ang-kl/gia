import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { applyTelegramTheme } from './api/tg.js';

applyTelegramTheme();

createRoot(document.getElementById('root')).render(<App />);
