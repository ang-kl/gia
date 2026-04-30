import { initData } from './tg.js';

export async function searchCuisine(payload) {
  const res = await fetch('/api/cuisine-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData()
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json();
}
