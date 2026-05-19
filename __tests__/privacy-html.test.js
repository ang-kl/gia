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
