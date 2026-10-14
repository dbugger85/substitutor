// Match logic with no DOM code, so it can be tested with `npm test`.
//
// All times are "match time" in milliseconds: time the match clock has been
// running, not counting pauses. It is derived from Date.now() timestamps, so
// it stays correct when the phone locks or the page is reloaded.

export function newId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const onPitch = (status) => status === 'field' || status === 'gk';

export function createMatch(players, { fieldSize, intervalMin, perSub, gkId, starterIds, usePositions, positions = [], posIds = [] }, now = Date.now()) {
  const intervalMs = Math.round(intervalMin * 60000);
  const spots = fieldSize - 1;
  const ids = usePositions ? assignSpots(starterIds, posIds, spots) : [];
  const match = {
    v: 1,
    settings: { fieldSize, intervalMs, perSub },
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.id === gkId ? 'gk' : starterIds.includes(p.id) ? 'field' : 'bench',
      fieldMs: 0,
      benchMs: 0,
      since: 0,
      ...(usePositions && { pos: ids.includes(p.id) ? ids.indexOf(p.id) : null }),
    })),
    clockMs: 0,
    runningSince: now,
    nextSubAt: intervalMs,
  };
  if (usePositions) match.settings.positions = Array.from({ length: spots }, (_, i) => positions[i]?.trim() || `Position ${i + 1}`);
  return match;
}

export function elapsed(match, now = Date.now()) {
  return match.clockMs + (match.runningSince != null ? now - match.runningSince : 0);
}

export function isRunning(match) {
  return match.runningSince != null;
}

export function pause(match, now = Date.now()) {
  if (match.runningSince == null) return;
  match.clockMs += now - match.runningSince;
  match.runningSince = null;
}

export function resume(match, now = Date.now()) {
  if (match.runningSince == null) match.runningSince = now;
}

export function scheduleNext(match, now = Date.now()) {
  match.nextSubAt = elapsed(match, now) + match.settings.intervalMs;
}

export function fieldTime(p, t) {
  return p.fieldMs + (onPitch(p.status) ? t - p.since : 0);
}

export function benchTime(p, t) {
  return p.benchMs + (p.status === 'bench' ? t - p.since : 0);
}

// Move a player to a new status, first adding the time spent in the old one.
export function setStatus(p, status, t) {
  if (onPitch(p.status)) p.fieldMs += t - p.since;
  else if (p.status === 'bench') p.benchMs += t - p.since;
  p.status = status;
  p.since = t;
}

// Substitutions rotate: whoever has been on the field longest since they last
// came on goes off, and whoever has waited longest on the bench comes on. A
// smaller `since` means a longer spell. Total time only breaks ties, so a
// player who was goalkeeper for a long time isn't taken off again and again.

// Outfield players on the field, best candidate to come off first:
// longest current spell, then most total playing time, then roster order.
export function rankOff(players, t) {
  return players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.status === 'field')
    .sort((a, b) => a.p.since - b.p.since || fieldTime(b.p, t) - fieldTime(a.p, t) || a.i - b.i)
    .map(({ p }) => p);
}

// Bench players, best candidate to come on first:
// waited longest, then least total playing time, then roster order.
export function rankOn(players, t) {
  return players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.status === 'bench')
    .sort((a, b) => a.p.since - b.p.since || fieldTime(a.p, t) - fieldTime(b.p, t) || a.i - b.i)
    .map(({ p }) => p);
}

// Suggested swaps: [{ offId, onId }]. Empty if nobody can be swapped.
export function pickSubstitution(players, perSub, t) {
  const off = rankOff(players, t);
  const on = rankOn(players, t);
  const k = Math.max(0, Math.min(perSub, off.length, on.length));
  return Array.from({ length: k }, (_, i) => ({ offId: off[i].id, onId: on[i].id }));
}

