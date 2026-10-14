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
