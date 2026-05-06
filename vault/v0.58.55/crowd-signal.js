// crowd-signal.js — v0.57.31
//
// Attach an LTA-carpark-derived crowd signal to each venue. Uses
// pipeline.clusterByGrid (500 m cells) so we make at most one
// LTA-carpark fetch per cluster, not per venue. computeCrowdSignal
// returns { level: 'high' | 'medium' | 'low', medianLots, sampleSize }
// or null when fewer than 2 carparks are within range (signal too weak).
//
// Honesty about the bias (per pipeline.js:713-718):
//   - In CBD (Maxwell, Lau Pa Sat, Amoy Street), lunch crowds are
//     overwhelmingly walk-in; carpark availability under-detects
//     real crowd. The signal is most useful at suburban malls and
//     drive-to F&B in HDB heartlands where car arrivals correlate
//     with diner footfall.
//   - "high crowd" = median nearby carpark availableLots < 15.
//     "low crowd" = > 150. "medium" otherwise.
//
// API:
//   attachCrowdSignals(venues) -> Promise<venues>  (mutated in place)
//     Each venue gets `crowdLevel: 'high'|'medium'|'low'|null` and
//     `crowdSignal: { level, medianLots, sampleSize } | null`.

const pipeline = require('./pipeline');
const carpark = require('./carpark');

async function attachCrowdSignals(venues) {
  if (!Array.isArray(venues) || !venues.length) return venues || [];
  const clusters = pipeline.clusterByGrid(venues);
  const cellSignal = new Map();
  await Promise.all([...clusters.values()].map(async (cell) => {
    try {
      const parks = await carpark.nearest(cell.center.lat, cell.center.lng, 3);
      cellSignal.set(cell.key, pipeline.computeCrowdSignal(parks));
    } catch {
      cellSignal.set(cell.key, null);
    }
  }));
  for (const cell of clusters.values()) {
    const sig = cellSignal.get(cell.key) || null;
    for (const v of cell.venues) {
      v.crowdSignal = sig;
      v.crowdLevel = sig?.level || null;
    }
  }
  return venues;
}

// Numeric crowd cost — higher means MORE crowded. Used as a soft
// tiebreaker on top of distance / rarity ranking. Range 0..1.
function crowdCost(crowdLevel) {
  if (crowdLevel === 'high') return 1.0;
  if (crowdLevel === 'medium') return 0.5;
  if (crowdLevel === 'low') return 0.0;
  return 0.5; // unknown → treat as medium (no boost or penalty)
}

// Emoji + label for chat / TMA card chips.
function crowdChip(crowdLevel) {
  if (crowdLevel === 'high') return { emoji: '🔴', label: 'busy' };
  if (crowdLevel === 'medium') return { emoji: '🟡', label: 'moderate' };
  if (crowdLevel === 'low') return { emoji: '🟢', label: 'quiet' };
  return null;
}

module.exports = {
  attachCrowdSignals,
  crowdCost,
  crowdChip
};
