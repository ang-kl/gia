// __tests__/holidays-source.test.js — v0.62.947.
//
// Operator, 28-10 '26: "APPROVE QUICK switch holidays.js to the consolidated MOM public-holidays
// dataset". On 27-10 the dataset id holidays.js asked for (d_4e19214c1a6202f87b8a0bfd0ad1b2db)
// answered "No table found for dataset ID" and was absent from the data.gov.sg catalogue, so every
// boot fell back to the built-in 2026 list, which ends on 25 Dec 2026. MOM's consolidated dataset
// (d_8ef23381f9417e4d4254ee8b4dcdb176) holds 2020-2027.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const axios = require('axios');
const holidays = require('../holidays.js');

// The first rows and the 2027 rows of the consolidated CSV as downloaded on 27-10 '26.
const CSV = [
  'date,day,holiday',
  "2020-01-01,Wednesday,New Year's Day",
  '2026-12-25,Friday,Christmas Day',
  '2027-01-01,Friday,New Year’s Day',
  '2027-02-06,Saturday,Chinese New Year',
  '2027-02-08,Monday,Chinese New Year (Observed)',
  '2027-10-28,Thursday,Deepavali',
].join('\r\n');

function fakeRedis(initial = {}) {
  const store = new Map(Object.entries(initial));
  return { isOpen: true, store, get: async (k) => store.get(k) ?? null, set: async (k, v) => { store.set(k, v); } };
}

const realGet = axios.get;
afterEach(() => { axios.get = realGet; });

describe('holidays.js — the consolidated MOM dataset', () => {
  it('asks for the consolidated dataset, not the retired id', () => {
    expect(holidays.DATA_GOV_URL).toContain('d_8ef23381f9417e4d4254ee8b4dcdb176');
    expect(holidays.DATA_GOV_URL).not.toContain('d_4e19214c1a6202f87b8a0bfd0ad1b2db');
  });

  it('uses a new cache key, so the 2026 fallback cached for 90 days under the old key is not served', () => {
    expect(holidays.REDIS_KEY).not.toBe('sg:public-holidays:2026');
  });

  it('parses the consolidated CSV, including 2027 and "(Observed)" rows', () => {
    const rows = holidays.parseCsv(CSV);
    expect(rows.map((r) => r.date)).toEqual(['2020-01-01', '2026-12-25', '2027-01-01', '2027-02-06', '2027-02-08', '2027-10-28']);
    expect(rows[4].name).toBe('Chinese New Year (Observed)');
  });

  it('warmCache loads the fetched list, so the next holiday after Christmas 2026 is New Year 2027', async () => {
    const seen = [];
    axios.get = async (url) => {
      seen.push(url);
      if (url === holidays.DATA_GOV_URL) return { data: { data: { url: 'https://s3.example/holidays.csv' } } };
      return { data: CSV };
    };
    const redis = fakeRedis({ 'sg:public-holidays:2026': JSON.stringify(holidays.FALLBACK_2026) });
    await holidays.warmCache(redis);
    expect(seen[0]).toBe(holidays.DATA_GOV_URL);
    expect(JSON.parse(redis.store.get(holidays.REDIS_KEY)).length).toBe(6);
    expect(holidays.nextPublicHoliday(new Date('2026-12-26T04:00:00Z'))).toEqual({ date: '2027-01-01', name: 'New Year’s Day' });
    expect(holidays.isPublicHoliday(new Date('2027-10-28T04:00:00Z'))).toEqual({ date: '2027-10-28', name: 'Deepavali' });
  });
});
