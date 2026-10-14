// Screens, buttons and popups. The match rules live in match.js.

import { loadTeam, saveTeam, loadMatch, saveMatch, clearMatch, loadTheme, saveTheme, loadInstallHidden, saveInstallHidden } from './storage.js';
import * as M from './match.js';
import { makeLink, readLink, hasShare } from './share.js';
import { SPORTS, COLORS, sportOf, colorOf } from './pitch.js';
import { unlockAudio, startAlarm, stopAlarm, keepScreenOn, releaseScreen } from './alerts.js';

const $ = (id) => document.getElementById(id);

let team = loadTeam();
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

// Our own popup instead of the browser's confirm() and prompt(). Resolves to true (or the typed text) for OK, or null.
// `value` fills the text box in advance.
function ask({ title, text = '', input = '', value = '', ok = 'OK', danger = false }) {
  const dlg = $('ask-dialog');
  const field = $('ask-input');
  $('ask-title').textContent = title;
  $('ask-text').textContent = text;
  $('ask-text').hidden = !text;
  field.hidden = !input;
  field.placeholder = input;
  field.value = value;
  $('ask-ok').textContent = ok;
  $('ask-ok').className = danger ? 'primary grow danger-fill' : 'primary grow';
  return new Promise((resolve) => {
    $('ask-form').onsubmit = (e) => {
      e.preventDefault();
      if (input && !field.value.trim()) return field.focus();
      dlg.onclose = null;
      dlg.close();
      resolve(input ? field.value : true);
    };
    $('ask-cancel').onclick = () => dlg.close();
    dlg.onclose = () => resolve(null);
    dlg.showModal();
    if (input) value ? field.select() : field.focus();
  });
}

