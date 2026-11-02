// The field view's sports and colours. No DOM code.
//
// Every sport is drawn in the same 200 × 260 box (the field view's shape),
// with the team attacking upwards: simple lines only, not to scale. Keeping
// one shape means the positions stay where the coach put them when the sport
// changes. Classes: "thick" for ice hockey's centre and blue lines, "dash"
// for handball's 9 m line, and "red"/"blue" for bandy's and ice hockey's
// coloured lines (coloured only on the ice colour; on any other colour they're
// the usual white, so they never clash). Listed in the order they're offered.

const OUTLINE = '<rect x="6" y="6" width="188" height="248" rx="6"/>';
const HALFWAY = '<line x1="6" y1="130" x2="194" y2="130"/>';

export const SPORTS = {
  football: {
    name: 'Football',
    color: 'green',
    lines: `${OUTLINE}${HALFWAY}<circle cx="100" cy="130" r="24"/>
      <rect x="56" y="6" width="88" height="36"/><rect x="56" y="218" width="88" height="36"/>`,
  },
  bandy: {
    name: 'Bandy',
    color: 'ice',
    lines: `${OUTLINE}<g class="red">${HALFWAY}<circle cx="100" cy="130" r="22"/>
      <path d="M58 6a42 42 0 0 0 84 0"/><path d="M58 254a42 42 0 0 1 84 0"/>
      <path d="M86 6a14 14 0 0 0 28 0"/><path d="M86 254a14 14 0 0 1 28 0"/></g>`,
  },
  handball: {
    name: 'Handball',
    color: 'blue',
    lines: `${OUTLINE}${HALFWAY}
      <path d="M46 6a40 40 0 0 0 40 40h28a40 40 0 0 0 40-40"/>
      <path d="M46 254a40 40 0 0 1 40-40h28a40 40 0 0 1 40 40"/>
      <path class="dash" d="M26 6a60 60 0 0 0 60 60h28a60 60 0 0 0 60-60"/>
      <path class="dash" d="M26 254a60 60 0 0 1 60-60h28a60 60 0 0 1 60 60"/>`,
  },
  icehockey: {
    name: 'Ice hockey',
    color: 'ice',
    lines: `<rect x="6" y="6" width="188" height="248" rx="40"/>
      <line class="thick red" x1="6" y1="130" x2="194" y2="130"/>
      <line class="thick blue" x1="6" y1="88" x2="194" y2="88"/><line class="thick blue" x1="6" y1="172" x2="194" y2="172"/>
      <circle class="blue" cx="100" cy="130" r="18"/>
      <line class="red" x1="14" y1="22" x2="186" y2="22"/><line class="red" x1="14" y1="238" x2="186" y2="238"/>
      <path class="red" d="M90 22a10 10 0 0 0 20 0"/><path class="red" d="M90 238a10 10 0 0 1 20 0"/>
      <circle class="red" cx="56" cy="52" r="15"/><circle class="red" cx="144" cy="52" r="15"/>
      <circle class="red" cx="56" cy="208" r="15"/><circle class="red" cx="144" cy="208" r="15"/>`,
  },
  floorball: {
    name: 'Floorball',
    color: 'blue',
    lines: `<rect x="6" y="6" width="188" height="248" rx="24"/>${HALFWAY}<circle cx="100" cy="130" r="2"/>
      <rect x="70" y="22" width="60" height="28"/><rect x="88" y="22" width="24" height="9"/>
      <rect x="70" y="210" width="60" height="28"/><rect x="88" y="229" width="24" height="9"/>`,
  },
  futsal: {
    name: 'Futsal',
    color: 'wood',
    lines: `${OUTLINE}${HALFWAY}<circle cx="100" cy="130" r="20"/>
      <path d="M56 6v14a24 24 0 0 0 24 24h40a24 24 0 0 0 24-24V6"/>
      <path d="M56 254v-14a24 24 0 0 1 24-24h40a24 24 0 0 1 24 24v14"/>`,
  },
};

// The colours are CSS variables in style.css ([data-pitch-color]), with a light and a dark version each.
export const COLORS = { green: 'Green', blue: 'Blue', ice: 'Ice', wood: 'Wood', red: 'Red', purple: 'Purple', grey: 'Grey' };