// Apply swaps. A goalkeeper who comes off is replaced as goalkeeper.
// The player with id `injuredId` goes out of the match instead of to the bench.
export function applySwaps(match, pairs, t, injuredId = null) {
  const byId = (id) => match.players.find((p) => p.id === id);
  for (const { offId, onId } of pairs) {
    const off = byId(offId);
    const on = byId(onId);
    if (!off || !on || !onPitch(off.status) || on.status !== 'bench') {
      throw new Error('Invalid swap');
    }
    const role = off.status;
    setStatus(off, off.id === injuredId ? 'out' : 'bench', t);
    setStatus(on, role, t);
    if (match.settings.positions) on.pos = off.pos ?? null; // takes the spot of who went off
  }
  fillSpots(match);
}

// Make a field or bench player the goalkeeper. The old goalkeeper takes
// their place (field or bench).
export function makeGoalkeeper(match, id, t) {
  const p = match.players.find((x) => x.id === id);
  const oldGk = match.players.find((x) => x.status === 'gk');
  const place = p.status;
  if (oldGk) setStatus(oldGk, place, t);
  setStatus(p, 'gk', t);
  if (match.settings.positions && oldGk) oldGk.pos = place === 'field' ? p.pos ?? null : null; // the old goalkeeper takes their spot
  fillSpots(match);
}

export function addPlayer(match, { id, name }, t) {
  match.players.push({ id, name, status: 'bench', fieldMs: 0, benchMs: 0, since: t });
}

// ---------- positions (only when match.settings.positions is set) ----------
// Each outfield player on the field has `pos`, an index into settings.positions.
// Everyone else has pos null, and `lastPos`: the spot they last played, or 'gk'.
// lastPos is shown on the bench.

// Which starter plays in each of `count` spots: keeps the earlier choices
// (`previous`, ids by spot) for players who still start, then fills the empty
// spots with the other starters in order.
export function assignSpots(starterIds, previous, count) {
  const spots = Array.from({ length: count }, (_, i) => (starterIds.includes(previous[i]) ? previous[i] : null));
  const rest = starterIds.filter((id) => !spots.includes(id));
  return spots.map((id) => id ?? rest.shift() ?? null);
}

// Moves the spot of anyone no longer on the field as an outfield player to
// lastPos, and gives field players without a spot the first free one. Safe to
// call after any change.
export function fillSpots(match) {
  const names = match.settings.positions;
  if (!names) return;
  for (const p of match.players) {
    if (p.status === 'gk') p.lastPos = 'gk';
    else if (p.status !== 'field' && p.pos != null) p.lastPos = p.pos;
    if (p.status !== 'field') p.pos = null;
  }
  const taken = new Set();
  for (const p of match.players) {
    if (p.status !== 'field' || p.pos == null) continue;
    if (taken.has(p.pos) || p.pos >= names.length) p.pos = null;
    else taken.add(p.pos);
  }
  for (const p of match.players) {
    if (p.status !== 'field' || p.pos != null) continue;
    const free = names.findIndex((_, i) => !taken.has(i));
    if (free < 0) break;
    p.pos = free;
    taken.add(free);
  }
}

// Two players on the field swap places. If one of them is the goalkeeper,
// the other goes in goal and the goalkeeper takes their spot.
export function swapPositions(match, aId, bId, t) {
  const a = match.players.find((p) => p.id === aId);
  const b = match.players.find((p) => p.id === bId);
  if (a.status === 'gk') return makeGoalkeeper(match, bId, t);
  if (b.status === 'gk') return makeGoalkeeper(match, aId, t);
  [a.pos, b.pos] = [b.pos, a.pos];
}

// ---------- field view ----------
// Where the markers sit on the field picture: x and y are fractions of the
// field's width and height, with our own goal at the bottom.

// Outfield spots in rows of up to three, from the back (near our goal) to the front.
export function defaultLayout(count) {
  const rowCount = Math.ceil(count / 3);
  const spots = [];
  for (let r = 0; r < rowCount; r++) {
    const inRow = Math.floor(count / rowCount) + (r < count % rowCount ? 1 : 0);
    const y = rowCount === 1 ? 0.45 : Math.round((0.68 - (r * 0.5) / (rowCount - 1)) * 1000) / 1000;
    for (let j = 0; j < inRow; j++) spots.push({ x: (j + 1) / (inRow + 1), y });
  }
  return { gk: { x: 0.5, y: 0.88 }, spots };
}