function fmt(ms, round = Math.floor) {
  const s = Math.max(0, round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `screen-${name}`;
  window.scrollTo(0, 0);
  $('settings-btn').hidden = name !== 'match';
  $('match-pages').scrollLeft = 0; // the match screen opens on the list
  $('match-pages').style.height = '';
  setArranging(false);
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
        el('button', { type: 'button', class: 'rename', 'aria-label': `Rename ${p.name}`, onclick: () => renamePlayer(p.id) }, p.name),
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
  $('share-team').hidden = !team.players.length;
}

// Fix a misspelt name: in the team list and, during a match, in the player options.
async function renamePlayer(id) {
  const p = team.players.find((x) => x.id === id) ?? player(id);
  const name = (await ask({ title: 'Rename player', input: 'Player name', value: p.name, ok: 'Save' }))?.trim();
  if (!name || name === p.name) return;
  for (const x of [...team.players, ...(match?.players ?? [])]) if (x.id === id) x.name = name;
  saveTeam(team);
  if (match) {
    saveMatch(match);
    renderMatch();
  } else {
    renderTeam();
  }
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
  if (s.autoStarters && team.lastMinutes) {
    s.starterIds = M.suggestStarters(team.players, team.lastMinutes, s.gkId, needed);
  }
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
              s.autoStarters = false;
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
  renderStarterNote();
  renderPositions();
  updateSetupStatus();
}

// Explains the suggested starters, or offers to suggest them again.
function renderStarterNote() {
  const note = $('starter-note');
  note.hidden = !team.lastMinutes;
  if (team.settings.autoStarters) {
    note.replaceChildren('✓ Suggested: the players who played least last match start.');
  } else {
    note.replaceChildren(
      el('button', {
        type: 'button',
        class: 'link',
        onclick: () => {
          team.settings.autoStarters = true;
          renderStarters();
        },
      }, 'Suggest starters from last match'),
    );
  }
}

// Optional positions: a name for each outfield spot, and which starter plays there.
function renderPositions() {
  const s = team.settings;
  const needed = Math.max(0, (s.fieldSize || 0) - 1);
  s.posIds = M.assignSpots(s.starterIds, s.posIds, needed);
  $('use-positions').checked = s.usePositions;
  $('use-field-view').checked = s.fieldView;
  $('field-view-option').hidden = !s.usePositions;
  renderFieldStyle();
  if (!s.usePositions) return $('position-list').replaceChildren();
  const starters = team.players.filter((p) => s.starterIds.includes(p.id));
  $('position-list').replaceChildren(
    ...s.posIds.map((id, i) =>
      el('div', { class: 'pos-row' }, [
        el('input', {
          value: s.positions[i] ?? '',
          placeholder: `Position ${i + 1}`,
          'aria-label': `Name of position ${i + 1}`,
          autocomplete: 'off',
          enterkeyhint: 'done',
          oninput: (e) => {
            s.positions[i] = e.target.value;
            saveTeam(team);
          },
        }),
        playerPicker(starters, id, (v) => {
          // Picking someone who already has a spot swaps the two.
          const j = s.posIds.indexOf(v);
          if (j >= 0) s.posIds[j] = id;
          s.posIds[i] = v;
          renderPositions();
          saveTeam(team);
        }, null, `Who plays ${s.positions[i]?.trim() || `position ${i + 1}`}?`),
      ]),
    ),
  );
}

$('use-field-view').addEventListener('change', (e) => {
  team.settings.fieldView = e.target.checked;
  saveTeam(team);
  renderFieldStyle();
});

// The field view's sport (its lines, and what position names mean) and colour,
// in setup and in the cog popup: a dropdown and colour swatches. Picking a sport also picks its own colour
// (pitchColor null); picking a colour keeps it until the sport changes.
function renderFieldStyle() {
  const s = team.settings;
  const sport = sportOf(s);
  const color = colorOf(s);
  for (const [id, show] of [['field-style', s.usePositions && s.fieldView], ['set-field-style', match?.settings.positions && s.fieldView]]) {
    $(id).hidden = !show;
    $(id).replaceChildren(
      // The label, then the app's own dropdown filling the rest of the line (the player picker works for any list of names)
      el('div', { class: 'style-row' }, [
        el('span', { class: 'style-label' }, 'Sport'),
        playerPicker(Object.entries(SPORTS).map(([key, { name }]) => ({ id: key, name })), sport, (key) => setFieldStyle({ sport: key, pitchColor: null }), null, 'Sport'),
      ]),
      el('div', { class: 'style-label' }, 'Colour'),
      el('div', { class: 'swatches' }, Object.entries(COLORS).map(([key, name]) =>
        el('button', { type: 'button', class: 'swatch', 'data-pitch-color': key, 'aria-label': name, title: name, 'aria-pressed': String(key === color), onclick: () => setFieldStyle({ pitchColor: key }) }))),
    );
  }
}

function setFieldStyle(change) {
  Object.assign(team.settings, change);
  saveTeam(team);
  renderFieldStyle();
  if (match) renderMatch();
}

$('use-positions').addEventListener('change', (e) => {
  team.settings.usePositions = e.target.checked;
  renderPositions();
  saveTeam(team);
});

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

// Small tags after a name: GK, the position they play (green), or on the
// bench the position they last played (grey outline).
function tags(p) {
  if (!match) return [];
  if (p.status === 'gk') return [el('span', { class: 'badge gk' }, 'GK')];
  const pos = M.positionName(match, p);
  if (pos) return [el('span', { class: 'badge pos' }, pos)];
  const last = p.status === 'bench' && M.lastPositionName(match, p);
  return last ? [el('span', { class: 'badge last', title: 'Last played' }, last)] : [];
}

function playerRow(p) {
  return el('li', { class: `player ${p.status}` }, [
    el('button', { type: 'button', onclick: () => openActions(p.id) }, [
      el('span', { class: 'name' }, [p.name, ...tags(p)]),
      el('span', { class: 'stint', 'data-stint': p.id }),
      el('span', { class: 'mins', 'data-id': p.id }),
    ]),
  ]);
}

function renderMatch() {
  const t = now();
  const gk = match.players.filter((p) => p.status === 'gk');
  const field = match.players.filter((p) => p.status === 'field').sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99));
  const bench = M.rankOn(match.players, t);
  const out = match.players.filter((p) => p.status === 'out');

  $('field-list').replaceChildren(...[...gk, ...field].map(playerRow));
  $('bench-list').replaceChildren(...bench.map(playerRow));
  if (!bench.length) $('bench-list').replaceChildren();
  $('out-list').replaceChildren(...out.map(playerRow));
  $('out-section').hidden = !out.length;
  $('last-pos-hint').hidden = !match.settings.positions;

  const onField = gk.length + field.length;
  const warning = !gk.length
    ? 'No goalkeeper. Tap a player and choose "Make goalkeeper".'
    : onField < match.settings.fieldSize
      ? `Only ${onField} of ${match.settings.fieldSize} players on the field.`
      : '';
  $('match-warning').textContent = warning;
  $('match-warning').hidden = !warning;

  const fieldView = !!(match.settings.positions && team.settings.fieldView);
  $('field-page').hidden = !fieldView;
  $('page-dots').hidden = !fieldView;
  if (fieldView) renderField();
  else if ($('match-pages').scrollLeft) {
    // The field view was switched off while showing: back to the list
    $('match-pages').scrollLeft = 0;
    $('match-pages').style.height = '';
  }
  updateClock();
}

