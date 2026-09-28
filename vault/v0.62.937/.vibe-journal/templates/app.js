// Client-side controller: load manifest + records, render the 5-row
// tab nav, swap panels on tab click. No framework — vanilla.
//
// Two data-loading modes (auto-detected):
//   1. Bundled — when `window.__VJ_JSON_URL__` is set (by the inlined
//      script that the render.mjs bundled mode emits), fetch ONE JSON
//      blob `{ manifest, data: { <type>: [...] } }`. All tabs are
//      pre-loaded in a single round-trip. Suits the soleat.net
//      `/doc/vibe-journal.html` + `/doc/vibe-journal.json` deployment.
//   2. Multi-file — when `__VJ_JSON_URL__` is unset, fetch
//      `data/manifest.json` + `data/<type>.ndjson` per tab on demand.
//      Suits the local `vibe-journal serve` preview.

(async function () {
  let bundledData = null;
  let manifest;
  if (typeof window !== 'undefined' && typeof window.__VJ_JSON_URL__ === 'string') {
    const blob = await fetchJSON(window.__VJ_JSON_URL__);
    manifest = blob.manifest;
    bundledData = blob.data || {};
  } else {
    manifest = await fetchJSON('data/manifest.json');
  }
  document.getElementById('vj-project').textContent = manifest.project?.name || '';
  document.getElementById('vj-generated').textContent = 'generated ' + new Date(manifest.generated_at).toLocaleString();
  if (manifest.project?.name) document.title = `${manifest.project.name} · Vibe Journal`;

  // ---- Sidebar nav (one section per row of the manifest tab layout) ----
  const nav = document.getElementById('vj-nav');
  nav.innerHTML = '';
  const rows = manifest.tabs;
  const tabs = rows.flat();
  const initialFromHash = (typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : '');
  let activeTab = tabs.find((t) => t.key === initialFromHash)?.key || tabs[0]?.key || null;

  for (const row of rows) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'vj-nav-section';
    row.forEach((tab) => {
      const btn = document.createElement('button');
      btn.className = 'vj-nav-item';
      btn.type = 'button';
      btn.dataset.tab = tab.key;
      btn.innerHTML = `<span class="vj-nav-label">${escapeHtml(tab.label)}</span><span class="vj-nav-count">${tab.count}</span>`;
      btn.addEventListener('click', () => {
        activate(tab.key);
        if (typeof history !== 'undefined' && history.replaceState) {
          history.replaceState(null, '', '#' + tab.key);
        }
        closeDrawerIfMobile();
      });
      sectionEl.appendChild(btn);
    });
    nav.appendChild(sectionEl);
  }

  // ---- Mobile drawer ----
  const sidebar = document.getElementById('vj-sidebar');
  const backdrop = document.querySelector('.vj-backdrop');
  const hamburger = document.querySelector('.vj-hamburger');
  function openDrawer() {
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
    backdrop.hidden = false;
    hamburger.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    backdrop.hidden = true;
    hamburger.setAttribute('aria-expanded', 'false');
  }
  function isMobileViewport() { return window.matchMedia('(max-width: 768px)').matches; }
  function closeDrawerIfMobile() { if (isMobileViewport()) closeDrawer(); }
  hamburger.addEventListener('click', () => {
    if (sidebar.classList.contains('is-open')) closeDrawer(); else openDrawer();
  });
  backdrop.addEventListener('click', closeDrawer);
  // Esc closes the drawer.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  // Crossing the breakpoint while the drawer is open should reset state.
  window.matchMedia('(max-width: 768px)').addEventListener('change', closeDrawer);

  // Hash-change navigation (so back/forward buttons work).
  window.addEventListener('hashchange', () => {
    const k = location.hash.replace(/^#/, '');
    if (k && tabs.some((t) => t.key === k) && k !== activeTab) activate(k);
  });

  const cache = {};
  async function load(key) {
    if (cache[key]) return cache[key];
    if (bundledData) {
      cache[key] = Array.isArray(bundledData[key]) ? bundledData[key] : [];
      return cache[key];
    }
    const txt = await fetch(`data/${key}.ndjson`).then((r) => r.ok ? r.text() : '');
    cache[key] = txt.split('\n').filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
    return cache[key];
  }

  async function activate(key) {
    activeTab = key;
    document.querySelectorAll('.vj-nav-item').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === key));
    const panel = document.getElementById('vj-panel');
    panel.innerHTML = '<p class="vj-loading">Loading…</p>';
    const records = await load(key);
    panel.innerHTML = '';
    if (records.length === 0) {
      panel.innerHTML = '<div class="vj-empty">No records for this tab. Check that the source path in <code>vibe-journal.config.yaml</code> matches your project.</div>';
      return;
    }
    const r = RENDERERS[key] || renderGenericCards;
    r(panel, records);
  }

  if (activeTab) activate(activeTab);

  // ---- Renderers ----

  const RENDERERS = {
    dashboard: renderDashboard,
    pr: renderPRTable,
    register: renderRegister,
    'third-party': renderThirdParty,
    technical: renderSectionDoc,
    feature: renderSectionDoc,
    legal: renderSectionDoc,
    vault: renderVault,
    journal: renderJournal,
    builder: renderSectionDoc,
    persona: renderSectionDoc
  };

  // v0.60.180 — PR tab restored to the rich per-PR layout (legacy view
  // operator wants for "search and check how to improve"). Each PR is a
  // <details> card: summary line (#N · state · merged · title) + body
  // excerpt + file list. Search input at the top filters the list by
  // title / body / file-path substring (case-insensitive).
  function renderPRTable(panel, records) {
    // Sort newest first by merged_at (records may arrive in legacy order).
    const sorted = [...records].sort((a, b) => {
      const ta = new Date(a.merged_at || 0).getTime();
      const tb = new Date(b.merged_at || 0).getTime();
      return tb - ta;
    });

    panel.innerHTML = `
      <div class="vj-pr-toolbar">
        <input type="search" class="vj-pr-search" placeholder="Search PRs by title, body, or file path…" aria-label="Search PRs">
        <span class="vj-pr-stats"></span>
      </div>
      <div class="vj-pr-list"></div>
    `;
    const list = panel.querySelector('.vj-pr-list');
    const stats = panel.querySelector('.vj-pr-stats');
    const input = panel.querySelector('.vj-pr-search');

    function render(filter = '') {
      const q = filter.trim().toLowerCase();
      list.innerHTML = '';
      let shown = 0;
      for (const r of sorted) {
        if (q) {
          const hay = (r.title + ' ' + (r.body || '') + ' ' + (r.files || []).join(' ')).toLowerCase();
          if (!hay.includes(q)) continue;
        }
        shown++;
        const det = document.createElement('details');
        det.className = 'vj-pr-card';
        const num = r.number != null ? `#${r.number}` : '—';
        const merged = formatDate(r.merged_at) || '—';
        const state = (r.state || '').toLowerCase();
        det.innerHTML = `
          <summary>
            <span class="vj-pr-num">${escapeHtml(num)}</span>
            <span class="vj-status" data-status="${escapeAttr(r.state || '')}">${escapeHtml(r.state || '—')}</span>
            <span class="vj-pr-merged">${escapeHtml(merged)}</span>
            <span class="vj-pr-title">${escapeHtml(r.title || '')}</span>
          </summary>
          <div class="vj-pr-body">
            ${r.body ? `<p>${renderMarkdownLite(r.body)}</p>` : ''}
            ${r.files && r.files.length ? `
              <details class="vj-pr-files"><summary>${r.files.length} file${r.files.length === 1 ? '' : 's'} changed</summary>
                <ul>${r.files.map((f) => `<li><code>${escapeHtml(f)}</code></li>`).join('')}</ul>
              </details>` : ''}
            ${r.url ? `<p class="vj-pr-link"><a href="${escapeAttr(r.url)}" target="_blank" rel="noopener">Open on GitHub →</a></p>` : ''}
          </div>
        `;
        list.appendChild(det);
      }
      stats.textContent = q ? `${shown} of ${sorted.length} match` : `${sorted.length} PRs`;
    }
    input.addEventListener('input', (e) => render(e.target.value));
    render('');
  }

  function renderRegister(panel, records) {
    if (!records.length) return;
    // Use the newest register file only (records are version-sorted).
    const latest = records[0];
    const versionBadge = `<span class="vj-version-badge">v${latest.version || '—'}</span>`;
    panel.innerHTML = `<p class="vj-meta">Showing latest Register: ${escapeHtml(latest.file)} ${versionBadge}</p>`;
    for (const sec of latest.sections) {
      const card = document.createElement('section');
      card.className = 'vj-card';
      card.innerHTML = `<h2 class="vj-card-title">${escapeHtml(sec.heading)}</h2>` +
        `<div class="vj-card-body">${renderMarkdownLite(sec.body)}</div>`;
      panel.appendChild(card);
    }
  }

  function renderThirdParty(panel, records) {
    const apis = records.filter((r) => r.kind === 'api');
    const ints = records.filter((r) => r.kind === 'integration');
    const issues = records.filter((r) => r.kind === 'issue');
    if (apis.length) panel.appendChild(thirdPartyTable('APIs / Services', apis));
    if (ints.length) panel.appendChild(thirdPartyTable('Integrations', ints));
    if (issues.length) panel.appendChild(issuesTable('GitHub Issues', issues));
  }
  function thirdPartyTable(title, list) {
    const wrap = document.createElement('section');
    wrap.innerHTML = `<h2 class="vj-card-title">${escapeHtml(title)}</h2>`;
    const t = document.createElement('table');
    t.className = 'vj-table';
    t.innerHTML = `<thead><tr><th>Name</th><th>Vendor</th><th>Status</th><th>Purpose</th><th>Docs</th></tr></thead><tbody></tbody>`;
    const tb = t.querySelector('tbody');
    for (const r of list) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.vendor || '')}</td>
        <td><span class="vj-status" data-status="${escapeAttr(r.status || '')}">${escapeHtml(r.status || '')}</span></td>
        <td>${escapeHtml(r.details?.purpose || r.details?.notes || '')}</td>
        <td>${r.url ? `<a href="${escapeAttr(r.url)}" target="_blank">docs</a>` : '—'}</td>`;
      tb.appendChild(tr);
    }
    wrap.appendChild(t);
    return wrap;
  }
  function issuesTable(title, list) {
    const wrap = document.createElement('section');
    wrap.innerHTML = `<h2 class="vj-card-title">${escapeHtml(title)}</h2>`;
    const t = document.createElement('table');
    t.className = 'vj-table';
    t.innerHTML = `<thead><tr><th>Issue</th><th>State</th><th>Author</th><th>Labels</th></tr></thead><tbody></tbody>`;
    const tb = t.querySelector('tbody');
    for (const r of list) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.url ? `<a href="${escapeAttr(r.url)}" target="_blank">${escapeHtml(r.name)}</a>` : escapeHtml(r.name)}</td>
        <td><span class="vj-status" data-status="${escapeAttr(r.status || '')}">${escapeHtml(r.status || '')}</span></td>
        <td>${escapeHtml(r.details?.author || '—')}</td>
        <td>${escapeHtml((r.details?.labels || []).join(', '))}</td>`;
      tb.appendChild(tr);
    }
    wrap.appendChild(t);
    return wrap;
  }

  function renderSectionDoc(panel, records) {
    if (!records.length) return;
    const latest = records[0];
    const versionBadge = `<span class="vj-version-badge">v${latest.version || '—'}</span>`;
    panel.innerHTML = `<p class="vj-meta">Showing latest: ${escapeHtml(latest.file)} ${versionBadge} (${records.length} version(s) on disk)</p>`;
    if (latest.preamble) {
      const pre = document.createElement('section');
      pre.className = 'vj-card';
      pre.innerHTML = `<div class="vj-card-body">${renderMarkdownLite(latest.preamble)}</div>`;
      panel.appendChild(pre);
    }
    for (const sec of latest.sections) {
      const card = document.createElement('section');
      card.className = 'vj-card';
      card.innerHTML = `<h2 class="vj-card-title">${escapeHtml(sec.heading)}</h2>` +
        `<div class="vj-card-body">${renderMarkdownLite(sec.body)}</div>`;
      panel.appendChild(card);
    }
  }

  function renderVault(panel, records) {
    for (const r of records) {
      const card = document.createElement('section');
      card.className = 'vj-card';
      const counts = r.counts ? ` · ${r.counts.files} files / ${r.counts.size}` : '';
      const captured = r.captured ? ` · captured ${escapeHtml(r.captured)}` : '';
      card.innerHTML = `
        <div class="vj-card-head"><span class="vj-version-badge">v${escapeHtml(r.version)}</span><span>${escapeHtml(r.file)}${counts}${captured}</span></div>
        ${r.headline ? `<div class="vj-card-body">${renderMarkdownLite(r.headline)}</div>` : ''}
        ${r.arc ? `<div class="vj-card-section"><div class="vj-card-section-head">Arc since prior vault</div><div class="vj-card-body">${renderMarkdownLite(r.arc)}</div></div>` : ''}
        ${r.boot ? `<div class="vj-card-section"><div class="vj-card-section-head">Boot instructions</div><div class="vj-card-body">${renderMarkdownLite(r.boot)}</div></div>` : ''}
      `;
      panel.appendChild(card);
    }
  }

  function renderJournal(panel, records) {
    for (const r of records) {
      const card = document.createElement('section');
      card.className = 'vj-card';
      card.innerHTML = `
        <div class="vj-card-head"><span class="vj-version-badge">v${escapeHtml(r.version || '—')}</span><span>${escapeHtml(r.file)}${r.is_hdr ? ' · HDR #' + r.hdr_index : ''}</span></div>
        <div class="vj-card-title">${escapeHtml(r.title || '')}</div>
        <div class="vj-card-body">${renderMarkdownLite(r.body || '')}</div>`;
      panel.appendChild(card);
    }
  }

  function renderGenericCards(panel, records) {
    for (const r of records) {
      const card = document.createElement('section');
      card.className = 'vj-card';
      card.innerHTML = `<pre>${escapeHtml(JSON.stringify(r, null, 2))}</pre>`;
      panel.appendChild(card);
    }
  }

  // ---- Helpers ----

  async function fetchJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`fetch ${path} → ${r.status}`);
    return r.json();
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }
  function formatDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
  // Tiny Markdown renderer — enough for headings, bold, italic, inline code,
  // fenced code, bullet lists, hyperlinks. Anything fancier is shown as
  // escaped plain text.
  // v0.60.180 — GFM table support added per operator: "Register,
  // technical, feature, vault are not properly structure and style to
  // be readable, the tables". The Soleat doc-system uses Markdown
  // tables heavily (Removed Features / Deprecated Decisions / §7
  // Amendments tables); previously rendered as escaped pipes.
  function renderMarkdownLite(md) {
    // 1) Tables FIRST (placeholder-substitute so subsequent inline rules
    //    don't mangle the `|` separators or trip on the `---` row).
    const tablePlaceholders = [];
    md = md.replace(
      /(^|\n)((?:\|[^\n]*\|[^\n]*\n)\s*(?:\|[\s:|-]+\|\s*\n)(?:\|[^\n]*\|[^\n]*(?:\n|$))*)/g,
      (_m, lead, block) => {
        const lines = block.trim().split('\n').filter((l) => l.trim().startsWith('|'));
        if (lines.length < 2) return _m;
        const splitRow = (row) => row.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
        const header = splitRow(lines[0]);
        const body = lines.slice(2).map(splitRow);
        let html = '<table class="vj-md-table"><thead><tr>';
        for (const h of header) html += `<th>${inlineMd(h)}</th>`;
        html += '</tr></thead><tbody>';
        for (const row of body) {
          html += '<tr>';
          for (let i = 0; i < header.length; i++) html += `<td>${inlineMd(row[i] || '')}</td>`;
          html += '</tr>';
        }
        html += '</tbody></table>';
        const idx = tablePlaceholders.push(html) - 1;
        return `${lead}\u0000TABLE_${idx}\u0000`;
      }
    );

    // 2) Inline rules — escape first, then apply inline Markdown.
    let s = inlineMd(md);

    // 3) Bullet lists (`- item` runs → <ul><li>…).
    s = s.replace(/((?:^|\n)\s*-\s+.+(?:\n\s*-\s+.+)*)/g, (block) => {
      const items = block.trim().split(/\n\s*-\s+/).filter(Boolean).map((it) => `<li>${it.trim()}</li>`).join('');
      return `\n<ul>${items}</ul>`;
    });

    // 4) Paragraphs — convert blank-line-separated blocks to <p> wrappers
    //    so the renderer doesn't dump a wall of text.
    s = s.split(/\n\n+/).map((blk) => {
      const t = blk.trim();
      if (!t) return '';
      if (/^<(ul|ol|table|pre|h\d|blockquote|details)/i.test(t)) return t;
      if (t.startsWith('\u0000TABLE_')) return t;
      return `<p>${t}</p>`;
    }).join('\n');

    // 5) Re-insert the table HTML.
    s = s.replace(/\u0000TABLE_(\d+)\u0000/g, (_, n) => tablePlaceholders[Number(n)] || '');

    return s;
  }

  // Inline Markdown only — used both for the top-level renderer and
  // inside table cells.
  function inlineMd(raw) {
    let s = (typeof raw === 'string' && raw.startsWith('<')) ? raw : escapeHtml(raw);
    s = s.replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c}</code></pre>`);
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return s;
  }

  // v0.60.186 — Dashboard tab. Renders 10 insight panels + a Lessons
  // list, ported from the original generate.mjs output (which the
  // v0.60.177 tabbed rebuild stripped). Receives the same PR record
  // array as the PR tab; enrichment (category / area / version / day /
  // modules / rework-of) is computed client-side here.
  function renderDashboard(panel, prRecords) {
    const LOOKBACK = 8;
    const REWORK_CUES = ['follow-up', 'followup', 'follow up', 'again', 'still ', 'redo', 're-add', 'readd', 'restore', 'actually', 'properly', 'take 2', 'take two', 'round 2', 'round two', 'revert', 'rollback', 'roll back', 're-enable', 're-do', 'not taking effect', "didn't take", "doesn't take", 'second attempt', 'one more', 'truly', 'finally', 'for real'];
    const SKIP_AREAS = new Set(['Core / misc', 'Docs / vault', 'Infra / setup']);
    const FEATURE_RULES = [
      ['Oversight / usage stats', ['oversight', 'usage-log', 'usage tracking', 'usage stats', 'usage counters', 'dau ']],
      ['Cuisine Picker', ['cuisine picker', '/cuisine', 'cuisine tma', 'cuisine-tma', 'cuisine search', 'cuisines vault', 'cuisine card', 'criteria card', 'cuisine chip', 'cuisine family']],
      ['Search / free-text', ['/s ', '/search', 'free-text', 'freetext', 'dish search', 'cooking method', 'cooking-method', 'technique search', 'nation-iconic', 'red disambig', 'r.e.d', 'ambiguous dish']],
      ['/eat /drink flow', ['/eat', '/drink', 'runflow', 'fan-out', 'fanout', 'pickvalidated', 'meal period', 'deliverpicks', 'vault-first']],
      ['/hidden surprise', ['/hidden', '/surprise', 'hidden gem', 'hidden sanctuary', 'surprise search', 'findsurprise', 'deliversurprise']],
      ['Hawker NEA', ['hawker', 'nea closures', 'hawker centre', 'hawker tma']],
      ['Transport / carpark', ['transport tma', '/transport', ' mrt', 'mrt ', 'lta ', 'datamall', 'carpark', '/carpark', 'train service', 'bus arrival', 'engineering hours']],
      ['Weather', ['weather', '/weather', 'nea forecast', '2-hour forecast', '2 h forecast', 'rain ']],
      ['Buddy / sharing', ['buddy', '/share', '/picks', 'recent picks', 'recent-picks', 'clip-store', 'share token']],
      ['Recognised lists', ['michelin', 'bib gourmand', '/recognised', '/recognized', 'asia 50', 'asia 100', 'local produce', 'guide 2025']],
      ['Menu hub', ['menu tma', '/menu', 'menu hub', 'menu tile', 'hub tile']],
      ['Privacy / legal', ['privacy', '/forgetme', '/legal', 'data retention', 'legal disclaimer', 'jurisdiction', 'forgetuserdata', 'data handling', 'erasure']],
      ['Language / i18n', ['/language', 'i18n', 'français', 'french translation', 'language pref', 'locale']],
      ['Maps / geo / location', ['leaflet', 'map tma', 'geocode', 'reverse-geocode', 'street view', '3d view', 'open in 3d', 'location cache', 'gps', 'directions url', 'map hash']],
      ['Docs / vault', ['journal', 'vault snapshot', 'doc/ ', 'register', 'feature doc', 'technical doc', 'serial-state', 'doc protocol', 'changelog']],
      ['Infra / setup', ['phase 1', 'phase 2', 'phase 3', 'setup', 'env template', 'env.example', '.env', 'webhook', 'long-poll', 'long poll', 'ci ', 'workflow', 'gitignore', 'package.json', 'deploy', 'railway', 'health check', 'preflight', 'skill', 'gatekeeper']],
      ['Pipeline / discovery', ['pipeline', 'discover', 'google places', 'places api', 'validation', 'footfall', 'enrichment', 'narrate step', 'request-store', 'response-cache', 'consultant layer']],
      ['Commands / chat UX', ['/ver', '/ftlog', '/start', '/status', 'onboarding', 'help text', 'command list', 'setmycommands', 'inline keyboard', 'callback query', 'keyboard']]
    ];
    const TMA_DIRS = { 'web/cuisine': 'cuisine', 'web/menu': 'menu', 'web/hawker': 'hawker', 'web/transport': 'transport', 'web/oversight': 'oversight' };
    const SMALL_CATS = new Set(['copy', 'prompt-tune', 'test']);
    const INDEC = [
      ['revert', /\brevert(s|ed|ing)?\b/i],
      ['rollback', /\broll[\s-]?back\b/i],
      ['undo', /\bundo\b/i],
      ['re-enable', /\bre[\s-]?(enable|activat)|turn (it )?back on\b/i],
      ['re-add / restore', /\bre[\s-]?add|readd|restore[ds]?\b/i],
      ['"actually"', /\bactually\b/i],
      ['"not taking effect"', /not taking effect|did(n'?t| not) take|no effect\b/i],
      ['"again"', /\bagain\b/i],
      ['take 2 / round 2', /\btake (2|two)\b|\bround (2|two)\b|2nd attempt|second attempt/i],
      ['"finally" / "for real"', /\bfinally\b|for real\b|\btruly\b/i]
    ];
    const FAIL_MODES = [
      ['silent handler / thin cards', /\bsilent\b|thin card|went silent|stopped (responding|working)|no(t| longer) respond|doesn'?t respond/i],
      ['missing module export', /is not a function|not exported|missing export|undefined export/i],
      ['HTML escaping / parse_mode', /html[\s-]?escap|unescaped|parse_mode|html entit/i],
      ['fuzzy matcher over-match', /over[\s-]?match|hijack|common[\s-]?(word|dish)|blocklist|matched too/i],
      ['resolver ordering', /resolver order|runs? first|pre[\s-]?empt|disambig.* order|short[\s-]?circuit order/i],
      ['cache / stale bundle', /stale bundle|no[\s-]?cache|cache[\s-]?control|redeploy(ed)? but|pin(ned)? .*stale/i],
      ['regression after a refactor / merge', /regress|broke after|re[\s-]?broke|after the .* (merge|refactor)/i]
    ];
    const LESSONS = [
      ['Run the gates before every PR', 'node --check on each changed .js, npm test 100% green, and (if web/ changed) the TMA build — non-negotiable. Most repeat fixes were caught later than they should have been.'],
      ['Verify module exports when you add a require()', 'A require(\'./x\').y() where y isn\'t exported throws on first call; with a per-item catch it shows a thin fallback, without one the whole handler goes silent. node -e "Object.keys(require(\'./x\'))" settles it.'],
      ['Escape user text in parse_mode:"HTML" messages', "Any {placeholder} that holds user input / a Places field / external text must be HTML-escaped. Plain-text sends need no escaping — don't over-escape those either."],
      ['Every handler return path must send or be a documented no-op', 'Trace each return in bot.onText / callback handlers / the search fan-outs. Top-level handlers get a try/catch that still sends a friendly fallback; per-card .map() renders get a per-item catch.'],
      ['Smoke-test fuzzy matchers after bulk-adding entries', 'A leading-prefix matcher fed a big list will hijack common queries (ramen, pizza, chicken…). Assert the "must NOT match" set and pin it with a regression test.'],
      ['Deterministic, most-specific resolvers run first; the LLM runs last', 'A confident R.E.D / technique / nation-overlay resolution must pre-empt the looser fallbacks (gate them), not the other way round.'],
      ['Never reset --hard / checkout . / clean -fd / force-push a shared branch with uncommitted work you care about', 'git stash first (recoverable), or just git log / git status to inspect. One reset --hard wiped an in-progress restructure.'],
      ["You can't run the bot here — trace the render path end to end before \"fixing\" a UI report", "Search for the literal strings/emoji in the screenshot to find which function produced that exact output; don't theorise a fix against the wrong code path."],
      ['Bump package.json version (PATCH for fix/copy/prompt) and re-read long functions you edited start to finish', 'The handleSearchTurn restructures slipped bugs precisely because the diff looked fine in isolation.']
    ];

    const has = (hay, ...needles) => needles.some((n) => hay.includes(n));
    const stripVersionPrefix = (t) => String(t)
      .replace(/^docs?\s*\(?\s*v?\d+\.\d+(?:\.\d+)?\)?\s*[:—–-]\s*/i, '')
      .replace(/^v?\d+\.\d+(?:\.\d+)?\s*[:—–-]\s*/i, '')
      .replace(/^(feat|fix|chore|docs?|refactor|perf|test|build|ci|style)\s*(\([^)]*\))?\s*:\s*/i, '')
      .trim();
    const versionOf = (t) => {
      const m = String(t).match(/v?(\d+\.\d+\.\d+)/) || String(t).match(/v?(\d+\.\d+)\b/);
      return m ? m[1] : '';
    };
    const minorOf = (v) => { const m = String(v).match(/^(\d+\.\d+)/); return m ? m[1] : ''; };
    function categoryOf(title, body) {
      const tl = title.toLowerCase(); const bl = body.toLowerCase();
      const stripped = stripVersionPrefix(title).toLowerCase();
      if (/^docs?\s*[:(]/i.test(title) || has(tl, 'journal/feature/technical', 'doc/ + vault', 'vault snapshot', 'doc catch-up', 'doc/ catch-up', 'register catch-up', 'vibe-coding record', 'vibe journal', 'vibe-journal') || (has(tl, 'doc', 'journal', 'vault') && !has(tl, 'document ') && stripped.startsWith('journal'))) return 'docs';
      if (/^(ci|build|chore)\s*[:(]/i.test(title) || has(stripped, 'ci ', 'workflow', 'github action', 'gitignore', 'dependency', 'dependencies', 'package.json bump', 'bump version', 'deploy', 'railway', 'node version', 'eslint', 'lint config')) return 'infra';
      if (/^fix\s*[:(]/i.test(title) || /^hotfix/i.test(stripped) || /^fix /i.test(stripped) || /\bfixes? #\d+/i.test(bl) || (has(stripped, 'fix', 'bug', 'regression', 'broken', "doesn't", 'no longer', 'stopped working', 'crash', 'throws', 'silent') && !has(stripped, 'add ', 'new '))) return 'fix';
      if (has(stripped, 'refactor', 'rename', 'restructure', 'consolidat', 'extract ', 'split ', 'de-dup', 'dedup', 'tidy', 'cleanup', 'clean up', 'reorganis', 'reorganiz')) return 'refactor';
      if (has(stripped, 'copy', 'wording', 'rephrase', 'reword', 'rewrite the', 'translation', 'translate', 'en/fr', 'en + fr', 'i18n string', 'message text', 'phrasing', 'blurb')) return 'copy';
      if (has(stripped, 'prompt', 'gemini ', 'llm ', 'claude ', 'narrate', 'instruction to', 'system prompt', 'temperature', 'few-shot')) return 'prompt-tune';
      if (has(stripped, 'test', 'vitest', 'coverage')) return 'test';
      return 'feature';
    }
    function featureAreaOf(title, body) {
      const txt = (stripVersionPrefix(title) + ' || ' + title + ' || ' + body).toLowerCase();
      for (const [label, keys] of FEATURE_RULES) if (has(txt, ...keys)) return label;
      return 'Core / misc';
    }
    function codeBucketsOf(files) {
      if (!files || !files.length) return [];
      const out = new Set();
      for (const f of files) {
        if (f === 'index.js') out.add('index.js');
        else if (f.startsWith('web/')) { for (const [dir, name] of Object.entries(TMA_DIRS)) if (f.startsWith(dir + '/')) out.add(`TMA:${name}`); }
        else if (f.startsWith('__tests__/')) out.add('tests');
        else if (f.startsWith('doc/')) out.add('doc');
        else if (f.startsWith('vault/')) out.add('vault');
        else if (f.startsWith('.github/')) out.add('ci');
        else if (f.startsWith('data/') || f.startsWith('seed/')) out.add('data');
        else if (f === 'package.json' || f === 'package-lock.json') out.add('package');
        else if (/\.js$/.test(f) && !f.includes('/')) out.add(f);
        else if (/\.md$/.test(f) && !f.includes('/')) out.add('root-docs');
        else if (!f.includes('/')) out.add(f === '.gitignore' || f.startsWith('.env') || f === '.npmrc' || f === 'vitest.config.js' ? 'config' : f);
        else out.add(f.split('/')[0] + '/');
      }
      return [...out];
    }

    // Enrich PR records with the derived fields the instruments need.
    const records = prRecords.map((p) => {
      const title = String(p.title || '');
      const body = String(p.body || '');
      const merged = p.merged_at ? new Date(p.merged_at).toISOString().slice(0, 19).replace('T', ' ') : '';
      const day = merged.slice(0, 10);
      const v = versionOf(title);
      return {
        pr: p.number, title, body, merged, day,
        version: v, minor: minorOf(v),
        category: categoryOf(title, body),
        area: featureAreaOf(title, body),
        modules: codeBucketsOf(p.files),
        nFiles: Array.isArray(p.files) ? p.files.length : (Number.isFinite(p.files_changed) ? p.files_changed : null)
      };
    });

    // Rework / burst pass.
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const titleLc = r.title.toLowerCase();
      const hasCue = REWORK_CUES.some((c) => titleLc.includes(c));
      r.reworkCue = hasCue;
      r.reworkOf = null;
      if (!SKIP_AREAS.has(r.area) && (r.category === 'fix' || hasCue)) {
        for (let j = i - 1; j >= Math.max(0, i - LOOKBACK); j--) {
          if (records[j].area === r.area) { r.reworkOf = records[j].pr; break; }
        }
      }
    }

    // Header + scaffold.
    panel.innerHTML = `
      <div class="vj-dash">
        <h2 class="vj-dash-h2">Insights — where the loops are</h2>
        <div class="vj-kpis" id="vj-kpis"></div>
        <details class="vj-dash-panel" open><summary>Likely rework / "we shipped, then iterated" (heuristic)</summary>
          <p class="vj-dash-note">A PR is flagged when it's a <code>fix</code> (or its title carries a follow-up cue: "again", "actually", "restore", "follow-up", "not taking effect", …) <em>and</em> an earlier PR within the previous ${LOOKBACK} PRs touched the same feature area. Heuristic — go read the linked pair to judge. <code>Core/misc</code>, <code>Docs/vault</code>, <code>Infra/setup</code> are excluded.</p>
          <div id="vj-rework"></div>
        </details>
        <details class="vj-dash-panel"><summary>Churn by feature / UX area</summary><div class="vj-dash-note">More PRs in an area ≈ the design took longer to settle.</div><div class="vj-barlist" id="vj-churnArea"></div></details>
        <details class="vj-dash-panel"><summary>Churn by code area / module</summary><div class="vj-dash-note">Which files keep coming back. (Only PRs with a squash-commit file list ≈ #78 onward.)</div><div class="vj-barlist" id="vj-churnMod"></div></details>
        <details class="vj-dash-panel"><summary>PRs per release (MAJOR.MINOR)</summary><div class="vj-dash-note">A minor line with many PRs = lots of follow-up patches after the first cut.</div><div class="vj-barlist" id="vj-perMinor"></div></details>
        <details class="vj-dash-panel"><summary>Category mix &amp; same-day clusters</summary><div class="vj-barlist" id="vj-catMix"></div><div class="vj-dash-note" id="vj-clusterNote"></div></details>
        <details class="vj-dash-panel"><summary>📈 PRs over time — by day &amp; by week</summary><div class="vj-dash-note">When the work happened — a tall spike is a high-iteration session.</div><div class="vj-dash-note">By ISO week:</div><div class="vj-barlist" id="vj-perWeek"></div><div class="vj-dash-note">By day (every day with at least one PR):</div><div class="vj-barlist" id="vj-perDay"></div></details>
        <details class="vj-dash-panel"><summary>🪶 Small / low-effort PRs — batching candidates</summary><div class="vj-dash-note" id="vj-smallNote"></div><div class="vj-barlist" id="vj-smallByArea"></div><div class="vj-scrollbox"><table class="vj-mini"><thead><tr><th>PR</th><th>Ver</th><th>Cat</th><th>Area</th><th>Title</th></tr></thead><tbody id="vj-smallList"></tbody></table></div></details>
        <details class="vj-dash-panel"><summary>🔁 Indecision — reverts, re-enables, flip-flops</summary><div class="vj-dash-note" id="vj-indecNote"></div><div class="vj-scrollbox"><table class="vj-mini"><thead><tr><th>PR</th><th>Ver</th><th>Area</th><th>Title</th><th>Signal</th></tr></thead><tbody id="vj-indecList"></tbody></table></div></details>
        <details class="vj-dash-panel"><summary>🧠 Behavioural patterns</summary><div class="vj-kpis" id="vj-behav"></div><div class="vj-dash-note" id="vj-behavNote"></div></details>
        <details class="vj-dash-panel"><summary>🧩 Hard parts &amp; recurring failure modes</summary><div class="vj-dash-note">Fix-density per area — the share of an area's PRs that are <code>fix</code>; high = the tricky bits (areas with ≥3 PRs).</div><div class="vj-barlist" id="vj-fixDensity"></div><div class="vj-dash-note">PRs whose title matches a known failure mode (keyword heuristic, from the lessons below):</div><div class="vj-barlist" id="vj-failModes"></div><div class="vj-scrollbox" id="vj-failBox" style="display:none"><table class="vj-mini"><thead><tr><th>Mode</th><th>PR</th><th>Title</th></tr></thead><tbody id="vj-failList"></tbody></table></div></details>
        <h2 class="vj-dash-h2">Lessons to reduce rework <span class="vj-dash-note">(distilled from <code>.claude/skills/gia-preflight/SKILL.md</code>)</span></h2>
        <ol class="vj-lessons" id="vj-lessons"></ol>
      </div>`;

    const $ = (s) => panel.querySelector(s);
    const esc = (s) => escapeHtml(s == null ? '' : String(s));
    function barList(el, pairs, max) {
      const mx = max || Math.max(1, ...pairs.map((p) => p[1]));
      el.innerHTML = pairs.map(([k, v]) =>
        `<div class="vj-barrow"><span class="vj-bark" title="${esc(k)}">${esc(k)}</span><span class="vj-barb" style="width:${Math.max(2, Math.round(v / mx * 100))}%"></span><span class="vj-barv">${v}</span></div>`
      ).join('');
    }
    function tallyBy(fn) {
      const m = new Map();
      for (const r of records) for (const k of [].concat(fn(r))) {
        if (k == null || k === '') continue;
        m.set(k, (m.get(k) || 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    }

    // KPIs
    const total = records.length;
    const merged = records.filter((r) => r.merged).length;
    const closed = total - merged;
    const minors = new Set(records.map((r) => r.minor).filter(Boolean)).size;
    const rework = records.filter((r) => r.reworkOf).length;
    const cues = records.filter((r) => r.reworkCue).length;
    $('#vj-kpis').innerHTML = [
      ['PRs total', total], ['Merged', merged], ['Closed unmerged', closed],
      ['Releases (minor lines)', minors], ['Flagged rework', rework], ['Follow-up-cue titles', cues]
    ].map(([l, n]) => `<div class="vj-kpi"><div class="vj-kpi-n">${n}</div><div class="vj-kpi-l">${esc(l)}</div></div>`).join('');

    // Bar lists
    barList($('#vj-churnArea'), tallyBy((r) => r.area));
    barList($('#vj-churnMod'), tallyBy((r) => r.modules).slice(0, 30));
    const perMinor = tallyBy((r) => r.minor).sort((a, b) => {
      const pa = a[0].split('.').map(Number), pb = b[0].split('.').map(Number);
      return pa[0] - pb[0] || pa[1] - pb[1];
    });
    barList($('#vj-perMinor'), perMinor);
    barList($('#vj-catMix'), tallyBy((r) => r.category));

    // Rework list
    const rew = records.filter((r) => r.reworkOf).sort((a, b) => a.pr - b.pr);
    $('#vj-rework').innerHTML = `<div class="vj-dash-note">${rew.length} PR${rew.length === 1 ? '' : 's'} flagged.</div>`
      + `<div class="vj-scrollbox"><table class="vj-mini"><thead><tr><th>PR</th><th>Area</th><th>Looks like a follow-up of</th><th>Title</th></tr></thead><tbody>`
      + rew.map((r) => `<tr><td class="vj-pr-num">#${r.pr}</td><td>${esc(r.area)}</td><td class="vj-pr-num">#${r.reworkOf}</td><td>${esc(r.title)}</td></tr>`).join('')
      + `</tbody></table></div>`;

    // Same-day clusters
    const byDay = new Map();
    for (const r of records) {
      if (!r.day) continue;
      (byDay.get(r.day) || byDay.set(r.day, []).get(r.day)).push(r.pr);
    }
    const heavy = [...byDay.entries()].filter(([, ps]) => ps.length >= 4).sort((a, b) => b[1].length - a[1].length);
    $('#vj-clusterNote').innerHTML = heavy.length
      ? `Days with ≥4 PRs (iterating fast / in production): ${heavy.slice(0, 12).map(([d, ps]) => `${d} (${ps.length})`).join(', ')}${heavy.length > 12 ? ', …' : ''}.`
      : 'No day had ≥4 PRs.';

    // PRs over time
    const weekKey = (d) => {
      if (!d) return '';
      const dt = new Date(d + 'T00:00:00Z');
      const dow = (dt.getUTCDay() + 6) % 7;
      dt.setUTCDate(dt.getUTCDate() - dow);
      return dt.toISOString().slice(0, 10);
    };
    function chronoTally(fn) {
      const m = new Map();
      for (const r of records) { const k = fn(r); if (!k) continue; m.set(k, (m.get(k) || 0) + 1); }
      return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    }
    const perDayT = chronoTally((r) => r.day);
    const perWeekT = chronoTally((r) => weekKey(r.day));
    barList($('#vj-perWeek'), perWeekT.map(([k, v]) => [`wk of ${k}`, v]));
    barList($('#vj-perDay'), perDayT);

    // Small PRs
    const isSmall = (r) => (r.nFiles != null && r.nFiles <= 2) || SMALL_CATS.has(r.category);
    const smalls = records.filter(isSmall);
    const fmtPct = (n) => `${Math.round(n * 100)}%`;
    $('#vj-smallNote').innerHTML = `${smalls.length} of ${total} PRs (${fmtPct(smalls.length / total)}) were small — ≤2 files changed, or category copy / prompt-tune / test. Each is a candidate that might have been folded into a sibling PR.`;
    barList($('#vj-smallByArea'), (() => {
      const m = new Map();
      for (const r of smalls) m.set(r.area, (m.get(r.area) || 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    })());
    $('#vj-smallList').innerHTML = smalls.map((r) =>
      `<tr><td class="vj-pr-num"><a href="https://github.com/ang-kl/gia/pull/${r.pr}" target="_blank" rel="noopener">#${r.pr}</a></td><td class="vj-pr-num">${esc(r.version)}</td><td>${esc(r.category)}</td><td>${esc(r.area)}</td><td>${esc(r.title)}${r.nFiles != null ? ` <span class="vj-dash-note">(${r.nFiles}f)</span>` : ''}</td></tr>`
    ).join('');

    // Indecision
    function indecSignal(r) {
      const t = (r.title + ' ' + r.body).toLowerCase();
      for (const [label, re] of INDEC) if (re.test(t)) return label;
      return null;
    }
    const indecs = records.map((r) => ({ r, sig: indecSignal(r) })).filter((x) => x.sig).sort((a, b) => a.r.pr - b.r.pr);
    $('#vj-indecNote').innerHTML = `${indecs.length} PR${indecs.length === 1 ? '' : 's'} carry a revert / re-enable / "actually" / "not taking effect" / "again" cue — each is a decision that did not stick the first time.`;
    $('#vj-indecList').innerHTML = indecs.map(({ r, sig }) =>
      `<tr><td class="vj-pr-num"><a href="https://github.com/ang-kl/gia/pull/${r.pr}" target="_blank" rel="noopener">#${r.pr}</a></td><td class="vj-pr-num">${esc(r.version)}</td><td>${esc(r.area)}</td><td>${esc(r.title)}</td><td><span class="vj-dash-tag">${esc(sig)}</span></td></tr>`
    ).join('');

    // Behavioural patterns
    const activeDays = perDayT.length;
    const maxDay = perDayT.reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
    const fixN = records.filter((r) => r.category === 'fix').length;
    const featN = records.filter((r) => r.category === 'feature').length;
    const eligibleRework = records.filter((r) => !SKIP_AREAS.has(r.area)).length;
    let bestRun = 0, bestArea = '', cur = 0, curArea = null;
    for (const r of records) {
      if (r.area === curArea) cur++;
      else { curArea = r.area; cur = 1; }
      if (cur > bestRun) { bestRun = cur; bestArea = curArea; }
    }
    const fc = records.map((r) => r.nFiles).filter((n) => n != null).sort((a, b) => a - b);
    const medFiles = fc.length ? (fc.length % 2 ? fc[(fc.length - 1) / 2] : Math.round((fc[fc.length / 2 - 1] + fc[fc.length / 2]) / 2)) : '—';
    const modT = tallyBy((r) => r.modules);
    const topMod = modT.length ? modT[0] : ['—', 0];
    $('#vj-behav').innerHTML = [
      ['PRs / active day', activeDays ? (total / activeDays).toFixed(1) : '—', activeDays + ' active days'],
      ['Busiest day', maxDay[1] + ' PRs', maxDay[0]],
      ['fix : feature', featN ? (fixN / featN).toFixed(2) + ' : 1' : '—', fixN + ' fix · ' + featN + ' feature'],
      ['Rework rate', eligibleRework ? fmtPct(rework / eligibleRework) : '—', rework + ' / ' + eligibleRework + ' eligible'],
      ['Longest same-area streak', bestRun + ' PRs', bestArea],
      ['Median files / PR', String(medFiles), fc.length + ' PRs w/ a file list'],
      ['Most-edited code area', topMod[1] + '×', topMod[0]],
      ['Small-PR share', fmtPct(smalls.length / total)]
    ].map(([l, n, h]) => `<div class="vj-kpi"><div class="vj-kpi-n">${esc(String(n))}</div><div class="vj-kpi-l">${esc(l)}${h ? ' · ' + esc(h) : ''}</div></div>`).join('');
    $('#vj-behavNote').innerHTML = 'Read together: a high fix:feature ratio + a high rework rate + long same-area streaks ⇒ scoping &amp; verification (the gia-preflight gates) are where the leverage is.';

    // Hard parts — fix-density + failure-mode keyword matches.
    const byArea = new Map();
    for (const r of records) {
      const a = byArea.get(r.area) || { t: 0, f: 0 };
      a.t++; if (r.category === 'fix') a.f++;
      byArea.set(r.area, a);
    }
    const dens = [...byArea.entries()].filter(([, o]) => o.t >= 3)
      .map(([a, o]) => [`${a} (${o.f}/${o.t})`, Math.round(o.f / o.t * 100)])
      .sort((x, y) => y[1] - x[1]);
    barList($('#vj-fixDensity'), dens, 100);
    const counts = new Map(), hits = [];
    for (const r of records) {
      const t = (r.title + ' ' + r.body).toLowerCase();
      for (const [label, re] of FAIL_MODES) {
        if (re.test(t)) { counts.set(label, (counts.get(label) || 0) + 1); hits.push([label, r]); }
      }
    }
    const fm = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (fm.length) {
      barList($('#vj-failModes'), fm);
      $('#vj-failBox').style.display = '';
      $('#vj-failList').innerHTML = hits.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1].pr - b[1].pr)
        .map(([label, r]) => `<tr><td><span class="vj-dash-tag">${esc(label)}</span></td><td class="vj-pr-num"><a href="https://github.com/ang-kl/gia/pull/${r.pr}" target="_blank" rel="noopener">#${r.pr}</a></td><td>${esc(r.title)}</td></tr>`).join('');
    } else {
      $('#vj-failModes').innerHTML = '<div class="vj-dash-note">No PR title/body matched the failure-mode keywords (those signals live mostly in PR bodies / the journal, which this view does not index).</div>';
    }

    // Lessons
    $('#vj-lessons').innerHTML = LESSONS.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join('');
  }
})();
