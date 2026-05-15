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

  function renderPRTable(panel, records) {
    const t = document.createElement('table');
    t.className = 'vj-table';
    t.innerHTML = `
      <thead><tr>
        <th>#</th><th>Title</th><th>State</th><th>Author</th><th>Merged / Updated</th><th>Files</th>
      </tr></thead><tbody></tbody>`;
    const tbody = t.querySelector('tbody');
    for (const r of records) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.url ? `<a href="${escapeAttr(r.url)}" target="_blank">${r.number ?? '—'}</a>` : (r.number ?? '—')}</td>
        <td>${escapeHtml(r.title || '')}</td>
        <td><span class="vj-status" data-status="${escapeAttr(r.state || '')}">${escapeHtml(r.state || '')}</span></td>
        <td>${escapeHtml(r.author || '—')}</td>
        <td>${escapeHtml(formatDate(r.merged_at) || '—')}</td>
        <td>${r.files_changed ?? '—'}</td>`;
      tbody.appendChild(tr);
    }
    panel.appendChild(t);
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
  function renderMarkdownLite(md) {
    let s = escapeHtml(md);
    s = s.replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c}</code></pre>`);
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // Bullet list — convert sequences of `- ` lines to <ul>.
    s = s.replace(/((?:^|\n)\s*-\s+.+(?:\n\s*-\s+.+)*)/g, (block) => {
      const items = block.trim().split(/\n\s*-\s+/).filter(Boolean).map((it) => `<li>${it.trim()}</li>`).join('');
      return `\n<ul>${items}</ul>`;
    });
    return s;
  }
})();