// ---------- field view ----------
// A picture of the field with each position and who plays there, and the bench
// below it. Swipe left from the list to see it. Press and hold a position to
// arrange them (they wiggle, like app icons on an iPhone) and drag them where you
// want; the places are saved in team.settings.layout.

const HOLD_MS = 450;
let arranging = false; // positions wiggle and can be dragged (like moving app icons on an iPhone)
let dragging = false; // a marker is being dragged: the tap that follows mustn't open the options

function renderField() {
  const names = match.settings.positions;
  const sport = sportOf(team.settings);
  const layout = M.layoutFor(team.settings.layout, names, sport);
  $('pitch-lines').innerHTML = SPORTS[sport].lines;
  $('field-page').dataset.pitchColor = colorOf(team.settings);
  const gk = match.players.find((p) => p.status === 'gk');
  const marker = (key, label, p, place) =>
    el('button', {
      type: 'button',
      class: `marker${key === 'gk' ? ' gk' : ''}${p ? '' : ' empty'}`,
      style: `left: ${place.x * 100}%; top: ${place.y * 100}%`,
      onclick: () => !arranging && !dragging && p && openActions(p.id),
      onpointerdown: (e) => markerDown(e, key),
      oncontextmenu: (e) => e.preventDefault(), // Android's long-press menu
    }, [el('span', { class: 'marker-pos' }, label), el('span', { class: 'marker-name' }, p ? p.name : '–')]);
  $('pitch-markers').replaceChildren(
    marker('gk', 'GK', gk, layout.gk),
    ...names.map((name, i) => marker(i, name, match.players.find((p) => p.status === 'field' && p.pos === i), layout.spots[i])),
  );

  $('field-bench').replaceChildren(
    ...M.rankOn(match.players, now()).map((p) => {
      const last = M.lastPositionName(match, p);
      return el('li', {}, [
        el('button', { type: 'button', onclick: () => openActions(p.id) }, [
          el('span', { class: 'bench-name' }, p.name),
          ...(last ? [el('span', { class: 'bench-last' }, last)] : []),
        ]),
      ]);
    }),
  );
}

function setArranging(on) {
  arranging = on;
  $('pitch').classList.toggle('arranging', on);
  $('match-pages').classList.toggle('locked', on); // no swiping to the list meanwhile
  $('field-done').hidden = !on;
  $('field-tip').textContent = on
    ? 'Drag the positions where you want them, then tap Done.'
    : 'Tip: press and hold a position to move it.';
}

// Press and hold a position to start arranging; while arranging, any position
// can be dragged straight away. Moving before the hold is up counts as a swipe,
// and a quick tap still opens the player options. key is 'gk' or the spot number.
function markerDown(e, key) {
  const m = e.currentTarget;
  if (arranging) return startDrag(e, m, key);
  const x0 = e.clientX;
  const y0 = e.clientY;
  const cancel = () => {
    clearTimeout(timer);
    m.onpointermove = m.onpointerup = m.onpointercancel = null;
  };
  const timer = setTimeout(() => {
    cancel();
    setArranging(true);
    navigator.vibrate?.(15);
    startDrag(e, m, key);
  }, HOLD_MS);
  m.onpointermove = (ev) => Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10 && cancel();
  m.onpointerup = m.onpointercancel = cancel;
}

