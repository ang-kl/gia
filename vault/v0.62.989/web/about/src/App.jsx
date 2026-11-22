import React, { useEffect, useRef } from 'react';

/* eslint-disable no-undef */
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
/* eslint-enable no-undef */

const LINKS = {
  bot: 'https://t.me/soleat',
  web: 'https://web.soleat.net',
  source: 'https://github.com/ang-kl/gia'
};

/* ── reveal-on-scroll ─────────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach((e) => e.classList.add('in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/* ── small building blocks ────────────────────────────────────────── */
function Kicker({ children }) {
  return <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-400">{children}</div>;
}
function Card({ children, className = '' }) {
  return <div className={`glass rounded-2xl p-5 sm:p-6 ${className}`}>{children}</div>;
}
function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-extrabold gradient-text">{value}</div>
      <div className="mt-1 text-[12px] sm:text-[13px] text-mist-400">{label}</div>
    </div>
  );
}

/* A stylised phone frame wrapping arbitrary "screen" content. */
function Phone({ children, className = '' }) {
  return (
    <div className={`relative mx-auto w-[230px] ${className}`}>
      <div className="rounded-[2rem] glass p-2 shadow-2xl">
        <div className="rounded-[1.55rem] overflow-hidden bg-ink-900 ring-1 ring-white/10">
          <div className="flex items-center justify-center py-1.5">
            <span className="h-1 w-14 rounded-full bg-white/15" />
          </div>
          <div className="px-3 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* Region pill row mock (mirrors the real liquid-glass pills). */
function PillRow({ active = 'SG' }) {
  const pills = [['📍', 'Current'], ['🇸🇬', 'Singapore'], ['🇲🇾', 'Johor Bahru'], ['🌏', 'Cities']];
  return (
    <div className="flex gap-1">
      {pills.map(([f, l]) => (
        <div key={l}
          className={`flex-1 rounded-lg px-1 py-1 text-[8px] text-center glass-soft ${l === active ? 'ring-1 ring-brand-400 text-brand-400' : 'text-mist-200'}`}>
          <span className="mr-0.5">{f}</span>{l}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  useReveal();
  return (
    <div className="relative font-sans antialiased">
      <Nav />
      <Hero />
      <Problem />
      <TwoSurfaces />
      <Words />
      <Places />
      <Architecture />
      <HawkerMap />
      <TrainViews />
      <Engineering />
      <Stack />
      <Metrics />
      <CTA />
      <Footer />
    </div>
  );
}

/* ── nav ──────────────────────────────────────────────────────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="glass-soft border-b border-white/5 backdrop-blur-xl">
        <div className="section-pad flex h-14 items-center justify-between">
          <a href="#top" className="flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-teal-400 text-sm">☼</span>
            <span>Soleat</span>
            <span className="hidden sm:inline text-[11px] font-normal text-mist-400">· solo eats / so let’s eat</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-[13px] text-mist-200">
            <a className="hover:text-mist-50" href="#problem">Problem</a>
            <a className="hover:text-mist-50" href="#surfaces">Surfaces</a>
            <a className="hover:text-mist-50" href="#architecture">Architecture</a>
            <a className="hover:text-mist-50" href="#engineering">Engineering</a>
          </nav>
          <a href={LINKS.bot} target="_blank" rel="noreferrer"
            className="rounded-full bg-gradient-to-br from-brand-500 to-teal-500 px-4 py-1.5 text-[13px] font-semibold text-white shadow-lg shadow-brand-600/20 hover:brightness-110">
            Open on Telegram
          </a>
        </div>
      </div>
    </header>
  );
}

/* ── hero ─────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section id="top" className="relative aurora overflow-hidden">
      <div className="section-pad relative z-10 grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="reveal">
          <div className="chip mb-5"><span className="text-sg">🇸🇬</span> Singapore <span className="text-mist-400">⇄</span> <span className="text-jb">🇲🇾</span> Johor Bahru</div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.05] tracking-tight">
            A food concierge that reads <span className="gradient-text">what you mean</span>, anchored to <span className="gradient-text">where you are</span>.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] sm:text-base leading-relaxed text-mist-200">
            Soleat is a Telegram bot and a suite of Mini Apps that turn Google’s raw place
            data into walkable, here-and-now eating decisions — across two countries that
            touch at a causeway. Sourced from Google, curated for humans.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={LINKS.bot} target="_blank" rel="noreferrer"
              className="rounded-full bg-gradient-to-br from-brand-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:brightness-110">
              Try the bot →
            </a>
            <a href={LINKS.web} target="_blank" rel="noreferrer"
              className="rounded-full glass px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
              Open the web app
            </a>
            <a href={LINKS.source} target="_blank" rel="noreferrer"
              className="rounded-full glass px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
              View the source
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-mist-400">
            <span>● Node + Express bot</span>
            <span>● React / Vite Mini Apps</span>
            <span>● Google Places · Routes · Gemini</span>
            <span>● Redis · Railway</span>
          </div>
        </div>

        <div className="reveal">
          <Phone className="animate-floaty">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold">Cuisine</span>
              <span className="text-[9px] text-mist-400">🇬🇧 · 🇫🇷 · ☁ 28°C</span>
            </div>
            <PillRow active="Singapore" />
            <div className="mt-2 rounded-lg glass-soft px-2 py-1.5 text-[9px] text-mist-200">📍 🇸🇬 Telok Blangah <span className="float-right">🔍</span></div>
            <div className="mt-2 h-28 rounded-lg bg-gradient-to-br from-brand-600/30 to-teal-500/20 ring-1 ring-white/10 grid place-items-center text-[10px] text-mist-300">
              <span>🗺 map · pins · overlays</span>
            </div>
            <div className="mt-2 rounded-full glass-soft px-2 py-1.5 text-[9px] text-mist-300">💬 What are you craving? <span className="float-right">→</span></div>
          </Phone>
        </div>
      </div>
    </section>
  );
}

/* ── problem ──────────────────────────────────────────────────────── */
function Problem() {
  const items = [
    { icon: '😵‍💫', t: 'Decision fatigue, not search fatigue', d: 'The hard part of a daily meal isn’t finding restaurants — Google has thousands. It’s deciding, fast, with people, near you, right now.' },
    { icon: '🌉', t: 'The causeway is a real border', d: 'A spot 2 km away can be a different country, currency, cuisine scene and price level. Singapore and Johor Bahru touch — but they are not interchangeable.' },
    { icon: '🤔', t: '“Cuisine” is a fuzzy word', d: 'Two people type different words for the same plate; one word means different plates by region. Search has to interpret intent, not match strings.' }
  ];
  return (
    <section id="problem" className="section-pad py-16 sm:py-24">
      <div className="reveal max-w-2xl">
        <Kicker>The problem</Kicker>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">The friction of small daily food decisions, in two countries that touch.</h2>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {items.map((it) => (
          <Card key={it.t} className="reveal">
            <div className="text-2xl">{it.icon}</div>
            <h3 className="mt-3 font-semibold">{it.t}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-mist-400">{it.d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ── two surfaces ─────────────────────────────────────────────────── */
function TwoSurfaces() {
  return (
    <section id="surfaces" className="section-pad py-16 sm:py-24">
      <div className="reveal max-w-2xl">
        <Kicker>Two surfaces, one source</Kicker>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">The 🔍 Mini App, and <code className="rounded bg-white/10 px-1.5 text-[0.8em]">/cuisine</code> in chat.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-mist-300">Different UI, same Google-only sourcing and the same curation logic underneath. Pick the surface that fits the moment — a quick chat answer, or a map-first explore.</p>
      </div>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-2">
        <Card className="reveal">
          <h3 className="font-semibold">Cuisine Mini App — the 🔍 button</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-mist-400">A map-first explorer: region pills, a live Google map with domain overlays, filter chips, and result cards with travel time, rating floor and crowd signals.</p>
          <div className="mt-5"><Phone>
            <PillRow active="Current" />
            <div className="mt-2 h-32 rounded-lg bg-gradient-to-br from-brand-600/30 to-teal-500/20 ring-1 ring-white/10 grid place-items-center text-[10px] text-mist-300">🗺 results on the map</div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <div className="rounded-md glass-soft px-2 py-1 text-[8px] text-mist-200">Halal</div>
              <div className="rounded-md glass-soft px-2 py-1 text-[8px] text-mist-200">Open now</div>
            </div>
          </Phone></div>
        </Card>
        <Card className="reveal">
          <h3 className="font-semibold">Chat — <code className="rounded bg-white/10 px-1 text-[0.85em]">/cuisine</code> or free text</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-mist-400">Type a craving in any words; the bot classifies intent, anchors to your location, and replies with curated picks — no app switch needed.</p>
          <div className="mt-5 space-y-2 text-[12px]">
            <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600/40 px-3 py-2">spicy thai near me</div>
            <div className="w-fit max-w-[88%] rounded-2xl rounded-bl-sm glass-soft px-3 py-2 text-mist-200">📍 Anchored to <b>Telok Blangah</b> · 3 picks within walking distance →</div>
            <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600/40 px-3 py-2">dai lok</div>
            <div className="w-fit max-w-[88%] rounded-2xl rounded-bl-sm glass-soft px-3 py-2 text-mist-200">Read as <b>KL Hokkien Mee</b> 大碌麵 — including tai-chow stalls that serve it.</div>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ── A. words / interpretation ────────────────────────────────────── */
function Words() {
  return (
    <section className="section-pad py-16 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="reveal">
          <Kicker>The subtlety of words</Kicker>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Interpreting what searchers <span className="gradient-text">mean</span> — not just what they type.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-mist-300">
            Food language is dialect, slang, brand and mood all at once. Soleat treats the query
            as <em>intent</em>: a colloquial nickname, a dish, a brand, or a vibe — and resolves it to the
            right places, region by region.
          </p>
          <ul className="mt-5 space-y-3 text-[14px] text-mist-200">
            <li className="flex gap-2"><span className="text-teal-400">›</span><span><b>Dialect → dish.</b> “dai lok” alone matches steamboat &amp; seafood by name; Soleat knows it means <b>大碌麵 KL Hokkien Mee</b> and expands the query to the noodle shops <em>and</em> the tai-chow stalls that also serve it.</span></li>
            <li className="flex gap-2"><span className="text-teal-400">›</span><span><b>One word, many plates.</b> “Hokkien mee” is a soupy dish in Penang and a dark, fried one in KL — the answer follows your region.</span></li>
            <li className="flex gap-2"><span className="text-teal-400">›</span><span><b>Free text, classified.</b> “what are you craving?” is read by an LLM into cuisine / dish / brand / filters before a single Google call.</span></li>
          </ul>
        </div>
        <Card className="reveal">
          <div className="text-[12px] font-mono text-mist-400">query interpretation</div>
          <div className="mt-3 space-y-3">
            {[
              ['“dai lok”', 'colloquial → 大碌麵', 'KL Hokkien Mee + tai-chow sellers'],
              ['“sushi tei”', 'brand pass-through', 'the chain’s outlets, then Japanese nearby'],
              ['“something light, halal”', 'mood + filter', 'lighter cuisines, halal-only'],
              ['“97 durian”', 'stall name + fruit', 'fan-out across durian synonyms']
            ].map(([q, kind, out]) => (
              <div key={q} className="rounded-xl glass-soft p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{q}</span>
                  <span className="chip !py-0.5 !text-[10px]">{kind}</span>
                </div>
                <div className="mt-1 text-[12px] text-mist-400">→ {out}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ── B. places / tourists ─────────────────────────────────────────── */
function Places() {
  return (
    <section className="section-pad py-16 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <Card className="reveal order-2 lg:order-1">
          <div className="text-[12px] font-mono text-mist-400">location-bound sourcing</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
            {[
              ['📍 Current', 'live device GPS — never a stale cache'],
              ['🇸🇬 Singapore', 'restores your last SG spot, or Merlion'],
              ['🇲🇾 Johor Bahru', 'your real Johor location, not a fixed default'],
              ['🌏 Cities', 'a 139-city, 16-country picker']
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl glass-soft p-3">
                <div className="font-semibold">{t}</div>
                <div className="mt-1 text-[12px] text-mist-400">{d}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl glass-soft p-3 text-[12px] text-mist-300">
            Region drives <b>everything downstream</b>: which country Google searches, the radius cap,
            travel-time mode, and even the flag in the field — reconciled so the label always
            matches the pin.
          </div>
        </Card>
        <div className="reveal order-1 lg:order-2">
          <Kicker>Bound to where you are</Kicker>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Tourists don’t want a city list. They want <span className="gradient-text">here</span>.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-mist-300">
            A visitor who doesn’t know the neighbourhood needs walkable, here-and-now answers — so every
            search is anchored to a real position and a real country. Cross the causeway and the whole
            frame shifts: country, cuisine scene, price level, travel mode.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-mist-300">
            Coordinates near the strait are deliberately classified to the right side of the border, and
            “📍 Current” resolves a fresh GPS fix and a real street name — so the app never quietly
            answers for the wrong place.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── architecture ─────────────────────────────────────────────────── */
function Architecture() {
  return (
    <section id="architecture" className="section-pad py-16 sm:py-24">
      <div className="reveal max-w-2xl">
        <Kicker>Under the hood</Kicker>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Boring tech doing serious work.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-mist-300">One Node/Express service is both the Telegram bot and the API behind five Mini Apps. Google is the single source of venue truth; an LLM only ever <em>interprets and labels</em> — it never invents places.</p>
      </div>
      <Card className="reveal mt-10 overflow-x-auto">
        <svg viewBox="0 0 920 300" className="w-full min-w-[680px]" role="img" aria-label="Soleat data-flow architecture">
          <defs>
            <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3a8dff" /><stop offset="1" stopColor="#34d3a6" />
            </linearGradient>
            <style>{`.bx{fill:rgba(255,255,255,.04);stroke:rgba(255,255,255,.14)}.lbl{fill:#f3f6fc;font:600 14px Inter,sans-serif}.sub{fill:#8a94a8;font:12px Inter,sans-serif}.fl{stroke:url(#ln);stroke-width:2;fill:none;marker-end:url(#ar)}`}</style>
            <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="#34d3a6" /></marker>
          </defs>
          {/* clients */}
          <rect className="bx" x="20" y="60" width="170" height="64" rx="12" />
          <text className="lbl" x="105" y="88" textAnchor="middle">Telegram</text>
          <text className="sub" x="105" y="108" textAnchor="middle">chat · /cuisine</text>
          <rect className="bx" x="20" y="160" width="170" height="64" rx="12" />
          <text className="lbl" x="105" y="188" textAnchor="middle">Mini Apps</text>
          <text className="sub" x="105" y="208" textAnchor="middle">Cuisine · Hawker · Train…</text>
          {/* core */}
          <rect className="bx" x="350" y="100" width="210" height="92" rx="14" stroke="url(#ln)" />
          <text className="lbl" x="455" y="138" textAnchor="middle">Express service</text>
          <text className="sub" x="455" y="158" textAnchor="middle">bot + API · curation</text>
          <text className="sub" x="455" y="176" textAnchor="middle">geofence · dish-intel · i18n</text>
          {/* providers */}
          {[['Google Places', 'venues — source of truth', 0], ['Google Routes', 'travel time', 1], ['Gemini', 'interpret · label only', 2], ['Redis', 'location · caches', 3]].map(([t, s, i]) => (
            <g key={t}>
              <rect className="bx" x="720" y={18 + i * 70} width="180" height="56" rx="12" />
              <text className="lbl" x="810" y={42 + i * 70} textAnchor="middle">{t}</text>
              <text className="sub" x="810" y={60 + i * 70} textAnchor="middle">{s}</text>
            </g>
          ))}
          {/* flows */}
          <path className="fl" d="M190,92 C270,92 280,140 348,140" />
          <path className="fl" d="M190,192 C270,192 280,150 348,150" />
          {[46, 116, 186, 256].map((y, i) => (
            <path key={i} className="fl" d={`M560,${146} C640,${146} 660,${y} 718,${y}`} />
          ))}
        </svg>
      </Card>
    </section>
  );
}

/* ── C. hawker map ────────────────────────────────────────────────── */
function HawkerMap() {
  return (
    <section className="section-pad py-16 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="reveal">
          <Kicker>Hawker map — a domain view</Kicker>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">More than pins on a map.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-mist-300">
            A hawker centre is a Singapore institution a newcomer may never have seen. The Hawker Mini App
            doesn’t just drop markers — it overlays <b>operational reality</b>: which centres are open vs
            closed for their scheduled cleaning quarter, plus amenity layers (carparks, transit, attractions)
            clipped to the area you’re viewing.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-mist-300">The map answers the real question — <em>“can I actually eat there today, and how do I get to it?”</em></p>
        </div>
        <Card className="reveal">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="chip">✅ Open today</span>
            <span className="chip">🧹 Cleaning quarter</span>
            <span className="chip">🅿 Carpark</span>
            <span className="chip">🚆 Transit</span>
          </div>
          <div className="relative mt-3 h-44 rounded-xl bg-gradient-to-br from-ink-700 to-ink-800 ring-1 ring-white/10 overflow-hidden">
            <div className="absolute left-6 top-8 h-3 w-3 rounded-full bg-teal-400 shadow shadow-teal-400/50" />
            <div className="absolute left-24 top-20 h-3 w-3 rounded-full bg-sg" />
            <div className="absolute right-10 top-12 h-3 w-3 rounded-full bg-teal-400 shadow shadow-teal-400/50" />
            <div className="absolute right-20 bottom-8 h-3 w-3 rounded-full bg-mist-600" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-[10px] text-mist-400">geographic map · status-coloured centres</div>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ── D. train two views ───────────────────────────────────────────── */
function TrainViews() {
  return (
    <section className="section-pad py-16 sm:py-24">
      <div className="reveal max-w-2xl">
        <Kicker>Train map — two truths</Kicker>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Why the Google map and the operator’s map are <span className="gradient-text">not one view</span>.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-mist-300">
          They answer different questions, and merging them would lie. So the Train Mini App ships
          <b> both</b>, toggleable — and treats the gap between them as a feature, not a bug.
        </p>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Card className="reveal">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">🗺 Google geographic map</h3>
            <span className="chip !text-[10px]">real coordinates</span>
          </div>
          <div className="relative mt-3 h-40 rounded-xl bg-gradient-to-br from-ink-700 to-ink-800 ring-1 ring-white/10">
            <svg viewBox="0 0 300 150" className="absolute inset-0 h-full w-full">
              <path d="M20,120 C80,110 110,60 180,50 C230,42 260,30 285,20" stroke="#34d3a6" strokeWidth="3" fill="none" />
              {[[35,116],[100,80],[180,50],[250,30]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="4" fill="#fff"/>))}
            </svg>
            <span className="absolute bottom-2 left-3 text-[10px] text-mist-400">true distances — “can I walk it?”</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-mist-400">Stations sit at their real lat/lng on Google’s map with actual LTA route geometry — so distance, walking and nearby amenities are honest.</p>
        </Card>
        <Card className="reveal">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">🚇 Operator system map</h3>
            <span className="chip !text-[10px]">official schematic</span>
          </div>
          <div className="relative mt-3 h-40 rounded-xl bg-gradient-to-br from-ink-700 to-ink-800 ring-1 ring-white/10">
            <svg viewBox="0 0 300 150" className="absolute inset-0 h-full w-full">
              <line x1="30" y1="40" x2="270" y2="40" stroke="#ef3340" strokeWidth="4" />
              <line x1="30" y1="110" x2="270" y2="110" stroke="#3a8dff" strokeWidth="4" />
              <line x1="150" y1="40" x2="150" y2="110" stroke="#19b88c" strokeWidth="4" />
              {[30,90,150,210,270].map((x,i)=>(<circle key={'a'+i} cx={x} cy="40" r="5" fill="#0b0f17" stroke="#fff" strokeWidth="2"/>))}
              {[30,90,150,210,270].map((x,i)=>(<circle key={'b'+i} cx={x} cy="110" r="5" fill="#0b0f17" stroke="#fff" strokeWidth="2"/>))}
            </svg>
            <span className="absolute bottom-2 left-3 text-[10px] text-mist-400">even spacing — legible topology</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-mist-400">The official LTA diagram distorts geography <em>on purpose</em> — even spacing, clean angles, line colours — because that’s how riders actually navigate.</p>
        </Card>
      </div>
      <p className="reveal mt-6 text-center text-[13px] text-mist-400">A schematic can’t be geographically accurate <span className="text-mist-200">and</span> stay legible — so Soleat refuses the misleading hybrid and lets you switch between truth and topology.</p>
    </section>
  );
}

/* ── engineering highlights ───────────────────────────────────────── */
function Engineering() {
  const items = [
    ['Google-only sourcing', 'Every venue is real and traceable to Google. The LLM interprets and labels — it never fabricates a place.'],
    ['Cross-border geofencing', 'Coordinates resolve to SG / JB / OTHER with a strait-aware bbox, so a Johor highway never flies a Singapore flag.'],
    ['Dish intelligence', 'A colloquial-alias layer maps dialect nicknames (大碌麵, lok-lok…) to canonical dishes — and unions in the sellers Places indexes differently.'],
    ['Honest empties', 'When nothing genuinely fits the region + filters, it says so — instead of leaking far-away or wrong-country results.'],
    ['Append-only documentation', 'A versioned, never-compressed doc protocol (journal, register, feature/technical) records every decision and its rationale.'],
    ['Bilingual, themed', 'EN / FR throughout, Telegram-theme-aware UI, liquid-glass components, and a 3,400+ test suite gating every change.']
  ];
  return (
    <section id="engineering" className="section-pad py-16 sm:py-24">
      <div className="reveal max-w-2xl">
        <Kicker>Engineering highlights</Kicker>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Decisions, not just features.</h2>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([t, d]) => (
          <Card key={t} className="reveal">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-mist-400">{d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ── stack ────────────────────────────────────────────────────────── */
function Stack() {
  const groups = [
    ['Backend', ['Node.js', 'Express', 'Telegram Bot API', 'Redis', 'Railway']],
    ['Frontend', ['React', 'Vite', 'Tailwind CSS', '5 Mini Apps']],
    ['Data & AI', ['Google Places', 'Google Routes', 'Geocoding', 'Gemini (interpret-only)']]
  ];
  return (
    <section className="section-pad py-8">
      <div className="grid gap-5 sm:grid-cols-3">
        {groups.map(([g, items]) => (
          <Card key={g} className="reveal">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-mist-400">{g}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {items.map((i) => <span key={i} className="chip">{i}</span>)}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ── metrics ──────────────────────────────────────────────────────── */
function Metrics() {
  return (
    <section className="section-pad py-16 sm:py-20">
      <Card className="reveal">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
          <Stat value="3,456" label="automated tests" />
          <Stat value="1,000+" label="pull requests shipped" />
          <Stat value="139" label="cities, 16 countries" />
          <Stat value="5" label="Telegram Mini Apps" />
          <Stat value="EN · FR" label="bilingual" />
        </div>
      </Card>
    </section>
  );
}

/* ── CTA ──────────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className="section-pad py-16 sm:py-24">
      <Card className="reveal aurora relative overflow-hidden text-center">
        <div className="relative z-10 py-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Decide where to eat in two taps.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-mist-300">Open the bot, share your location, and let Soleat read the room.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={LINKS.bot} target="_blank" rel="noreferrer" className="rounded-full bg-gradient-to-br from-brand-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:brightness-110">Open on Telegram →</a>
            <a href={LINKS.web} target="_blank" rel="noreferrer" className="rounded-full glass px-6 py-3 text-sm font-semibold hover:bg-white/10">Open the web app</a>
          </div>
        </div>
      </Card>
    </section>
  );
}

/* ── footer ───────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="section-pad border-t border-white/5 py-10 text-[12px] text-mist-400">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-brand-500 to-teal-400 text-[11px]">☼</span>
          <span className="text-mist-200">Soleat</span>
          <span>· Singapore ⇄ Johor Bahru</span>
        </div>
        <div className="flex items-center gap-5">
          <a className="hover:text-mist-50" href={LINKS.bot} target="_blank" rel="noreferrer">Telegram</a>
          <a className="hover:text-mist-50" href={LINKS.web} target="_blank" rel="noreferrer">Web app</a>
          <a className="hover:text-mist-50" href={LINKS.source} target="_blank" rel="noreferrer">Source</a>
          <a className="hover:text-mist-50" href="/about-classic">Classic</a>
        </div>
        <div>v{BUILD_VERSION}</div>
      </div>
    </footer>
  );
}
