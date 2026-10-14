import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NO, tr, posLabel } from '../js/i18n.js';
import { SPORTS, COLORS } from '../js/pitch.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('every text in the app has a Norwegian version', () => {
  const app = read('js/app.js');
  const html = read('index.html');
  const texts = [
    ...[...app.matchAll(/tr\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")),
    ...[...html.matchAll(/\sdata-t(?=[\s>])[^>]*>([^<]*)</g)].map((m) => m[1].trim()),
    ...[...html.matchAll(/data-t-html>(.*?)<\/li>/g)].map((m) => m[1].trim()),
    ...[...html.matchAll(/aria-label="([^"]+)"[^>]*data-t-label/g)].map((m) => m[1]),
    ...[...html.matchAll(/placeholder="([^"]+)"[^>]*data-t-placeholder/g)].map((m) => m[1]),
    ...[...html.matchAll(/<title>(.*?)<\/title>/g)].map((m) => m[1]),
    ...[...html.matchAll(/name="description" content="([^"]+)"/g)].map((m) => m[1]),
    ...Object.values(SPORTS).map((s) => s.name),
    ...Object.values(COLORS),
    'Auto', 'Light', 'Dark',
  ];
  assert.ok(texts.length > 120, `only found ${texts.length} texts`);
  const missing = [...new Set(texts)].filter((s) => !(s in NO));
  assert.deepEqual(missing, []);
});

test('fills in the gaps, and shows default position names in the chosen language', () => {
  assert.equal(tr('You only have {n} players in the team.', { n: 4 }), 'You only have 4 players in the team.');
  assert.equal(posLabel('Position 3'), 'Position 3');
  assert.equal(posLabel('Spiss'), 'Spiss');
  assert.equal(posLabel('GK'), 'GK');
});
