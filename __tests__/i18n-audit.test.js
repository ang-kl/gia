// i18n-audit.test.js — v0.62.720
//
// The properties that matter here are all about NOT overclaiming: an item the
// model says nothing about must stay visibly unreviewed, the summary must be
// recomputed from the items rather than accumulated, and a missing key must
// stop the run rather than produce empty verdicts.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { auditJob, listModels, slimForAudit, DEFAULT_MODEL } = require('../i18n-audit');

const item = (id, verdict = 'unreviewed') => ({
  id, source: `S ${id}`, context: 'ctx', kind: 'message', max_chars: 120,
  parse_mode: 'none', repo_translation: null, google_translation: `T ${id}`,
  gemini_audit: { verdict, severity: null, corrected: null, notes: '' }
});
const job = (...items) => ({ job: { target_lang: 'zh-CN' }, items, summary: {} });

const reply = (entries, usage = {}) => ({
  data: {
    candidates: [{ content: { parts: [{ text: JSON.stringify(entries) }] } }],
    usageMetadata: { promptTokenCount: usage.in || 0, candidatesTokenCount: usage.out || 0 }
  }
});

describe('auditJob', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('refuses without a key rather than emitting empty verdicts', async () => {
    await expect(auditJob(job(item('a')), { apiKey: '' })).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('merges returned verdicts and recomputes the summary from the items', async () => {
    vi.spyOn(require('axios'), 'post').mockResolvedValue(reply([
      { id: 'a', gemini_audit: { verdict: 'pass' } },
      { id: 'b', gemini_audit: { verdict: 'fail', corrected: 'X' } }
    ], { in: 10, out: 5 }));
    const j = job(item('a'), item('b'));
    const r = await auditJob(j, { apiKey: 'k' });
    expect(r.audited).toBe(2);
    expect(j.items[1].gemini_audit.corrected).toBe('X');
    expect(j.summary).toMatchObject({ total: 2, pass: 1, fail: 1, warn: 0, unreviewed: 0 });
  });

  it('leaves an item unreviewed when the model returns no verdict for it', async () => {
    vi.spyOn(require('axios'), 'post').mockResolvedValue(reply([
      { id: 'a', gemini_audit: { verdict: 'pass' } }   // 'b' omitted
    ]));
    const j = job(item('a'), item('b'));
    const r = await auditJob(j, { apiKey: 'k' });
    expect(r.audited).toBe(1);
    expect(r.missing).toBe(1);
    expect(j.items[1].gemini_audit.verdict).toBe('unreviewed');
    expect(j.summary.unreviewed).toBe(1);
  });

  it('skips already-audited items so a re-run is cheap', async () => {
    const post = vi.spyOn(require('axios'), 'post')
      .mockResolvedValue(reply([{ id: 'b', gemini_audit: { verdict: 'pass' } }]));
    const j = job(item('a', 'pass'), item('b'));
    const r = await auditJob(j, { apiKey: 'k' });
    expect(r.alreadyAudited).toBe(1);
    expect(r.audited).toBe(1);
    expect(post.mock.calls[0][1].contents[0].parts[0].text).not.toContain('"id": "a"');
  });

  it('does nothing at all when every item is already audited', async () => {
    const post = vi.spyOn(require('axios'), 'post');
    const r = await auditJob(job(item('a', 'pass')), { apiKey: 'k' });
    expect(post).not.toHaveBeenCalled();
    expect(r.calls).toBe(0);
  });

  it('chunks large sets into several calls', async () => {
    const post = vi.spyOn(require('axios'), 'post').mockResolvedValue(reply([]));
    await auditJob(job(...Array.from({ length: 7 }, (_, i) => item(`k${i}`))), { apiKey: 'k', chunk: 3 });
    expect(post).toHaveBeenCalledTimes(3);   // 3 + 3 + 1
  });

  it('reports the model it actually used, not the default', async () => {
    vi.spyOn(require('axios'), 'post').mockResolvedValue(reply([]));
    const r = await auditJob(job(item('a')), { apiKey: 'k', model: 'gemini-x' });
    expect(r.model).toBe('gemini-x');
    expect(DEFAULT_MODEL).toBe('gemini-2.5-flash-lite');
  });

  it('throws a legible error when the model returns non-JSON', async () => {
    vi.spyOn(require('axios'), 'post').mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: 'I am sorry, but…' }] } }] }
    });
    await expect(auditJob(job(item('a')), { apiKey: 'k' })).rejects.toThrow(/non-JSON/);
  });

  it('sends only the judging fields, never the whole record', () => {
    const s = slimForAudit(item('a'));
    expect(Object.keys(s).sort()).toEqual([
      'context', 'google_translation', 'id', 'kind', 'max_chars',
      'parse_mode', 'prior_note', 'repo_translation', 'source'
    ]);
  });
});

describe('listModels', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('refuses without a key', async () => {
    await expect(listModels('')).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('returns only models that support generateContent', async () => {
    vi.spyOn(require('axios'), 'get').mockResolvedValue({
      data: { models: [
        { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }
      ] }
    });
    expect(await listModels('k')).toEqual(['gemini-2.5-flash-lite']);
  });
});