function startDrag(e, m, key) {
  const clamp = (v) => Math.round(Math.min(0.94, Math.max(0.06, v)) * 1000) / 1000;
  let place = null;
  dragging = true;
  try {
    m.setPointerCapture(e.pointerId);
  } catch {} // the finger may already be gone
  m.classList.add('lifted');
  m.onpointermove = (ev) => {
    const box = $('pitch').getBoundingClientRect();
    place = { x: clamp((ev.clientX - box.left) / box.width), y: clamp((ev.clientY - box.top) / box.height) };
    m.style.left = `${place.x * 100}%`;
    m.style.top = `${place.y * 100}%`;
  };
  m.onpointerup = m.onpointercancel = () => {
    m.onpointermove = m.onpointerup = m.onpointercancel = null;
    m.classList.remove('lifted');
    setTimeout(() => (dragging = false)); // after the click that follows the release
    if (!place) return;
    team.settings.layout = M.placeSpot(team.settings.layout, match.settings.positions, key, place);
    saveTeam(team);
  };
}

// While dragging, the finger moves the position instead of scrolling the page.
$('pitch').addEventListener('touchmove', (e) => dragging && e.preventDefault(), { passive: false });
// Done, or a tap on an empty part of the field, stops arranging.
$('field-done').addEventListener('click', () => setArranging(false));
$('pitch').addEventListener('click', (e) => arranging && !e.target.closest('.marker, #field-done') && setArranging(false));

// The dots above the pages show which one is open, and can be tapped too.
// The pages sit side by side, so their box is as tall as the longer one (the
// list); on the field view it's cut to the field page, so the screen ends
// after the bench instead of scrolling on into empty space.
function fitPages() {
  const pages = $('match-pages');
  const i = Math.round(pages.scrollLeft / pages.clientWidth);
  $('page-dots').querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', i === j));
  pages.style.height = i === 1 ? `${$('field-page').offsetHeight}px` : '';
}
$('match-pages').addEventListener('scroll', fitPages);
new ResizeObserver(fitPages).observe($('field-page'));
$('page-dots').addEventListener('click', (e) => {
  const page = e.target.closest('button')?.dataset.page;
  if (page == null) return;
  setArranging(false);
  const pages = $('match-pages');
  pages.scrollTo({ left: page * pages.clientWidth, behavior: 'smooth' });
});

// ---------- match settings (the cog) ----------
// The setup settings that can safely change during a match. Changes apply at
// once and are also kept in team.settings for the next match. The number of
// players on the field isn't here (that means taking someone off or putting
// someone on), nor the goalkeeper (tap a player and choose "Make goalkeeper").

function openSettings() {
  const s = match.settings;
  $('set-interval').value = s.intervalMs / 60000;
  $('set-per-sub').value = s.perSub;
  $('set-per-sub').max = Math.max(1, s.fieldSize - 1);
  renderSettingsPositions();
  $('settings-dialog').showModal();
}

function renderSettingsPositions() {
  const names = match.settings.positions;
  $('set-use-positions').checked = !!names;
  $('set-field-view').checked = !!team.settings.fieldView;
  $('set-field-view-option').hidden = !names;
  renderFieldStyle();
  $('set-position-list').replaceChildren(
    ...(names ?? []).map((name, i) =>
      el('input', {
        // A name left empty shows as "Position 2"; show the box empty then, like in setup.
        value: name === `Position ${i + 1}` ? '' : name,
        placeholder: `Position ${i + 1}`,
        'aria-label': `Name of position ${i + 1}`,
        autocomplete: 'off',
        enterkeyhint: 'done',
        oninput: (e) => {
          team.settings.positions[i] = e.target.value;
          saveTeam(team);
          change(() => M.renamePosition(match, i, e.target.value));
        },
      }),
    ),
  );
}

