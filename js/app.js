// Screens, buttons and popups. The match rules live in match.js.

import { loadTeam, saveTeam, loadMatch, saveMatch, clearMatch } from './storage.js';
import * as M from './match.js';
import { unlockAudio, startAlarm, stopAlarm, keepScreenOn, releaseScreen } from './alerts.js';

const $ = (id) => document.getElementById(id);

const team = loadTeam();
let match = loadMatch();
let swap = null; // open swap popup: { mode: 'scheduled' | 'adhoc', rows: [{ offId, onId }], injuredId }

// ---------- helpers ----------

function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) e.addEventListener(key.slice(2), value);
    else if (key === 'class') e.className = value;
    else if (value === true) e.setAttribute(key, '');
    else if (value !== false && value != null) e.setAttribute(key, value);
  }
  e.append(...[].concat(children));
  return e;
}

function fmt(ms, round = Math.floor) {
  const s = Math.max(0, round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `screen-${name}`;
  window.scrollTo(0, 0);
}

function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 4000);
}

const player = (id) => match.players.find((p) => p.id === id);
const now = () => M.elapsed(match);

// ---------- screen 1: team ----------

function renderTeam() {
  $('team-list').replaceChildren(
    ...team.players.map((p) =>
      el('li', {}, [
        el('span', {}, p.name),
        el('button', {
          type: 'button',
          class: 'icon',
          'aria-label': `Remove ${p.name}`,
          onclick: () => {
            team.players = team.players.filter((x) => x.id !== p.id);
            saveTeam(team);
            renderTeam();
          },
        }, '✕'),
      ]),
    ),
  );
  $('team-empty').hidden = team.players.length > 0;
  $('to-setup').disabled = team.players.length < 2;
}

$('add-player-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('new-player-name');
  const name = input.value.trim();
  if (!name) return;
  team.players.push({ id: M.newId(), name });
  saveTeam(team);
  input.value = '';
  input.focus();
  renderTeam();
});

$('to-setup').addEventListener('click', () => {
  renderSetup();
  show('setup');
});

// ---------- screen 2: match setup ----------

function setupError() {
  const s = team.settings;
  const n = team.players.length;
  const fs = s.fieldSize;
  if (!Number.isInteger(fs) || fs < 2) return 'Enter how many players are on the field.';
  if (fs > n) return `You only have ${n} players in the team.`;
  if (!s.gkId) return 'Choose a goalkeeper.';
  if (s.starterIds.length !== fs - 1) return `Pick ${fs - 1} starting players besides the goalkeeper.`;
  if (!(s.intervalMin > 0)) return 'Enter the minutes between substitutions.';
  const maxSub = Math.min(fs - 1, n - fs);
  if (maxSub > 0 && !(Number.isInteger(s.perSub) && s.perSub >= 1 && s.perSub <= maxSub)) {
    return `Players per substitution must be between 1 and ${maxSub}.`;
  }
  return '';
}

function renderSetup() {
  const s = team.settings;
  const ids = new Set(team.players.map((p) => p.id));
  if (!ids.has(s.gkId)) s.gkId = null;
  s.starterIds = s.starterIds.filter((id) => ids.has(id) && id !== s.gkId);

  $('field-size').value = s.fieldSize ?? '';
  $('interval').value = s.intervalMin ?? '';
  $('per-sub').value = s.perSub ?? '';

  $('gk-list').replaceChildren(
    ...team.players.map((p) =>
      el('label', {}, [
        el('input', {
          type: 'radio',
          name: 'gk',
          checked: p.id === s.gkId,
          onchange: () => {
            s.gkId = p.id;
            renderSetup();
          },
        }),
        p.name,
      ]),
    ),
  );
  renderStarters();
}