export const sportOf = (settings) => (SPORTS[settings?.sport] ? settings.sport : 'football');
export const colorOf = (settings) => (COLORS[settings?.pitchColor] ? settings.pitchColor : SPORTS[sportOf(settings)].color);

// Suggested position names (owner's wish 2026-11-02, so they needn't all be typed): a usual line-up for each
// number of outfield players, from the back to the front, for each sport. English here; the app translates
// them with tr(), and guessPlace() knows every word, so the field view puts them in the right place.
// Futsal and bandy use football's lists where they have none of their own. Handball, ice hockey and
// floorball only use their own ("back" and "centre" mean something else there), so other sizes get none.
const FOOTBALL = {
  1: ['Midfield'],
  2: ['Back', 'Forward'],
  3: ['Back', 'Midfield', 'Forward'],
  4: ['Left back', 'Right back', 'Left forward', 'Right forward'],
  5: ['Left back', 'Right back', 'Midfield', 'Left forward', 'Right forward'],
  6: ['Left back', 'Right back', 'Left wing', 'Centre midfield', 'Right wing', 'Striker'],
  7: ['Left back', 'Centre back', 'Right back', 'Left midfield', 'Centre midfield', 'Right midfield', 'Striker'],
  8: ['Left back', 'Centre back', 'Right back', 'Left midfield', 'Right midfield', 'Left wing', 'Striker', 'Right wing'],
  9: ['Left back', 'Left centre back', 'Right centre back', 'Right back', 'Left midfield', 'Right midfield', 'Left wing', 'Striker', 'Right wing'],
  10: ['Left back', 'Left centre back', 'Right centre back', 'Right back', 'Left midfield', 'Centre midfield', 'Right midfield', 'Left wing', 'Striker', 'Right wing'],
};
const POSITIONS = {
  football: FOOTBALL,
  futsal: { 4: ['Back', 'Left wing', 'Right wing', 'Pivot'] },
  handball: {
    4: ['Left back', 'Right back', 'Left wing', 'Right wing'],
    5: ['Left back', 'Centre back', 'Right back', 'Left wing', 'Right wing'],
    6: ['Left back', 'Centre back', 'Right back', 'Left wing', 'Pivot', 'Right wing'],
  },
  icehockey: {
    2: ['Defence', 'Centre'],
    3: ['Defence', 'Left wing', 'Right wing'],
    4: ['Left defence', 'Right defence', 'Left wing', 'Right wing'],
    5: ['Left defence', 'Right defence', 'Left wing', 'Centre', 'Right wing'],
  },
  floorball: {
    3: ['Defence', 'Left forward', 'Right forward'],
    4: ['Left defence', 'Right defence', 'Left forward', 'Right forward'],
    5: ['Left defence', 'Right defence', 'Left forward', 'Centre', 'Right forward'],
  },
};

const OWN_ONLY = new Set(['handball', 'icehockey', 'floorball']);
const listsFor = (sport) => [...Object.values(POSITIONS[sport] ?? {}), ...(OWN_ONLY.has(sport) ? [] : Object.values(FOOTBALL))];

export function defaultPositions(sport, n) {
  return [...(POSITIONS[sport]?.[n] ?? (OWN_ONLY.has(sport) ? null : FOOTBALL[n]) ?? [])];
}

// Every suggested name for a sport, for the dropdown on each position box (its own names first).
export function positionSuggestions(sport) {
  return [...new Set(listsFor(sport).flat())];
}

// True when the names are empty or one of the suggested line-ups (any sport, any size, in English or
// translated by `translate(name, sport)`), so a change of sport or team size may replace them with a fitting one.
export function isDefaultLineup(names, translate = (x) => x) {
  const clean = names.map((n) => String(n ?? '').trim());
  if (clean.every((n) => !n)) return true;
  const key = clean.join('|');
  return Object.keys(SPORTS).some((sport) => listsFor(sport).some((list) =>
    list.join('|') === key || list.map((n) => translate(n, sport)).join('|') === key));
}