// Guesses where each position goes from its name, in English or Norwegian,
// for the sport chosen for the field view:
// how far forward ("back", "midtbane", "spiss"...) and which side ("left",
// "høyre"...). Abbreviations like LB, CM, ST, VB, HK work too. A name that
// says nothing goes in the middle; if no name says anything, it's the plain
// rows from defaultLayout. Players in the same row that would land on the same
// spot are spread out across it.
const ROW = { back: 0.68, dm: 0.56, mid: 0.43, am: 0.32, wing: 0.32, front: 0.18 };
const SIDE = { left: 0.25, centre: 0.5, right: 0.75 };
// Checked in order, so "midtstopper" is a defender and "wingback" a back.
const DEPTH_WORDS = [
  ['dm', ['defensivmid', 'defensivemid', 'holding', 'anker']],
  ['am', ['attackingmid', 'offensivmid', 'offensivemid', 'playmaker']],
  ['back', ['back', 'defen', 'forsvar', 'stopper', 'sweeper', 'libero', 'bak']],
  ['front', ['spiss', 'striker', 'forward', 'angrep', 'angrip', 'attack', 'topp', 'front', 'fremme', 'framme']],
  ['wing', ['wing', 'ving', 'kant']],
  ['mid', ['mid', 'indre', 'inner', 'sentral', 'central']],
];
const SIDE_WORDS = [['left', ['left', 'venstre', 'vanster']], ['right', ['right', 'hoyre', 'hogre', 'hoger']]];
// Short codes, on their own or after a side letter (L/V left, R/H right, C centre): LB, VK, HS, RWB...
const CODES = {
  b: 'back', d: 'back', cb: 'back', fb: 'back', wb: 'back', df: 'back', ms: 'back', sw: 'back',
  m: 'mid', cm: 'mid', mf: 'mid', mb: 'mid', sm: 'mid', im: 'mid', dm: 'dm', cdm: 'dm', am: 'am', cam: 'am', om: 'am',
  w: 'wing', k: 'wing', v: 'wing', f: 'front', fw: 'front', cf: 'front', st: 'front', s: 'front', sp: 'front', ss: 'front', a: 'front',
};
const SIDE_LETTERS = { l: 'left', v: 'left', r: 'right', h: 'right', c: 'centre' };
// Words and codes that mean something else in another sport, checked before
// the ones above. In handball a "back" plays in the middle and the wings and
// the pivot ("strek") up front; in ice hockey the centre and wings are forwards.
const SPORT_WORDS = {
  futsal: [['back', ['fixo', 'fixe']], ['wing', ['ala']], ['front', ['pivot', 'pivo']]],
  handball: [['front', ['strek', 'linje', 'pivot', 'line', 'circle', 'sirkel', 'floy', 'wing', 'ving', 'kant']], ['mid', ['back', 'playmaker', 'midt', 'centre', 'center', 'senter']]],
  bandy: [['dm', ['halv', 'half']]],
  icehockey: [['front', ['center', 'centre', 'senter', 'forward', 'wing', 'ving', 'kant', 'angrep']], ['back', ['back', 'defen', 'forsvar']]],
  floorball: [['front', ['forward', 'wing', 'ving', 'kant', 'angrep']], ['mid', ['center', 'centre', 'senter']]],
};
const SPORT_CODES = {
  handball: { b: 'mid', cb: 'mid', pm: 'mid', w: 'front', p: 'front', pv: 'front' },
  icehockey: { c: 'front', w: 'front', f: 'front', d: 'back', b: 'back' },
  floorball: { c: 'mid', w: 'front', f: 'front', d: 'back', b: 'back' },
};

