// Browser test of a whole match, on a phone-sized screen.
//
//   npm install && npm run e2e                                  # tests local files
//   BASE_URL=https://substitutor.no/ npm run e2e   # tests the live site
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
  for (const n of ['Mia', 'Anna', 'Ben', 'Carl', 'Dana', 'Erik']) {
    await page.fill('#new-player-name', n);
    await page.press('#new-player-name', 'Enter');
  }
  // Rename a misspelt player by tapping their name
  await page.fill('#new-player-name', 'Fai');
  await page.press('#new-player-name', 'Enter');
  await page.click('#team-list button.rename:has-text("Fai")');
  await page.waitForSelector('#ask-dialog[open]');
  assert.equal(await page.inputValue('#ask-input'), 'Fai');
  await page.fill('#ask-input', 'Fia');
  await page.click('#ask-ok');
  assert.deepEqual(await page.$$eval('#team-list button.rename', (b) => b.map((x) => x.textContent)), ['Mia', 'Anna', 'Ben', 'Carl', 'Dana', 'Erik', 'Fia']);
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
  // Rename during a match, from the player options
  await page.click('#out-list li button');
  await page.click('#action-list button:has-text("Rename")');
  await page.fill('#ask-input', 'Carlos');
  await page.click('#ask-ok');
  assert.deepEqual(await names('#out-list .name'), ['Carlos']);
  await page.click('#out-list li button');
  await page.click('#action-list button:has-text("Rename")');
  await page.fill('#ask-input', 'Carl');
  await page.click('#ask-ok');

  // Late player, pause, end
  await page.click('#add-late');
  await page.waitForSelector('#ask-dialog[open]');
  await popup('5-add-player');
  await page.fill('#ask-input', 'Late Lisa');
  await page.click('#ask-ok');
  assert.ok((await names('#bench-list .name')).includes('Late Lisa'));
  await page.click('#pause');
  assert.ok(await page.isVisible('#paused-badge'));
  // Restart the countdown: back to the full 3 seconds
  await page.click('#restart-countdown');
  assert.equal(await page.textContent('#countdown'), '0:03');
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

  // Positions: switched on in setup, shown on the match screen, and two players can swap
  await page.click('#to-setup');
  await page.fill('#interval', '10');
  await page.click('label:has(#use-positions)');
  const posInputs = await page.$$('#position-list input');
  assert.equal(posInputs.length, 4);
  for (const [i, n] of ['Left', 'Right', 'Middle', 'Front'].entries()) await posInputs[i].fill(n);
  const firstStarter = await page.textContent('#position-list .pos-row:nth-child(1) .pick-name');
  const thirdStarter = await page.textContent('#position-list .pos-row:nth-child(3) .pick-name');
  await page.click('#position-list .pos-row:nth-child(1) button.picker');
  await page.click(`#pick-list button:has-text("${thirdStarter}")`); // swaps the first and third
  assert.equal(await page.textContent('#position-list .pos-row:nth-child(3) .pick-name'), firstStarter);
  await page.screenshot({ path: `${shots}/10-positions-setup.png`, fullPage: true });
  await page.click('label:has(#use-field-view)');
  await page.click('#start-match');
  const posOf = (n) => page.textContent(`#field-list li:has-text("${n}") .badge.pos`);
  assert.equal(await posOf(thirdStarter), 'Left');
  assert.equal(await posOf(firstStarter), 'Middle');
  await page.click(`#field-list li:has-text("${thirdStarter}") button`);
  await page.click('#action-list button:has-text("Change position")');
  await page.waitForSelector('#pick-dialog[open]');
  await popup('10-positions-swap');
  await page.click(`#pick-list button:has-text("${firstStarter}")`);
  assert.equal(await posOf(thirdStarter), 'Middle');
  assert.equal(await posOf(firstStarter), 'Left');
  // Substitute by position: the lists show positions, and the player who comes off keeps a grey "last position" tag on the bench
  await page.click('#swap-now');
  await page.click('#swap-rows .pick-row:nth-child(1) button.picker');
  await page.waitForSelector('#pick-dialog[open]');
  await page.click('#pick-list button:has-text("Front")');
  const frontPlayer = await page.$eval('#swap-rows .pick-row:nth-child(1) .pick-name', (e) => e.firstChild.textContent);
  await popup('10-positions-swap-popup');
  await page.click('#swap-confirm');
  assert.equal(await page.textContent(`#bench-list li:has-text("${frontPlayer}") .badge.last`), 'Front');
  assert.equal(await page.$$eval('#field-list .badge.pos', (b) => b.filter((x) => x.textContent === 'Front').length), 1);
  assert.ok(await page.isVisible('#last-pos-hint'));

  // Field view: swipe left to see the positions on a field, with the bench beside it
  assert.ok(await page.isVisible('#page-dots'));
  await page.$eval('#match-pages', (e) => e.scrollTo({ left: e.clientWidth }));
  await page.waitForFunction(() => document.querySelector('#page-dots button:nth-child(2)').classList.contains('active'));
  const markers = () => page.$$eval('#pitch-markers .marker', (ms) => ms.map((m) => m.innerText.replace(/\s+/g, ' ').trim()));
  const onField = await markers();
  assert.equal(onField.length, 5);
  assert.ok(onField.includes('GK Mia'));
  assert.ok(onField.includes(`Front Anna`) || onField.some((m) => m.startsWith('Front ')));
  // Positions start where their names suggest: Front near the top, Left left of Right
  const top = (n) => page.$eval(`#pitch-markers .marker:nth-child(${n})`, (m) => parseFloat(m.style.top));
  const leftOf = (n) => page.$eval(`#pitch-markers .marker:nth-child(${n})`, (m) => parseFloat(m.style.left));
  assert.ok((await top(5)) < (await top(4)) && (await leftOf(2)) < (await leftOf(3)));
  assert.ok((await page.$$eval('#field-bench .bench-name', (b) => b.map((x) => x.textContent))).includes(frontPlayer));
  assert.equal(await page.$eval('#match-pages', (e) => e.scrollLeft), 390);
  await page.screenshot({ path: `${shots}/11-field.png` });
  // The screen ends after the bench, not as far down as the (longer) list
  await page.waitForTimeout(100);
  const room = await page.evaluate(() => document.documentElement.scrollHeight - document.querySelector('#field-page').getBoundingClientRect().bottom - scrollY);
  assert.ok(room < 60, `${room}px of empty space below the field view`);
  // Press and hold "Left", then drag it to the top-left; it's remembered
  const left = await page.$('#pitch-markers .marker:nth-child(2)');
  const lb = await left.boundingBox();
  const pb = await (await page.$('#pitch')).boundingBox();
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.move(pb.x + pb.width * 0.2, pb.y + pb.height * 0.3, { steps: 5 });
  await page.screenshot({ path: `${shots}/11-field-drag.png` });
  await page.mouse.up();
  await page.waitForTimeout(100);
  assert.ok(!(await page.isVisible('#action-dialog')), 'letting go after a drag should not open the player options');
  // Now arranging: everything wiggles, and another position can be dragged without holding
  assert.ok(await page.$eval('#pitch', (e) => e.classList.contains('arranging')));
  assert.ok(await page.$eval('#pitch-markers .marker:nth-child(3)', (e) => getComputedStyle(e).animationName === 'wiggle'));
  const right = await page.$('#pitch-markers .marker:nth-child(3)');
  const rb = await right.boundingBox();
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width * 0.8, pb.y + pb.height * 0.3, { steps: 5 });
  await page.mouse.up();
  await page.click('#field-done');
  assert.ok(!(await page.$eval('#pitch', (e) => e.classList.contains('arranging'))));
  // A quick drag without holding moves nothing
  const front = await page.$('#pitch-markers .marker:nth-child(5)');
  const fb = await front.boundingBox();
  await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await page.mouse.down();
  await page.mouse.move(fb.x + 80, fb.y + 80, { steps: 3 });
  await page.mouse.up();
  assert.deepEqual(await front.boundingBox(), fb);
  // A quick tap still opens the player options
  await page.click('#pitch-markers .marker:nth-child(1)');
  await page.waitForSelector('#action-dialog[open]');
  await page.click('#action-list button:has-text("Cancel")');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('substitutor.team')).settings.layout.spots);
  assert.ok(Math.abs(saved[0].x - 0.2) < 0.03 && Math.abs(saved[0].y - 0.3) < 0.03, `saved ${JSON.stringify(saved[0])}`);
  assert.ok(Math.abs(saved[1].x - 0.8) < 0.03 && Math.abs(saved[1].y - 0.3) < 0.03, `saved ${JSON.stringify(saved[1])}`);
  await page.$eval('#match-pages', (e) => e.scrollTo({ left: 0 }));
  await page.screenshot({ path: `${shots}/10-positions-match.png`, fullPage: true });
  // The cog: change settings during the match
  assert.ok(await page.isVisible('#settings-btn'));
  assert.ok(await page.isHidden('#lang-toggle'), 'no language flag on the match screen');
  await page.click('#settings-btn');
  await page.waitForSelector('#settings-dialog[open]');
  await popup('12-match-settings');
  await page.fill('#set-position-list input >> nth=0', 'Venstre back');
  assert.ok((await page.$$eval('#field-list .badge.pos', (b) => b.map((x) => x.textContent))).includes('Venstre back'));
  await page.fill('#set-interval', '3');
  await page.click('label:has(#set-use-positions)');
  assert.equal(await page.$$eval('#field-list .badge.pos', (b) => b.length), 0);
  assert.ok(await page.isHidden('#set-field-view-option'));
  await page.click('label:has(#set-use-positions)');
  assert.equal(await page.$$eval('#field-list .badge.pos', (b) => b.length), 4);
  // Sport and colour for the field view: a sport brings its own colour, which can be changed
  assert.ok(await page.isVisible('#set-field-style'));
  await page.click('#set-field-style button.picker');
  await page.click('#pick-list button:has-text("Ice hockey")');
  assert.equal(await page.$eval('#field-page', (e) => e.dataset.pitchColor), 'ice');
  assert.ok(await page.$eval('#pitch-lines', (e) => e.querySelectorAll('.thick').length === 3));
  await page.click('#set-field-style .swatch[aria-label="Red"]');
  assert.equal(await page.$eval('#field-page', (e) => e.dataset.pitchColor), 'red');
  await popup('12-match-settings-field');
  await page.click('#set-field-style button.picker');
  await page.click('#pick-list button:has-text("Football")');
  assert.equal(await page.$eval('#field-page', (e) => e.dataset.pitchColor), 'green');
  await page.click('#settings-done');
  assert.ok(!(await page.isVisible('#settings-dialog')));
  const stored = await page.evaluate(() => ({ team: JSON.parse(localStorage.getItem('substitutor.team')).settings, match: JSON.parse(localStorage.getItem('substitutor.match')).settings }));
  assert.equal(stored.match.intervalMs, 180000);
  assert.equal(stored.match.positions[0], 'Venstre back');
  assert.equal(stored.team.intervalMin, 3);
  assert.equal(stored.team.positions[0], 'Venstre back');
  await page.click('#end-match');
  await page.click('#ask-ok');
  await page.click('#summary-close');
  await page.waitForSelector('#settings-btn', { state: 'hidden' }); // the cog is only on the match screen

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

  // Norwegian: its own address, the page and the app's messages in Norwegian, and the flags switch back
  const norsk = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-GB' });
  norsk.on('pageerror', (e) => errors.push(e.message));
  await norsk.goto(new URL('?lang=no', base).href);
  assert.equal(await norsk.getAttribute('html', 'lang'), 'nb');
  assert.equal(await norsk.textContent('#screen-team h2'), 'Lag');
  assert.ok((await norsk.title()).includes('rettferdige bytter'));
  assert.ok((await norsk.getAttribute('meta[name="description"]', 'content')).startsWith('Gratis app'));
  assert.ok(await norsk.isVisible('#team-empty .intro'));
  assert.equal(await norsk.getAttribute('.source-link a', 'href'), 'https://github.com/dbugger85/substitutor');
  assert.equal(await norsk.textContent('.source-link a'), 'Åpen kildekode – bidra på GitHub');
  assert.ok((await norsk.getAttribute('#lang-toggle', 'aria-label')).startsWith('Språk: Norsk'));
  await norsk.screenshot({ path: `${shots}/13-norsk-team.png` });
  for (const name of ['Ola', 'Kari', 'Per']) {
    await norsk.fill('#new-player-name', name);
    await norsk.press('#new-player-name', 'Enter');
  }
  await norsk.click('#to-setup');
  assert.equal(await norsk.textContent('#screen-setup h2'), 'Kampoppsett');
  assert.equal(await norsk.textContent('#setup-error'), 'Du har bare 3 spillere på laget.');
  await norsk.screenshot({ path: `${shots}/13-norsk-setup.png`, fullPage: true });
  await norsk.click('#setup-back');
  // The choice is remembered without ?lang=, and the flag switches to English (and isn't on the match screen)
  await norsk.goto(base);
  assert.equal(await norsk.textContent('#screen-team h2'), 'Lag');
  await norsk.click('#lang-toggle');
  await norsk.waitForURL(/lang=en/);
  assert.equal(await norsk.textContent('#screen-team h2'), 'Team');
  // English is the default for a phone in English
  await norsk.evaluate(() => localStorage.removeItem('substitutor.lang'));
  await norsk.goto(base);
  assert.equal(await norsk.textContent('#screen-team h2'), 'Team');

  assert.deepEqual(errors, []);
  assert.deepEqual(nativeDialogs, [], 'the browser\'s own popups were used');
  console.log(`✔ e2e passed against ${base} (screenshots in test/screenshots/)`);
} finally {
  await browser.close();
  server?.kill();
}
