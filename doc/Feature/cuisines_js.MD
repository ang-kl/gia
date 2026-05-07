// v0.23.0 cuisine catalogue. 8 categories, ~70 entries, verbatim from the
// Human Lead spec (no relocation). "Common Here" is the only category
// expanded by default in the accordion UI.

export const CUISINE_CATEGORIES = [
  {
    id: 'common-here',
    label: 'Common Here',
    defaultOpen: true,
    items: [
      'Singaporean', 'Peranakan', 'South Indian', 'North Indian', 'Malaysian',
      'Eurasian', 'Indonesian', 'Thai', 'Filipino', 'Vietnamese', 'Japanese',
      'Chinese', 'Korean', 'Taiwanese', 'American', 'Mexican', 'Brazilian',
      'Australian', 'New Zealand', 'Burmese'
    ]
  },
  {
    id: 'southeast-asian',
    label: 'Southeast Asian',
    items: ['Laotian', 'Timorese']
  },
  {
    id: 'china-regional',
    label: 'China (Regional)',
    items: [
      'Sichuan', 'Shanghainese', 'Cantonese', 'Hunan', 'Hokkien',
      'Teochew', 'Hainanese', 'Hakka', 'Northeastern', 'Northwestern'
    ]
  },
  {
    id: 'south-asian',
    label: 'South Asian Specialists',
    items: ['Bengali', 'Gujarati', 'Goan', 'Nepalese', 'Tibetan']
  },
  {
    id: 'european',
    label: 'European',
    items: [
      'Mediterranean', 'Italian', 'Spanish', 'Greek', 'French', 'British',
      'German', 'Austrian', 'Swiss', 'Portuguese', 'Russian', 'Ukrainian',
      'Polish', 'Scandinavian', 'Belgian', 'Dutch', 'Irish'
    ]
  },
  {
    id: 'middle-eastern',
    label: 'Middle Eastern & Central Asian',
    items: [
      'Lebanese', 'Turkish', 'Persian', 'Moroccan', 'Egyptian',
      'Jordanian', 'Israeli', 'Afghan', 'Uzbek', 'Georgian'
    ]
  },
  {
    id: 'americas',
    label: 'Americas',
    items: ['Peruvian', 'Argentinian', 'Cuban', 'Jamaican']
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