function renderStarters() {
  const s = team.settings;
  const needed = Math.max(0, (s.fieldSize || 0) - 1);
  const full = s.starterIds.length >= needed;
  $('starter-list').replaceChildren(
    ...team.players
      .filter((p) => p.id !== s.gkId)
      .map((p) => {
        const checked = s.starterIds.includes(p.id);
        return el('label', { class: !checked && full ? 'disabled' : '' }, [
          el('input', {
            type: 'checkbox',
            checked,
            disabled: !checked && full,
            onchange: (e) => {
              s.starterIds = e.target.checked
                ? [...s.starterIds, p.id]
                : s.starterIds.filter((id) => id !== p.id);
              renderStarters();
            },
          }),
          p.name,
        ]);
      }),
  );
  $('starter-count').textContent = `(${s.starterIds.length} of ${needed})`;
  updateSetupStatus();
}

function updateSetupStatus() {
  const s = team.settings;
  const maxSub = Math.min((s.fieldSize || 0) - 1, team.players.length - (s.fieldSize || 0));
  $('per-sub').disabled = maxSub <= 0;
  if (maxSub > 0) $('per-sub').max = maxSub;
  const error = setupError();
  $('setup-error').textContent = error;
  $('start-match').disabled = !!error;
  saveTeam(team);
}

$('field-size').addEventListener('input', (e) => {
  team.settings.fieldSize = parseInt(e.target.value, 10);
  renderStarters();
});
$('interval').addEventListener('input', (e) => {
  team.settings.intervalMin = parseFloat(e.target.value);
  updateSetupStatus();
});
$('per-sub').addEventListener('input', (e) => {
  team.settings.perSub = parseInt(e.target.value, 10);
  updateSetupStatus();
});

$('setup-back').addEventListener('click', () => {
  renderTeam();
  show('team');
});

$('start-match').addEventListener('click', () => {
  if (setupError()) return;
  unlockAudio();
  match = M.createMatch(team.players, team.settings);
  saveMatch(match);
  keepScreenOn();
  renderMatch();
  show('match');
});

// ---------- screen 3: match ----------

function playerRow(p) {
  return el('li', { class: `player ${p.status}` }, [
    el('button', { type: 'button', onclick: () => openActions(p.id) }, [
      el('span', { class: 'name' }, [p.name, ...(p.status === 'gk' ? [el('span', { class: 'badge gk' }, 'GK')] : [])]),
      el('span', { class: 'mins', 'data-id': p.id }),
    ]),
  ]);
}

function renderMatch() {
  const t = now();
  const gk = match.players.filter((p) => p.status === 'gk');
  const field = match.players.filter((p) => p.status === 'field');
  const bench = M.rankOn(match.players, t);
  const out = match.players.filter((p) => p.status === 'out');

  $('field-list').replaceChildren(...[...gk, ...field].map(playerRow));
  $('bench-list').replaceChildren(...bench.map(playerRow));
  if (!bench.length) $('bench-list').replaceChildren();
  $('out-list').replaceChildren(...out.map(playerRow));
  $('out-section').hidden = !out.length;

  const onField = gk.length + field.length;
  const warning = !gk.length
    ? 'No goalkeeper. Tap a player and choose "Make goalkeeper".'
    : onField < match.settings.fieldSize
      ? `Only ${onField} of ${match.settings.fieldSize} players on the field.`
      : '';
  $('match-warning').textContent = warning;
  $('match-warning').hidden = !warning;

  updateClock();
}

// Runs twice a second: updates the clocks and opens the popup when it's time.
function updateClock() {
  if (!match) return;
  const t = now();
  const remaining = match.nextSubAt - t;
  const running = M.isRunning(match);

  $('countdown').textContent = fmt(remaining, Math.ceil);
  $('countdown').classList.toggle('due', remaining <= 0);
  $('match-time').textContent = fmt(t);
  $('paused-badge').hidden = running;
  $('pause').textContent = running ? 'Pause' : 'Resume';

  for (const span of document.querySelectorAll('.mins[data-id]')) {
    const p = player(span.dataset.id);
    if (p) span.textContent = fmt(M.fieldTime(p, t));
  }

  if (remaining <= 0 && running && !swap && !$('action-dialog').open) substitutionDue();
}

