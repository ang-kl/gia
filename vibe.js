const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Gia4lunch/1.0 (+https://github.com/ang-kl/gia)' }
});

const FEEDS = [
  { source: 'SethLui', url: 'https://sethlui.com/feed/' },
  { source: 'Honeycombers', url: 'https://thehoneycombers.com/singapore/feed/' }
];

const CBD_KEYWORDS = [
  'raffles place', 'cbd', 'tanjong pagar', 'shenton way',
  'marina bay', 'downtown', 'one raffles', 'ocbc centre',
  'lau pa sat', 'amoy street', 'telok ayer', 'china square',
  'maxwell', 'far east square'
];

const FOOD_KEYWORDS = [
  'restaurant', 'cafe', 'café', 'hawker', 'food court', 'eatery',
  'lunch', 'dinner', 'brunch', 'breakfast', 'menu', 'dish',
  'chef', 'cuisine', 'omakase', 'kopitiam', 'zi char', 'dim sum',
  'noodle', 'ramen', 'pasta', 'pizza', 'burger', 'sushi',
  'coffee', 'bakery', 'dessert', 'bistro', 'bar &', 'speakeasy',
  'best place to eat', 'where to eat', 'food guide'
];

const NON_FOOD_BLACKLIST = [
  'feng shui', 'real estate', 'property guide', 'condo launch',
  'salon', 'spa ', 'gym', 'fitness', 'yoga', 'pilates',
  'mrt line', 'bus route', 'co-working', 'coworking',
  'school', 'tuition', 'haircut', 'barber'
];

const SEED_LISTINGS = [
  { name: 'Lau Pa Sat', area: 'Telok Ayer', blurb: 'Heritage hawker centre — go for satay street after 7pm or quick lunch upstairs.', url: 'https://www.laupasat.sg/', source: 'seed' },
  { name: 'Amoy Street Food Centre', area: 'Amoy Street', blurb: 'Two floors of CBD-favourite stalls; arrive 11:30 or after 1:15 to avoid queues.', url: 'https://en.wikipedia.org/wiki/Amoy_Street_Food_Centre', source: 'seed' },
  { name: 'Maxwell Food Centre', area: 'Maxwell', blurb: 'Tian Tian chicken rice + neighbours; 10-min walk from Raffles Place.', url: 'https://en.wikipedia.org/wiki/Maxwell_Food_Centre', source: 'seed' },
  { name: 'Telok Ayer Hawker Centre', area: 'Telok Ayer', blurb: 'Smaller, quieter alternative to Lau Pa Sat with strong economy rice options.', url: 'https://en.wikipedia.org/wiki/Telok_Ayer_Market', source: 'seed' },
  { name: 'Far East Square', area: 'Telok Ayer', blurb: 'Quiet courtyard cafés and casual sit-down spots — sanctuary territory.', url: 'https://en.wikipedia.org/wiki/Far_East_Square', source: 'seed' }
];

function isFoodRelevant(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (NON_FOOD_BLACKLIST.some((kw) => lower.includes(kw))) return false;
  const hasLocation = CBD_KEYWORDS.some((kw) => lower.includes(kw));
  const hasFood = FOOD_KEYWORDS.some((kw) => lower.includes(kw));
  return hasLocation && hasFood;
}

function trimBlurb(text, max = 220) {
  if (!text) return '';
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.length > max ? stripped.slice(0, max - 1) + '…' : stripped;
}

async function fetchFeedItems(feed) {
  const parsed = await parser.parseURL(feed.url);
  return (parsed.items ?? [])
    .filter((item) => isFoodRelevant(`${item.title ?? ''} ${item.contentSnippet ?? ''} ${item.content ?? ''}`))
    .map((item) => ({
      name: item.title?.trim() ?? 'Untitled',
      area: 'CBD',
      blurb: trimBlurb(item.contentSnippet ?? item.content ?? ''),
      url: item.link ?? feed.url,
      source: feed.source
    }));
}

async function refreshVibeListings(redis) {
  const collected = [];
  for (const feed of FEEDS) {
    try {
      const items = await fetchFeedItems(feed);
      collected.push(...items);
      console.log(`[Vibe] ${feed.source}: ${items.length} CBD-matching items.`);
    } catch (err) {
      console.error(`[Vibe] ${feed.source} fetch failed:`, err.message);
    }
  }

  const listings = collected.length ? collected : SEED_LISTINGS;
  if (!redis.isOpen) await redis.connect();
  await redis.set('vibe:listings', JSON.stringify(listings));
  console.log(`[Vibe] Cached ${listings.length} listings (${collected.length ? 'live' : 'seed fallback'}).`);
}

async function pickLunch(redis, count = 3) {
  if (!redis.isOpen) await redis.connect();
  const cached = await redis.get('vibe:listings');
  const all = cached ? JSON.parse(cached) : SEED_LISTINGS;
  const pool = [...all];
  const picks = [];
  while (picks.length < Math.min(count, pool.length)) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

module.exports = { refreshVibeListings, pickLunch, SEED_LISTINGS };