export function guessPlace(name, sport = 'football') {
  const text = String(name ?? '').toLowerCase()
    .replace(/[øö]/g, 'o').replace(/[åä]/g, 'a').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const joined = text.replace(/[^a-z]/g, '');
  const depthWords = [...(SPORT_WORDS[sport] ?? []), ...DEPTH_WORDS];
  const own = SPORT_CODES[sport] ?? {};
  const codes = { ...CODES, ...own };
  let depth = depthWords.find(([, words]) => words.some((w) => joined.includes(w)))?.[0] ?? null;
  let side = SIDE_WORDS.find(([, words]) => words.some((w) => joined.includes(w)))?.[0] ?? null;
  for (const t of text.split(/[^a-z]+/).filter((t) => t && t.length <= 3)) {
    if (own[t]) depth ??= own[t]; // "C" is a centre forward in ice hockey
    else if (t.length === 1 && SIDE_LETTERS[t]) side ??= SIDE_LETTERS[t]; // "V back", "H. kant"
    else if (codes[t]) depth ??= codes[t];
    else if (SIDE_LETTERS[t[0]] && codes[t.slice(1)]) {
      side ??= SIDE_LETTERS[t[0]];
      depth ??= codes[t.slice(1)];
    }
  }
  return { depth, side };
}

export function guessLayout(names, sport) {
  const guesses = names.map((n) => guessPlace(n, sport));
  if (!guesses.some((g) => g.depth || g.side)) return defaultLayout(names.length);
  const spots = guesses.map((g) => ({ x: SIDE[g.side ?? 'centre'], y: ROW[g.depth ?? 'mid'] }));
  for (const y of new Set(spots.map((s) => s.y))) {
    const row = spots.filter((s) => s.y === y).sort((a, b) => a.x - b.x);
    if (new Set(row.map((s) => s.x)).size < row.length) row.forEach((s, j) => (s.x = Math.round(((j + 1) / (row.length + 1)) * 1000) / 1000));
  }
  return { gk: { x: 0.5, y: 0.88 }, spots };
}

// The coach's saved layout, with a guess for anything not placed yet. A saved
// spot only counts while the position still has the name it had when it was
// dragged, so renaming a position gets it a fresh guess.
export function layoutFor(saved, names, sport) {
  const guess = guessLayout(names, sport);
  return {
    gk: saved?.gk ?? guess.gk,
    spots: guess.spots.map((g, i) => {
      const s = saved?.spots?.[i];
      return s && s.name === names[i] ? { x: s.x, y: s.y } : g;
    }),
  };
}

// Remembers where the coach dragged one position (key is 'gk' or its number).
export function placeSpot(saved, names, key, place) {
  const layout = { gk: saved?.gk, spots: [...(saved?.spots ?? [])] };
  if (key === 'gk') layout.gk = place;
  else layout.spots[key] = { ...place, name: names[key] };
  return layout;
}

// ---------- changing settings during a match ----------

// Takes effect from the next substitution; the running countdown is left alone.
export function setIntervalMin(match, minutes) {
  match.settings.intervalMs = Math.round(minutes * 60000);
}

// Switching positions on gives everyone on the field a spot straight away.
// Switching them off only hides them: players keep their pos, so switching
// back on puts them where they were (fillSpots tidies up anyone who moved).
export function setPositions(match, on, names = []) {
  if (!on) return void delete match.settings.positions;
  if (match.settings.positions) return;
  const spots = match.settings.fieldSize - 1;
  match.settings.positions = Array.from({ length: spots }, (_, i) => names[i]?.trim() || `Position ${i + 1}`);
  fillSpots(match);
}

export function renamePosition(match, i, name) {
  match.settings.positions[i] = name.trim() || `Position ${i + 1}`;
}

export const positionName = (match, p) => (p.pos != null ? match.settings.positions?.[p.pos] : null) ?? null;

export function lastPositionName(match, p) {
  if (!match.settings.positions || p.lastPos == null) return null;
  return p.lastPos === 'gk' ? 'GK' : match.settings.positions[p.lastPos] ?? null;
}

// Minutes each player got in a match, to suggest who starts the next one.
export function minutesPlayed(match, t) {
  return Object.fromEntries(match.players.map((p) => [p.id, fieldTime(p, t)]));
}

// Suggested starters (besides the goalkeeper) for the next match: the players
// who played least last match, then roster order. Players who weren't in last
// match count as 0 minutes.
export function suggestStarters(players, lastMinutes, gkId, count) {
  return players
    .map((p, i) => ({ p, i, ms: lastMinutes[p.id] ?? 0 }))
    .filter(({ p }) => p.id !== gkId)
    .sort((a, b) => a.ms - b.ms || a.i - b.i)
    .slice(0, Math.max(0, count))
    .map(({ p }) => p.id);
}
