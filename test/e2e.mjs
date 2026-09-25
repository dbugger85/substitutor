// Browser test of a whole match, on a phone-sized screen.
//
//   npm install && npm run e2e                                  # tests local files
//   BASE_URL=https://dbugger85.github.io/substitutor/ npm run e2e   # tests the live site
//
// Needs Chromium (CHROMIUM=/path/to/chromium if not /usr/bin/chromium).
// Screenshots go to test/screenshots/ (ignored by git).

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = fileURLToPath(new URL('./screenshots', import.meta.url));
mkdirSync(shots, { recursive: true });

let server = null;
let base = process.env.BASE_URL;
if (!base) {
  server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  base = 'http://127.0.0.1:8765/';
  for (let i = 0; i < 50; i++) {
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('Late Lisa') : d.accept()));
  const names = (sel) => page.$$eval(sel, (els) => els.map((e) => e.firstChild.textContent));

  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Team
  for (const n of ['Mia', 'Anna', 'Ben', 'Carl', 'Dana', 'Erik', 'Fia']) {
    await page.fill('#new-player-name', n);
    await page.press('#new-player-name', 'Enter');
  }
  await page.screenshot({ path: `${shots}/1-team.png`, fullPage: true });

  // Setup: 5 on the field incl. GK, substitution every 3 seconds, 2 at a time
  await page.click('#to-setup');
  await page.fill('#field-size', '5');
  await page.click('#gk-list label:has-text("Mia")');
  for (const n of ['Anna', 'Ben', 'Carl', 'Dana']) await page.click(`#starter-list label:has-text("${n}")`);
  await page.fill('#interval', '0.05');
  await page.fill('#per-sub', '2');
  assert.equal(await page.textContent('#setup-error'), '');
  await page.screenshot({ path: `${shots}/2-setup.png`, fullPage: true });
  await page.click('#start-match');
  await page.screenshot({ path: `${shots}/3-match.png`, fullPage: true });

  // Scheduled substitution
  await page.waitForSelector('#swap-dialog[open]', { timeout: 6000 });
  assert.equal(await page.textContent('#swap-title'), 'Substitution time!');
  await page.screenshot({ path: `${shots}/4-prompt.png` });
  await page.click('#swap-confirm');
  assert.deepEqual(await names('#field-list .name'), ['Mia', 'Carl', 'Dana', 'Erik', 'Fia']);
  assert.deepEqual(await names('#bench-list .name'), ['Anna', 'Ben']);

  // Reload keeps the match
  await page.reload();
  assert.ok(await page.isVisible('#screen-match'));

  // Injury: Carl goes out, a bench player comes on
  await page.click('#field-list li:nth-child(2) button');
  await page.click('#action-list button:has-text("Injured")');
  await page.screenshot({ path: `${shots}/5-injury.png` });
  await page.click('#swap-confirm');
  assert.deepEqual(await names('#out-list .name'), ['Carl']);

  // Late player, pause, end
  await page.click('#add-late');
  assert.ok((await names('#bench-list .name')).includes('Late Lisa'));
  await page.click('#pause');
  assert.ok(await page.isVisible('#paused-badge'));
  await page.screenshot({ path: `${shots}/6-paused.png`, fullPage: true });
  await page.click('#end-match');
  await page.screenshot({ path: `${shots}/7-summary.png` });
  await page.click('#summary-close');
  assert.ok(await page.isVisible('#screen-team'));

  assert.deepEqual(errors, []);
  console.log(`✔ e2e passed against ${base} (screenshots in test/screenshots/)`);
} finally {
  await browser.close();
  server?.kill();
}
