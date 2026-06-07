// __tests__/country-pref.test.js — v0.61.195
//
// Covers the chat-side /location country picker module:
//   - 17-country list (SG + 16 OTHER, in expected order)
//   - keyboard layout (1 + 4 + 4 + 4 + 4 + cancel rows)
//   - validators
//   - get/set against an in-memory Redis stub

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cp = require('../country-pref.js');

function makeRedisStub() {
  const store = new Map();
  return {
    isOpen: true,
    connect: async () => {},
    get: async (k) => (store.has(k) ? store.get(k) : null),
    setEx: async (k, _ttl, v) => { store.set(k, v); },
    set: async (k, v) => { store.set(k, v); }
  };
}

describe('country-pref — list', () => {
  it('ALL_COUNTRIES has 17 entries with SG first', () => {
    expect(cp.ALL_COUNTRIES.length).toBe(17);
    expect(cp.ALL_COUNTRIES[0].code).toBe('SG');
  });
  it('OTHER_COUNTRIES has 16 entries, no SG', () => {
    expect(cp.OTHER_COUNTRIES.length).toBe(16);
    expect(cp.OTHER_COUNTRIES.find((c) => c.code === 'SG')).toBeUndefined();
  });
  it('contains the expected ASEAN-9 sans SG', () => {
    const codes = cp.OTHER_COUNTRIES.map((c) => c.code);
    ['MY','ID','TH','VN','PH','BN','KH','LA','MM'].forEach((c) => {
      expect(codes).toContain(c);
    });
  });
  it('contains Oceania-2 and N-Asia-5', () => {
    const codes = cp.OTHER_COUNTRIES.map((c) => c.code);
    ['AU','NZ','JP','KR','CN','HK','TW'].forEach((c) => {
      expect(codes).toContain(c);
    });
  });
});

describe('country-pref — validators', () => {
  it('isValidCountry accepts known codes (case-insensitive)', () => {
    expect(cp.isValidCountry('SG')).toBe(true);
    expect(cp.isValidCountry('my')).toBe(true);
    expect(cp.isValidCountry('JP')).toBe(true);
  });
  it('isValidCountry rejects unknown / bad input', () => {
    expect(cp.isValidCountry('US')).toBe(false);
    expect(cp.isValidCountry('')).toBe(false);
    expect(cp.isValidCountry(null)).toBe(false);
    expect(cp.isValidCountry(undefined)).toBe(false);
  });
  it('findCountry returns the entry or null', () => {
    expect(cp.findCountry('MY')).toMatchObject({ code: 'MY', name: 'Malaysia' });
    expect(cp.findCountry('xx')).toBeNull();
  });
});

describe('country-pref — keyboard', () => {
  it('SG sits alone in row 1', () => {
    const kb = cp.buildCountryPickerKeyboard();
    expect(kb.inline_keyboard[0].length).toBe(1);
    expect(kb.inline_keyboard[0][0].callback_data).toBe('cp:SG');
  });
  it('rows 2-5 each have ≤ 4 OTHER buttons; cancel row at the end', () => {
    const kb = cp.buildCountryPickerKeyboard();
    // 1 (SG) + 4 (OTHER rows of 4) + 1 (cancel) = 6 rows
    expect(kb.inline_keyboard.length).toBe(6);
    for (let i = 1; i <= 4; i++) {
      expect(kb.inline_keyboard[i].length).toBeLessThanOrEqual(4);
      kb.inline_keyboard[i].forEach((btn) => {
        expect(btn.callback_data).toMatch(/^cp:[A-Z]{2}$/);
      });
    }
    const cancel = kb.inline_keyboard[5][0];
    expect(cancel.callback_data).toBe('cp:cancel');
  });
});

describe('country-pref — Redis get/set', () => {
  it('getUserCountryPref returns SG default when nothing stored', async () => {
    const r = makeRedisStub();
    const code = await cp.getUserCountryPref(r, 'chat-1');
    expect(code).toBe('SG');
  });
  it('setUserCountryPref + getUserCountryPref round-trips', async () => {
    const r = makeRedisStub();
    const ok = await cp.setUserCountryPref(r, 'chat-1', 'my');
    expect(ok).toBe(true);
    const code = await cp.getUserCountryPref(r, 'chat-1');
    expect(code).toBe('MY');
  });
  it('setUserCountryPref rejects unknown codes', async () => {
    const r = makeRedisStub();
    const ok = await cp.setUserCountryPref(r, 'chat-1', 'US');
    expect(ok).toBe(false);
  });
  it('getUserCountryPref falls back to SG when stored value is corrupt', async () => {
    const r = makeRedisStub();
    await r.set('country-pref:chat-1', 'NOPE');
    const code = await cp.getUserCountryPref(r, 'chat-1');
    expect(code).toBe('SG');
  });
});

// v0.61.363 — per-device country pref. One chatId, several devices each
// in a different country.
describe('country-pref — per-device keys (v0.61.363)', () => {
  it('keeps two devices on one chatId isolated', async () => {
    const r = makeRedisStub();
    await cp.setUserCountryPref(r, 'chat-9', 'JP', 'phoneA');
    await cp.setUserCountryPref(r, 'chat-9', 'TH', 'phoneB');
    expect(await cp.getUserCountryPref(r, 'chat-9', 'phoneA')).toBe('JP');
    expect(await cp.getUserCountryPref(r, 'chat-9', 'phoneB')).toBe('TH');
  });
  it('a device with no slot falls back to the chatId-level pref (seed)', async () => {
    const r = makeRedisStub();
    await cp.setUserCountryPref(r, 'chat-9', 'KR'); // chatId-level only
    expect(await cp.getUserCountryPref(r, 'chat-9', 'newPhone')).toBe('KR');
  });
  it('a per-device write also refreshes the chatId-level pref', async () => {
    const r = makeRedisStub();
    await cp.setUserCountryPref(r, 'chat-9', 'VN', 'tab1');
    expect(await cp.getUserCountryPref(r, 'chat-9')).toBe('VN');
  });
});
