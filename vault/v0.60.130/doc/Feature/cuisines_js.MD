// v0.23.0 cuisine catalogue. 8 categories, ~70 entries, verbatim from the
// Human Lead spec (no relocation). "Common Here" is the only category
// expanded by default in the accordion UI.
// v0.59.35 — restructure per Human Lead 2026-05-07. Items in source
// stay in their historical buckets; cuisines-vault.js's
// SLUG_TO_CATEGORY remaps to the displayed world-region categories.
//   Removed: Goan, Tibetan (south-asian), Afghan (middle-eastern),
//            Peruvian, Cuban, Jamaican (americas).
//   Added:   Sri Lankan, Pakistani (south-asian), Hong Kong, Macau
//            (china-regional).
//   Moved:   Uzbek, Georgian → new slavic-eastern-european category
//            (via SLUG_TO_CATEGORY remap; source still lists them
//            under middle-eastern).

export const CUISINE_CATEGORIES = [
  {
    id: 'common-here',
    label: 'Common Here',
    defaultOpen: true,
    items: [
      'Singaporean', 'Peranakan', 'South Indian', 'North Indian', 'Malaysian',
      'Eurasian', 'Indonesian', 'Thai', 'Filipino', 'Vietnamese', 'Japanese',
      'Chinese', 'Korean', 'Taiwanese', 'American', 'Mexican', 'Brazilian',
      'Australian', 'New Zealand', 'Australasia', 'Burmese'
    ]
  },
  {
    id: 'china-regional',
    label: 'China (Regional)',
    items: [
      'Sichuan', 'Shanghainese', 'Cantonese', 'Hunan', 'Hokkien',
      'Teochew', 'Hainanese', 'Hakka', 'Northeastern', 'Northwestern',
      'Hong Kong', 'Macau'
    ]
  },
  {
    id: 'south-asian',
    label: 'South Asian Specialists',
    items: ['Bengali', 'Gujarati', 'Nepalese', 'Sri Lankan', 'Pakistani']
  },
  {
    id: 'european',
    label: 'European',
    items: [
      'European', 'Mediterranean', 'Italian', 'Spanish', 'Greek', 'French', 'British',
      'German', 'Austrian', 'Swiss', 'Portuguese', 'Russian', 'Ukrainian',
      'Polish', 'Scandinavian'
    ]
  },
  {
    id: 'middle-eastern',
    label: 'Middle Eastern & Central Asian',
    items: [
      'Lebanese', 'Turkish', 'Persian', 'Moroccan', 'Egyptian',
      'Jordanian', 'Israeli', 'Uzbek', 'Georgian'
    ]
  },
  {
    id: 'americas',
    label: 'Americas',
    items: ['Argentinian']
  },
  {
    id: 'african',
    label: 'African',
    items: ['African', 'South African']
  },
  {
    id: 'dessert',
    label: 'Dessert',
    items: ['Dessert']
  },
  {
    id: 'fusion',
    label: 'Fusion',
    items: ['Fusion']
  }
];

export const MAX_CUISINE_SELECTIONS = 5;

export const ALL_CUISINES_FLAT = CUISINE_CATEGORIES.flatMap((c) => c.items);
