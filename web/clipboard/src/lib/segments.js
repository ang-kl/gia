// The 11 drawer segments (10 time-bound + Whole Day anchor).
//
// Keys MATCH the server-side VALID_SEGMENTS list in clipboard-store.js.
// Display labels live in i18n.js; this module owns only the time-range
// hint string + the super-group classification (used for the left-border
// accent colour on each drawer row).

// v0.62.431 — timeEN strings match the operator's itinerary-segment spec verbatim
// (AM/PM on both ends; Whole Day = "Anytime"). Shown in the Add-drawer picker and
// as the drawer's description timing.
export const SEGMENTS = [
  { key: 'dayBreak',    emoji: '🌄', group: 'morning', timeEN: '5:00 AM – 7:30 AM' },
  { key: 'breakfast',   emoji: '🍳', group: 'morning', timeEN: '7:30 AM – 9:30 AM' },
  { key: 'brunch',      emoji: '☕', group: 'midday',  timeEN: '10:30 AM – 12:00 PM' },
  { key: 'lunch',       emoji: '🥡', group: 'midday',  timeEN: '12:00 PM – 1:30 PM' },
  { key: 'lateLunch',   emoji: '🥢', group: 'midday',  timeEN: '1:30 PM – 3:00 PM' },
  { key: 'teaBreak',    emoji: '🍰', group: 'evening', timeEN: '3:00 PM – 5:00 PM' },
  { key: 'earlyDinner', emoji: '🍲', group: 'evening', timeEN: '5:00 PM – 7:30 PM' },
  { key: 'dinner',      emoji: '🍷', group: 'evening', timeEN: '7:30 PM – 9:00 PM' },
  { key: 'supper',      emoji: '🍜', group: 'night',   timeEN: '9:00 PM – 11:00 PM' },
  { key: 'nightSnack',  emoji: '🌃', group: 'night',   timeEN: '11:00 PM – 2:00 AM' },
  { key: 'wholeDay',    emoji: '⏰', group: 'night',   timeEN: 'Anytime' }
];

export const SEGMENT_BY_KEY = Object.fromEntries(SEGMENTS.map((s) => [s.key, s]));

export const GROUP_CLASS = {
  morning: 'slot-m',
  midday:  'slot-l',
  evening: 'slot-e',
  night:   'slot-n'
};