function substitutionDue() {
  const pairs = M.pickSubstitution(match.players, match.settings.perSub, now());
  if (!pairs.length) {
    M.scheduleNext(match);
    saveMatch(match);
    toast('Substitution time, but nobody is on the bench.');
    return;
  }
  openSwap('scheduled', pairs);
  startAlarm();
}

function change(fn) {
  fn();
  saveMatch(match);
  renderMatch();
}

$('pause').addEventListener('click', () => change(() => (M.isRunning(match) ? M.pause(match) : M.resume(match))));

$('swap-now').addEventListener('click', () => {
  const pairs = M.pickSubstitution(match.players, 1, now());
  if (!pairs.length) return toast('Nobody on the bench to swap with.');
  openSwap('adhoc', pairs);
});

$('add-late').addEventListener('click', () => {
  const name = prompt('Name of the new player')?.trim();
  if (!name) return;
  const p = { id: M.newId(), name };
  team.players.push(p);
  saveTeam(team);
  change(() => M.addPlayer(match, p, now()));
  toast(`${name} is on the bench and will come on at the next substitution.`);
});

$('end-match').addEventListener('click', () => {
  if (!confirm('End the match?')) return;
  const t = now();
  $('summary-time').textContent = fmt(t);
  $('summary-list').replaceChildren(
    ...[...match.players]
      .sort((a, b) => M.fieldTime(b, t) - M.fieldTime(a, t))
      .map((p) => el('li', {}, [el('span', {}, p.name), el('span', { class: 'mins' }, fmt(M.fieldTime(p, t)))])),
  );
  clearMatch();
  match = null;
  stopAlarm();
  releaseScreen();
  $('summary-dialog').showModal();
});

$('summary-close').addEventListener('click', () => $('summary-dialog').close());
$('summary-dialog').addEventListener('close', () => {
  renderTeam();
  show('team');
});

// ---------- player options popup ----------

function openActions(id) {
  const t = now();
  const p = player(id);
  const bench = M.rankOn(match.players, t);
  const off = M.rankOff(match.players, t);
  const onField = match.players.filter((x) => M.onPitch(x.status)).length;
  const items = [];
  const action = (label, fn, cls = '') =>
    items.push(el('button', { type: 'button', class: cls, onclick: () => { $('action-dialog').close(); fn(); } }, label));

  if (M.onPitch(p.status)) {
    if (bench.length) action('Substitute now', () => openSwap('adhoc', [{ offId: id, onId: bench[0].id }]));
    action('Injured – take off', () =>
      bench.length
        ? openSwap('adhoc', [{ offId: id, onId: bench[0].id }], id)
        : change(() => M.setStatus(p, 'out', t)),
    );
    if (p.status === 'field') action('Make goalkeeper', () => change(() => M.makeGoalkeeper(match, id, t)));
  } else if (p.status === 'bench') {
    if (onField < match.settings.fieldSize) action('Put on the field', () => change(() => M.setStatus(p, 'field', t)));
    if (off.length) action('Bring on now', () => openSwap('adhoc', [{ offId: off[0].id, onId: id }]));
    action('Make goalkeeper', () => change(() => M.makeGoalkeeper(match, id, t)));
    action('Remove from match', () => change(() => M.setStatus(p, 'out', t)));
  } else {
    action('Back to bench', () => change(() => M.setStatus(p, 'bench', t)));
  }
  action('Cancel', () => {});

  $('action-title').textContent = p.name;
  $('action-list').replaceChildren(...items);
  $('action-dialog').showModal();
}

// ---------- swap popup ----------

function openSwap(mode, rows, injuredId = null) {
  swap = { mode, rows: rows.map((r) => ({ ...r })), injuredId };
  $('swap-title').textContent =
    mode === 'scheduled' ? 'Substitution time!' : injuredId ? 'Injury – swap player' : 'Swap players';
  $('swap-confirm').textContent = mode === 'scheduled' ? 'Done – restart timer' : 'Swap';
  $('swap-skip').hidden = mode !== 'scheduled';
  $('swap-cancel').hidden = mode === 'scheduled';
  renderSwap();
  $('swap-dialog').showModal();
}