$('settings-btn').addEventListener('click', () => match && openSettings());
$('settings-done').addEventListener('click', () => $('settings-dialog').close());
$('set-interval').addEventListener('input', (e) => {
  const min = parseFloat(e.target.value);
  if (!(min >= 0.5 && min <= 60)) return; // half-typed: wait for a real number
  team.settings.intervalMin = min;
  saveTeam(team);
  change(() => M.setIntervalMin(match, min));
});
$('set-per-sub').addEventListener('input', (e) => {
  const n = parseInt(e.target.value, 10);
  if (!(n >= 1 && n <= match.settings.fieldSize - 1)) return;
  team.settings.perSub = n;
  saveTeam(team);
  change(() => (match.settings.perSub = n));
});
$('set-use-positions').addEventListener('change', (e) => {
  team.settings.usePositions = e.target.checked;
  team.settings.positions ??= [];
  saveTeam(team);
  change(() => M.setPositions(match, e.target.checked, team.settings.positions));
  renderSettingsPositions();
});
$('set-field-view').addEventListener('change', (e) => {
  team.settings.fieldView = e.target.checked;
  saveTeam(team);
  renderFieldStyle();
  renderMatch();
});

// Runs twice a second: updates the clocks and opens the popup when it's time.
function updateClock() {
  if (!match) return;
  const t = now();
  const remaining = match.nextSubAt - t;
  const running = M.isRunning(match);

  $('countdown').textContent = fmt(remaining, Math.ceil);
  $('field-countdown').textContent = fmt(remaining, Math.ceil);
  const done = `${Math.min(100, Math.max(0, (1 - remaining / match.settings.intervalMs) * 100))}%`;
  // The big clock on the list, and the small one above the field view
  for (const [clock, countdown, progress, time, badge] of [
    ['clock', 'countdown', 'sub-progress', 'match-time', 'paused-badge'],
    ['field-clock', 'field-countdown', 'field-progress', 'field-match-time', 'field-paused'],
  ]) {
    $(countdown).classList.toggle('due', remaining <= 0);
    $(clock).classList.toggle('due', remaining <= 0);
    $(clock).classList.toggle('paused', !running);
    $(progress).style.width = done;
    $(time).textContent = fmt(t);
    $(badge).hidden = running;
  }
  $('pause').textContent = running ? 'Pause' : 'Resume';

  for (const span of document.querySelectorAll('.mins[data-id]')) {
    const p = player(span.dataset.id);
    if (p) span.textContent = fmt(M.fieldTime(p, t));
  }
  // Time since they last came on. Left out while it's the same as the total (their first time on).
  for (const span of document.querySelectorAll('.stint[data-stint]')) {
    const p = player(span.dataset.stint);
    span.textContent = p && M.onPitch(p.status) && p.fieldMs > 0 ? fmt(t - p.since) : '';
  }

  if (remaining <= 0 && running && !swap && !$('action-dialog').open && !$('ask-dialog').open && !$('settings-dialog').open) substitutionDue();
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
  M.fillSpots(match);
  saveMatch(match);
  renderMatch();
}

$('pause').addEventListener('click', () => change(() => (M.isRunning(match) ? M.pause(match) : M.resume(match))));

// Start the countdown again from the full interval, without a substitution.
$('restart-countdown').addEventListener('click', () => {
  change(() => M.scheduleNext(match));
  toast(`Countdown restarted: next substitution in ${fmt(match.settings.intervalMs)}.`);
});

$('swap-now').addEventListener('click', () => {
  const pairs = M.pickSubstitution(match.players, 1, now());
  if (!pairs.length) return toast('Nobody on the bench to swap with.');
  openSwap('adhoc', pairs);
});

$('add-late').addEventListener('click', async () => {
  const name = (await ask({ title: 'Add player', input: 'Player name', ok: 'Add' }))?.trim();
  if (!name) return;
  const p = { id: M.newId(), name };
  team.players.push(p);
  saveTeam(team);
  change(() => M.addPlayer(match, p, now()));
  toast(`${name} is on the bench and will come on at the next substitution.`);
});

