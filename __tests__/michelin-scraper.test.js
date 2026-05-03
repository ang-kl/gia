// __tests__/michelin-scraper.test.js — v0.52.0 SG Michelin scraper.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const scraper = require('../michelin-scraper.js');
const cheerio = require('cheerio');

describe('parsePage — Ferracin-pattern selectors', () => {
  it('extracts venues from .card__menu cards', () => {
    const html = `
      <div class="card__menu">
        <div class="card__menu-image--top">
          <div><div><div>Singapore</div><div>Modern Cuisine</div></div></div>
        </div>
        <div class="distinction-icon o"></div>
        <div class="card__menu-content--rating"><span>2024</span></div>
        <div class="card__menu-content--title"><a href="/en/sg-region/singapore/restaurant/odette">Odette</a></div>
      </div>
    `;
    const $ = cheerio.load(html);
    const r = scraper.parsePage($, 'starred');
    expect(r.length).toBe(1);
    expect(r[0].name).toBe('Odette');
    expect(r[0].stars).toBe(3);
    expect(r[0].year).toBe(2024);
    expect(r[0].link).toContain('/en/sg-region/singapore/restaurant/odette');
    expect(r[0].source).toBe('starred');
  });

  it('marks Bib Gourmand entries with stars=0 and source=bib', () => {
    const html = `
      <div class="card__menu">
        <div class="card__menu-content--title"><a href="/x">Hill Street Tai Hwa Pork Noodle</a></div>
      </div>
    `;
    const $ = cheerio.load(html);
    const r = scraper.parsePage($, 'bib');
    expect(r.length).toBe(1);
    expect(r[0].stars).toBe(0);
    expect(r[0].source).toBe('bib');
  });

  it('returns [] when no cards present', () => {
    const $ = cheerio.load('<div></div>');
    expect(scraper.parsePage($, 'starred')).toEqual([]);
  });

  it('handles modern card classes via fallback selector', () => {
    const html = `
      <article class="restaurant__card-item">
        <h3><a href="/en/sg-region/restaurant/test">Test Place</a></h3>
      </article>
    `;
    const $ = cheerio.load(html);
    const r = scraper.parsePage($, 'starred');
    expect(r.length).toBe(1);
    expect(r[0].name).toBe('Test Place');
  });

  it('synthesises full URL when href is relative', () => {
    const html = `<div class="card__menu"><div class="card__menu-content--title"><a href="/relative/path">X</a></div></div>`;
    const $ = cheerio.load(html);
    const r = scraper.parsePage($, 'starred');
    expect(r[0].link).toBe('https://guide.michelin.com/relative/path');
  });

  it('keeps absolute URLs unchanged', () => {
    const html = `<div class="card__menu"><div class="card__menu-content--title"><a href="https://example.com/x">X</a></div></div>`;
    const $ = cheerio.load(html);
    const r = scraper.parsePage($, 'starred');
    expect(r[0].link).toBe('https://example.com/x');
  });
});

describe('venueAsAward', () => {
  it('maps starred venue to michelin-star award', () => {
    const a = scraper.venueAsAward({ name: 'X', stars: 2, year: 2024, source: 'starred' });
    expect(a.category).toBe('michelin-star');
    expect(a.level).toBe(2);
    expect(a.year).toBe(2024);
  });

  it('maps bib venue to bib-gourmand award', () => {
    const a = scraper.venueAsAward({ name: 'X', source: 'bib', year: 2024 });
    expect(a.category).toBe('bib-gourmand');
    expect(a.year).toBe(2024);
  });

  it('returns null for null', () => {
    expect(scraper.venueAsAward(null)).toBe(null);
  });
});

describe('module exports', () => {
  it('exposes URLs and selectors', () => {
    expect(scraper.STARRED_URL).toContain('sg-region');
    expect(scraper.STARRED_URL).toContain('all-starred');
    expect(scraper.BIB_URL).toContain('bib-gourmand');
    expect(scraper.SELECTORS.cards).toBeTruthy();
    expect(scraper.RATING_MAP).toEqual({ o: 3, n: 2, m: 1 });
  });
});