function playerSelect(players, value, onchange, t) {
  return el(
    'select',
    { onchange: (e) => onchange(e.target.value) },
    players.map((p) =>
      el('option', { value: p.id, selected: p.id === value }, `${p.name}${p.status === 'gk' ? ' (GK)' : ''} – ${fmt(M.fieldTime(p, t))}`),
    ),
  );
}

function nextFreePair(t) {
  const usedOff = new Set(swap.rows.map((r) => r.offId));
  const usedOn = new Set(swap.rows.map((r) => r.onId));
  const off = M.rankOff(match.players, t).find((p) => !usedOff.has(p.id));
  const on = M.rankOn(match.players, t).find((p) => !usedOn.has(p.id));
  return off && on ? { offId: off.id, onId: on.id } : null;
}

function renderSwap() {
  const t = now();
  // The goalkeeper is only offered for swaps you start yourself.
  const offOptions = match.players
    .filter((p) => p.status === 'field' || (p.status === 'gk' && swap.mode === 'adhoc'))
    .sort((a, b) => M.fieldTime(b, t) - M.fieldTime(a, t));
  const onOptions = M.rankOn(match.players, t);

  const rows = swap.rows.map((row, i) => {
    const locked = row.offId === swap.injuredId;
    const offSelect = playerSelect(offOptions, row.offId, (v) => (row.offId = v), t);
    offSelect.disabled = locked;
    return el('div', { class: 'swap-row' }, [
      el('div', { class: 'pick' }, [
        el('label', {}, [el('span', { class: 'tag off' }, 'OFF'), offSelect]),
        el('label', {}, [el('span', { class: 'tag on' }, 'ON'), playerSelect(onOptions, row.onId, (v) => (row.onId = v), t)]),
      ]),
      locked
        ? el('span')
        : el('button', {
            type: 'button',
            class: 'icon',
            'aria-label': 'Remove this swap',
            onclick: () => {
              swap.rows.splice(i, 1);
              renderSwap();
            },
          }, '✕'),
    ]);
  });
  $('swap-rows').replaceChildren(...(rows.length ? rows : [el('p', { class: 'muted' }, 'No swaps.')]));
  $('swap-add').hidden = !nextFreePair(t);
  $('swap-error').textContent = '';
}

function closeSwap() {
  stopAlarm();
  swap = null;
  $('swap-dialog').close();
  saveMatch(match);
  renderMatch();
}

$('swap-add').addEventListener('click', () => {
  const pair = nextFreePair(now());
  if (pair) swap.rows.push(pair);
  renderSwap();
});

$('swap-confirm').addEventListener('click', () => {
  const offs = swap.rows.map((r) => r.offId);
  const ons = swap.rows.map((r) => r.onId);
  if (new Set(offs).size !== offs.length || new Set(ons).size !== ons.length) {
    $('swap-error').textContent = 'Each player can only be picked once.';
    return;
  }
  M.applySwaps(match, swap.rows, now(), swap.injuredId);
  if (swap.mode === 'scheduled') M.scheduleNext(match);
  closeSwap();
});

$('swap-skip').addEventListener('click', () => {
  M.scheduleNext(match);
  closeSwap();
});

$('swap-cancel').addEventListener('click', closeSwap);

// Escape / back button: close a swap you started yourself, but a scheduled
// substitution has to be answered with Done or Skip.
$('swap-dialog').addEventListener('cancel', (e) => {
  e.preventDefault();
  if (swap?.mode === 'adhoc') closeSwap();
});

// ---------- start ----------

document.addEventListener('pointerdown', unlockAudio);
document.addEventListener('click', unlockAudio);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && match) {
    keepScreenOn();
    updateClock();
  }
});
setInterval(updateClock, 500);

if (match) {
  renderMatch();
  show('match');
  keepScreenOn();
} else {
  renderTeam();
  show('team');
}
