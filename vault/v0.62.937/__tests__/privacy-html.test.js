// __tests__/privacy-html.test.js — v0.59.10

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renderPrivacyHtml, renderPrivacyPage } = require('../privacy-html.js');
const { tn } = require('../i18n.js');

describe('renderPrivacyHtml', () => {
  it('converts *bold* runs to <strong>', () => {
    const html = renderPrivacyHtml('🔒 *Privacy & data handling*');
    expect(html).toContain('<strong>Privacy &amp; data handling</strong>'.replace('&amp;', '&'));
    expect(html).toContain('<strong>');
  });

  it('wraps consecutive bullet lines in a single <ul>', () => {
    const body = '*Header*\n• one\n• two\n• three';
    const html = renderPrivacyHtml(body);
    expect((html.match(/<ul>/g) || []).length).toBe(1);
    expect((html.match(/<\/ul>/g) || []).length).toBe(1);
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
    expect(html).toContain('<li>three</li>');
  });

  it('closes the list when a non-bullet paragraph follows', () => {
    const body = '• one\n• two\n\nnext paragraph';
    const html = renderPrivacyHtml(body);
    // The </ul> must come before the trailing <p>.
    const ulClose = html.indexOf('</ul>');
    const pOpen = html.indexOf('<p>next paragraph</p>');
    expect(ulClose).toBeGreaterThan(0);
    expect(pOpen).toBeGreaterThan(ulClose);
  });

  it('skips blank lines (no empty <p></p> tags)', () => {
    const html = renderPrivacyHtml('first\n\n\nsecond');
    expect(html).toContain('<p>first</p>');
    expect(html).toContain('<p>second</p>');
    expect(html).not.toMatch(/<p>\s*<\/p>/);
  });

  // v0.60.172 — assertions updated for the tighter 3-paragraph privacy
  // body (operator copy rewrite). The prior assertions targeted the
  // bulleted multi-section structure that shipped from v0.60.142 →
  // v0.60.171 (subheadings like "What Soleat collects" + `<li>` items).
  // The new copy is a flat narrative; assertions track that shape.
  // Renderer behaviour itself is unchanged (still bold/escape/paragraphs).
  it('renders the actual EN privacy.body through end-to-end', () => {
    const body = tn('privacy.body', 'en', { operator: '' });
    const html = renderPrivacyHtml(body, 'en');
    expect(html).toContain('<strong>Privacy &amp; Data</strong>'.replace('&amp;', '&'));
    expect(html).toContain('<p>Soleat only keeps what is needed');
    expect(html).toContain('does not use trackers');
    expect(html).toContain('/forgetme');
  });

  it('renders the actual FR privacy.body through end-to-end', () => {
    const body = tn('privacy.body', 'fr', { operator: '' });
    const html = renderPrivacyHtml(body, 'fr');
    expect(html).toContain('<strong>Confidentialité et données</strong>');
    expect(html).toContain('<p>Soleat ne conserve que ce qui est nécessaire');
    expect(html).toContain('traceurs');
    expect(html).toContain('/forgetme');
  });
});

describe('renderPrivacyPage', () => {
  it('returns a complete HTML document', () => {
    const body = tn('privacy.body', 'en', { operator: '' });
    const page = renderPrivacyPage(body, 'en');
    expect(page).toMatch(/^<!doctype html>/i);
    expect(page).toContain('<html lang="en">');
    expect(page).toContain('<title>Privacy — Soleat</title>');
    expect(page).toContain('viewport');
  });

  it('includes a language toggle to the alternate locale', () => {
    const body = tn('privacy.body', 'en', { operator: '' });
    const page = renderPrivacyPage(body, 'en');
    expect(page).toContain('href="?lang=fr"');
    expect(page).toContain('Français');
  });

  it('FR page links back to EN', () => {
    const body = tn('privacy.body', 'fr', { operator: '' });
    const page = renderPrivacyPage(body, 'fr');
    expect(page).toContain('<html lang="fr">');
    expect(page).toContain('<title>Confidentialité — Soleat</title>');
    expect(page).toContain('href="?lang=en"');
    expect(page).toContain('English');
  });
});

// v0.62.735 — the hosted page offered a two-way EN/FR toggle while the strings
// behind it carried eight languages. `?lang=ja` already rendered Japanese, but
// the only link on the page said "Français" and six locales were unreachable
// from it. These assertions pin the switcher and the localised titles, and cover
// legal.body — which had no hosted page at all until this version.
describe('renderPrivacyPage — all eight locales', () => {
  const { SUPPORTED } = require('../i18n.js');

  it('offers every supported locale except the one being shown', () => {
    for (const lang of SUPPORTED) {
      const html = renderPrivacyPage(tn('privacy.body', lang, {}), lang, {
        kind: 'privacy', locales: SUPPORTED
      });
      const toggle = html.slice(html.lastIndexOf('<div class="lang-toggle">'));
      const offered = [...toggle.matchAll(/\?lang=([a-z]{2})/g)].map((m) => m[1]);
      expect(offered.sort()).toEqual(SUPPORTED.filter((x) => x !== lang).sort());
      expect(offered).not.toContain(lang);
    }
  });

  it('names each locale by its endonym, not by an exonym', () => {
    // A reader who cannot read the current page still has to find their own
    // language — the same reason language.btn.* is left untranslated.
    const html = renderPrivacyPage(tn('privacy.body', 'en', {}), 'en', {
      kind: 'privacy', locales: SUPPORTED
    });
    for (const name of ['Français', 'Bahasa Indonesia', 'Русский', 'Deutsch', '中文', '日本語', 'Español']) {
      expect(html).toContain(name);
    }
  });

  it('localises the <title> per language and per page kind', () => {
    const ja = renderPrivacyPage(tn('privacy.body', 'ja', {}), 'ja', { kind: 'privacy' });
    expect(ja).toContain('<title>プライバシー — Soleat</title>');
    expect(ja).toContain('<html lang="ja">');
    const ruLegal = renderPrivacyPage(tn('legal.body', 'ru', {}), 'ru', { kind: 'legal' });
    expect(ruLegal).toContain('<title>Правовая информация — Soleat</title>');
  });

  it('renders legal.body in every locale, with its markdown link as an anchor', () => {
    for (const lang of SUPPORTED) {
      const html = renderPrivacyPage(tn('legal.body', lang, {}), lang, {
        kind: 'legal', locales: SUPPORTED
      });
      expect(html).toContain('<a href="https://linkedin.com/in/angadrian"');
      expect(html).not.toContain('](https://linkedin.com/in/angadrian)');
      expect(html).toContain('2026');
    }
  });

  it('falls back to English chrome for an unknown locale rather than throwing', () => {
    const html = renderPrivacyPage('*Hello*', 'xx', { kind: 'privacy', locales: SUPPORTED });
    expect(html).toContain('<title>Privacy — Soleat</title>');
    expect(html).toContain('<html lang="en">');
  });
});
