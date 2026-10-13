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

export function swapPositions(match, aId, bId) {
  const a = match.players.find((p) => p.id === aId);
  const b = match.players.find((p) => p.id === bId);
  [a.pos, b.pos] = [b.pos, a.pos];
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