$('end-match').addEventListener('click', async () => {
  const sure = await ask({ title: 'End the match?', text: 'The minutes are saved for next match’s starters.', ok: 'End match', danger: true });
  if (!sure) return;
  const t = now();
  $('summary-time').textContent = fmt(t);
  $('summary-list').replaceChildren(
    ...[...match.players]
      .sort((a, b) => M.fieldTime(b, t) - M.fieldTime(a, t))
      .map((p) => el('li', {}, [el('span', {}, p.name), el('span', { class: 'mins' }, fmt(M.fieldTime(p, t)))])),
  );
  team.lastMinutes = M.minutesPlayed(match, t);
  team.settings.autoStarters = true;
  saveTeam(team);
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
    const others = match.players.filter((x) => x.status === 'field' && x.id !== id);
    if (p.status === 'field' && match.settings.positions && others.length) {
      action('Change position with…', () =>
        pickPlayer(`Who swaps positions with ${p.name}?`, others, null, t).then((otherId) => {
          if (otherId) change(() => M.swapPositions(match, id, otherId));
        }),
      );
    }
    if (p.status === 'field') action('Make goalkeeper', () => change(() => M.makeGoalkeeper(match, id, t)));
  } else if (p.status === 'bench') {
    if (onField < match.settings.fieldSize) action('Put on the field', () => change(() => M.setStatus(p, 'field', t)));
    if (off.length) action('Bring on now', () => openSwap('adhoc', [{ offId: off[0].id, onId: id }]));
    action('Make goalkeeper', () => change(() => M.makeGoalkeeper(match, id, t)));
    action('Remove from match', () => change(() => M.setStatus(p, 'out', t)));
  } else {
    action('Back to bench', () => change(() => M.setStatus(p, 'bench', t)));
  }
  action('Rename', () => renamePlayer(id));
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

// Playing time next to the name, only during a match (t is null in setup).
const pickMins = (p, t) => (t == null ? [] : [el('span', { class: 'mins' }, fmt(M.fieldTime(p, t)))]);

// A button that shows the chosen player and opens a list to pick another (instead of the phone's own dropdown).
function playerPicker(players, value, onchange, t, title) {
  const label = (p) => [el('span', { class: 'pick-name' }, [p.name, ...tags(p)]), ...pickMins(p, t)];
  const chosen = players.find((p) => p.id === value);
  return el(
    'button',
    {
      type: 'button',
      class: 'picker',
      onclick: () =>
        pickPlayer(title, players, value, t).then((id) => {
          if (id && id !== value) onchange(id);
        }),
    },
    chosen ? label(chosen) : el('span', { class: 'pick-name muted' }, 'Choose…'),
  );
}

function pickPlayer(title, players, value, t) {
  const dlg = $('pick-dialog');
  $('pick-title').textContent = title;
  return new Promise((resolve) => {
    const done = (id) => {
      dlg.onclose = null;
      dlg.close();
      resolve(id);
    };
    $('pick-list').replaceChildren(
      ...players.map((p) =>
        el('li', { class: 'player' }, [
          el('button', { type: 'button', class: p.id === value ? 'chosen' : '', onclick: () => done(p.id) }, [
            el('span', { class: 'name' }, [p.name, ...tags(p)]),
            ...pickMins(p, t),
          ]),
        ]),
      ),
    );
    $('pick-cancel').onclick = () => done(null);
    dlg.onclose = () => resolve(null);
    dlg.showModal();
  });
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
    .sort((a, b) => a.since - b.since || M.fieldTime(b, t) - M.fieldTime(a, t)); // longest on first, like rankOff
  const onOptions = M.rankOn(match.players, t);

  const rows = swap.rows.map((row, i) => {
    const locked = row.offId === swap.injuredId;
    const offPicker = playerPicker(offOptions, row.offId, (v) => { row.offId = v; renderSwap(); }, t, 'Who comes off?');
    offPicker.disabled = locked;
    return el('div', { class: 'swap-row' }, [
      el('div', { class: 'pick' }, [
        el('div', { class: 'pick-row' }, [el('span', { class: 'tag off' }, 'OFF'), offPicker]),
        el('div', { class: 'pick-row' }, [
          el('span', { class: 'tag on' }, 'ON'),
          playerPicker(onOptions, row.onId, (v) => { row.onId = v; renderSwap(); }, t, 'Who comes on?'),
        ]),
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

// ---------- moving to another phone ----------
// A link with the team, the setup and the match in it (see share.js).

async function shareLink() {
  const link = await makeLink(location.href, team, match);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Substitutor', url: link });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // the coach closed the share menu
    }
  }
  try {
    await navigator.clipboard.writeText(link);
    toast('Link copied. Send it to the other phone and open it there.');
  } catch {
    await ask({ title: 'Copy this link', text: 'Send it to the other phone and open it there.', input: 'Link', value: link, ok: 'Done' });
  }
}

$('share-team').addEventListener('click', shareLink);
$('share-match').addEventListener('click', shareLink);

$('paste-link').addEventListener('click', async () => {
  const text = await ask({ title: 'Paste a shared link', text: 'Copy the link from the other phone and paste it here.', input: 'Paste the link here', ok: 'Load' });
  if (text) await loadShared(text);
});

// Replace this phone's team and match with the ones in a shared link.
async function loadShared(text) {
  const shared = await readLink(text);
  if (!shared) return toast('That link doesn’t work. Ask for a new one.');
  if (team.players.length || match) {
    const sure = await ask({
      title: 'Load the shared team?',
      text: shared.match
        ? 'This phone’s team and match are replaced by the shared ones. The match carries on from where the other phone is.'
        : 'This phone’s team and match are replaced by the shared team and setup.',
      ok: 'Load',
    });
    if (!sure) return;
  }
  if (swap) {
    swap = null;
    $('swap-dialog').close();
  }
  stopAlarm();
  team = shared.team;
  saveTeam(team);
  team = loadTeam(); // fills in any missing settings
  match = shared.match;
  if (match) saveMatch(match);
  else clearMatch();
  start();
  toast(match ? 'Match loaded. Carry on from here.' : 'Team loaded.');
}

// ---------- theme ----------

const THEMES = { auto: ['🌓', 'Auto'], light: ['☀', 'Light'], dark: ['☾', 'Dark'] };
const NEXT_THEME = { auto: 'light', light: 'dark', dark: 'auto' };
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
let theme = loadTheme();

function applyTheme() {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const [icon, label] = THEMES[theme];
  $('theme-toggle').replaceChildren(el('span', {}, icon), el('span', { class: 'theme-label' }, label));
  $('theme-toggle').setAttribute('aria-label', `Theme: ${theme}. Tap to change.`);
  const dark = theme === 'dark' || (theme === 'auto' && darkQuery.matches);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0a0f1c' : '#f1eee8';
}

$('theme-toggle').addEventListener('click', () => {
  theme = NEXT_THEME[theme];
  saveTheme(theme);
  applyTheme();
});
darkQuery.addEventListener('change', applyTheme);
applyTheme();

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

// Offline support and installing as an app (needs HTTPS or localhost).
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

// ---------- install button ----------
// Chrome and Edge (Android, computers) fire beforeinstallprompt, so our button opens their install popup.
// iPhones and iPads can only install from Safari's Share menu, so there the button shows the steps.
// Hidden inside the installed app, and after "Not now".

function setupInstall() {
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (installed || loadInstallHidden()) return;
  const card = $('install-card');
  let installPrompt = null;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    card.hidden = false;
  });
  addEventListener('appinstalled', () => (card.hidden = true));
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) card.hidden = false;

  $('install-btn').addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      installPrompt = null;
      if (outcome === 'accepted') card.hidden = true;
    } else if (ios) {
      $('ios-install-dialog').showModal();
    }
  });
  $('install-hide').addEventListener('click', () => {
    card.hidden = true;
    saveInstallHidden();
  });
  $('ios-install-close').addEventListener('click', () => $('ios-install-dialog').close());
}
setupInstall();

function start() {
  if (match) {
    renderMatch();
    show('match');
    keepScreenOn();
  } else {
    releaseScreen();
    renderTeam();
    show('team');
  }
}
start();

// Opened from a shared link: load it, and take it out of the address bar so a reload doesn't load it again.
if (hasShare(location.hash)) {
  const link = location.href;
  history.replaceState(null, '', location.pathname + location.search);
  loadShared(link);
}
