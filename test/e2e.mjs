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
  const nativeDialogs = [];
  page.on('dialog', (d) => { nativeDialogs.push(d.type()); d.dismiss(); }); // the app should only use its own popups
  const popup = (name) => page.waitForTimeout(300).then(() => page.screenshot({ path: `${shots}/${name}.png` })); // after the fade-in
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
  await popup('4-prompt');
  await page.click('#swap-confirm');
  assert.deepEqual(await names('#field-list .name'), ['Mia', 'Carl', 'Dana', 'Erik', 'Fia']);
  assert.deepEqual(await names('#bench-list .name'), ['Anna', 'Ben']);

  // Reload keeps the match
  await page.reload();
  assert.ok(await page.isVisible('#screen-match'));

  // Injury: Carl goes out, a bench player comes on
  await page.click('#field-list li:nth-child(2) button');
  await page.click('#action-list button:has-text("Injured")');
  await popup('5-injury');
  await page.click('#swap-confirm');
  assert.deepEqual(await names('#out-list .name'), ['Carl']);

  // Late player, pause, end
  await page.click('#add-late');
  await page.waitForSelector('#ask-dialog[open]');
  await popup('5-add-player');
  await page.fill('#ask-input', 'Late Lisa');
  await page.click('#ask-ok');
  assert.ok((await names('#bench-list .name')).includes('Late Lisa'));
  await page.click('#pause');
  assert.ok(await page.isVisible('#paused-badge'));
  await page.screenshot({ path: `${shots}/6-paused.png`, fullPage: true });

  // Move to another phone: the link opens the same match on a fresh phone
  await page.evaluate(() => (navigator.share = async ({ url }) => (window.sharedUrl = url)));
  await page.click('#share-match');
  const link = await page.waitForFunction(() => window.sharedUrl).then((h) => h.jsonValue());
  const phone2 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  phone2.on('pageerror', (e) => errors.push(e.message));
  phone2.on('dialog', (d) => { nativeDialogs.push(d.type()); d.dismiss(); });
  await phone2.goto(link);
  await phone2.waitForSelector('#screen-match:not([hidden])');
  for (const list of ['#field-list', '#bench-list', '#out-list']) {
    assert.deepEqual(await phone2.$$eval(`${list} .name`, (els) => els.map((e) => e.firstChild.textContent)), await names(`${list} .name`));
  }
  assert.equal(await phone2.textContent('#match-time'), await page.textContent('#match-time'));
  assert.ok(await phone2.isVisible('#paused-badge'));
  assert.ok(!phone2.url().includes('#share='), 'the link stays in the address bar');
  await phone2.screenshot({ path: `${shots}/6-phone2.png`, fullPage: true });
  await phone2.close();

  // Theme button: Auto -> Light -> Dark, remembered after a reload
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme ?? 'auto');
  assert.equal(await theme(), 'auto');
  await page.click('#theme-toggle');
  await page.click('#theme-toggle');
  assert.equal(await theme(), 'dark');
  await page.reload();
  assert.equal(await theme(), 'dark');
  await page.screenshot({ path: `${shots}/6-dark.png`, fullPage: true });
  await page.click('#swap-now');
  await popup('6-dark-popup');
  // Pick another player from our own list (not the phone's dropdown)
  await page.click('#swap-rows .pick-row:nth-child(2) button.picker');
  await page.waitForSelector('#pick-dialog[open]');
  await popup('6-dark-picker');
  await page.click('#pick-list button:has-text("Ben")');
  assert.match(await page.textContent('#swap-rows .pick-row:nth-child(2)'), /Ben/);
  await page.click('#swap-cancel');

  await page.click('#end-match');
  await page.waitForSelector('#ask-dialog[open]');
  await popup('7-end-ask');
  await page.click('#ask-ok');
  await popup('7-summary');
  await page.click('#summary-close');
  await page.waitForSelector('#screen-team', { state: 'visible', timeout: 2000 });

  // Next match: players who played least are ticked as starters
  const ticked = () => page.$$eval('#starter-list label', (ls) => ls.filter((l) => l.querySelector('input').checked).map((l) => l.textContent));
  await page.click('#to-setup');
  const starters = await ticked();
  assert.equal(starters.length, 4);
  for (const n of ['Late Lisa', 'Erik', 'Fia']) assert.ok(starters.includes(n), `${n} should start`);
  for (const n of ['Mia', 'Dana', 'Carl']) assert.ok(!starters.includes(n), `${n} should rest`);
  assert.match(await page.textContent('#starter-note'), /played least/);
  await page.screenshot({ path: `${shots}/8-next-setup.png`, fullPage: true });
  // Changing a pick by hand stops the suggestion, and the link brings it back
  await page.click('#starter-list label:has-text("Erik")');
  assert.equal((await ticked()).length, 3);
  await page.click('#starter-note button');
  assert.deepEqual(await ticked(), starters);

  // Paste a shared link on a phone that already has a team: asks first, then carries on the match
  await page.click('#setup-back');
  await page.click('#paste-link');
  await page.waitForSelector('#ask-dialog[open]');
  await page.fill('#ask-input', `Here: ${link}`);
  await page.click('#ask-ok');
  await page.waitForFunction(() => document.querySelector('#ask-title').textContent === 'Load the shared team?');
  await popup('8-paste-ask');
  await page.click('#ask-ok');
  await page.waitForSelector('#screen-match:not([hidden])');
  assert.ok((await names('#bench-list .name')).includes('Late Lisa'));
  await page.screenshot({ path: `${shots}/8-pasted.png`, fullPage: true });
  await page.click('#end-match');
  await page.click('#ask-ok');
  await page.click('#summary-close');

  // Installable, and opens without internet
  const manifest = await (await page.request.get(new URL('manifest.webmanifest', base).href)).json();
  assert.equal(manifest.display, 'standalone');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.context().setOffline(true);
  await page.reload();
  assert.ok(await page.isVisible('#screen-team'));
  assert.equal(await page.$$eval('#team-list li', (li) => li.length), 8);
  await page.context().setOffline(false);
  // Chrome's own check finds nothing missing (the test browser is always incognito, which Chrome never installs from)
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installabilityErrors.map((e) => e.errorId).filter((id) => id !== 'in-incognito'), [], 'the page is not installable');
  for (const icon of manifest.icons) assert.ok((await page.request.get(new URL(icon.src, base).href)).ok, `icon ${icon.src} is missing`);
  // No install prompt from Chrome here, so no install card
  assert.ok(await page.$eval('#install-card', (e) => e.hidden));

  // iPhone: the install card shows, and its button explains Safari's Share → Add to Home Screen
  const iphone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  iphone.on('pageerror', (e) => errors.push(e.message));
  await iphone.goto(base);
  await iphone.waitForSelector('#install-card:not([hidden])');
  await iphone.screenshot({ path: `${shots}/9-install-card.png` });
  await iphone.click('#install-btn');
  await iphone.waitForSelector('#ios-install-dialog[open]');
  await iphone.waitForTimeout(300);
  await iphone.screenshot({ path: `${shots}/9-install-iphone.png` });
  await iphone.click('#ios-install-close');
  // "Not now" is remembered
  await iphone.click('#install-hide');
  await iphone.reload();
  assert.ok(await iphone.$eval('#install-card', (e) => e.hidden));

  assert.deepEqual(errors, []);
  assert.deepEqual(nativeDialogs, [], 'the browser\'s own popups were used');
  console.log(`✔ e2e passed against ${base} (screenshots in test/screenshots/)`);
} finally {
  await browser.close();
  server?.kill();
}
