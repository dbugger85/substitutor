// Makes the README's screenshots (screenshots/) and the link preview picture
// (icons/preview.png). Run it when the look changes: npm run screenshots
// It plays a made-up 7-a-side match to 7:12 (one substitution at 5:00), with
// English position names, on a phone (390×844), and on an iPad both ways.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = 'http://127.0.0.1:8766/';
const server = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium' });
const out = (name) => `${ROOT}screenshots/${name}.png`;

const names = ['Nora', 'Emil', 'Jakob', 'Ella', 'Noah', 'Sofie', 'Lukas', 'Ingrid', 'Oskar'];
const players = names.map((n) => ({ id: n, name: n }));
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 };
const tablet = (width, height) => ({ viewport: { width, height }, screen: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });

async function scene(scheme, sport, positions, fn, device = phone) {
  const starters = names.slice(1, positions.length + 1);
  const page = await browser.newPage({ ...device, colorScheme: scheme });
  await page.goto(BASE + '?lang=en');
  await page.evaluate(({ players, starters, sport, positions }) => {
    localStorage.clear();
    localStorage.setItem('substitutor.installHidden', '1');
    localStorage.setItem('substitutor.team', JSON.stringify({ v: 1, players, settings: { fieldSize: positions.length + 1, intervalMin: 5, perSub: 2, gkId: 'Nora', starterIds: starters, usePositions: true, positions, posIds: starters, fieldView: true, sport } }));
  }, { players, starters, sport, positions });
  await page.reload();
  await page.click('#to-setup');
  await page.click('#start-match');
  // Play 5 minutes, make the first substitution, then play 2:12 more
  const shift = (ms) => page.evaluate((ms) => {
    const m = JSON.parse(localStorage.getItem('substitutor.match'));
    m.runningSince -= ms;
    localStorage.setItem('substitutor.match', JSON.stringify(m));
  }, ms);
  await shift(5 * 60000);
  await page.reload();
  await page.waitForSelector('#swap-dialog[open]');
  await page.click('#swap-confirm');
  await shift(2 * 60000 + 12000);
  await page.reload();
  await page.waitForTimeout(300);
  await fn(page);
  await page.close();
}
const toField = async (page) => {
  await page.$eval('#match-pages', (e) => e.scrollTo({ left: e.clientWidth }));
  await page.waitForTimeout(400);
};

const football = ['Left back', 'Right back', 'Midfield', 'Left wing', 'Right wing', 'Striker'];
const hockey = ['LD', 'RD', 'LW', 'C', 'RW'];
await scene('light', 'football', football, async (page) => {
  await page.screenshot({ path: out('1-match') });
  await toField(page);
  await page.screenshot({ path: out('3-field') });
});
await scene('light', 'football', football, async (page) => {
  await page.evaluate(() => {
    const m = JSON.parse(localStorage.getItem('substitutor.match'));
    m.nextSubAt = 0;
    localStorage.setItem('substitutor.match', JSON.stringify(m));
  });
  await page.reload();
  await page.waitForSelector('#swap-dialog[open]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('2-substitution') });
});
await scene('dark', 'icehockey', hockey, async (page) => {
  await toField(page);
  await page.screenshot({ path: out('4-field-hockey-dark') });
  await page.click('#settings-btn');
  await page.waitForTimeout(400);
  await page.$eval('#settings-done', (e) => e.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: out('5-settings-dark') });
});
await scene('light', 'football', football, (page) => page.screenshot({ path: out('6-ipad-landscape') }), tablet(1180, 820));
await scene('dark', 'football', football, (page) => page.screenshot({ path: out('7-ipad-portrait-dark') }), tablet(820, 1180));

// The link preview: logo, tagline in both languages, the sports, and two of the screenshots above
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(BASE + 'robots.txt');
  await page.setContent(`<!doctype html><html><head><base href="${BASE}"><style>
@font-face { font-family: Inter; src: url("fonts/inter.woff2") format("woff2"); font-weight: 100 900; }
@font-face { font-family: Barlow; src: url("fonts/barlow-condensed-700.woff2") format("woff2"); font-weight: 700; }
body { margin: 0; width: 1200px; height: 630px; overflow: hidden; font-family: Inter; color: #141821;
  background: radial-gradient(60% 70% at 10% 15%, #cfe8d2, transparent 70%), radial-gradient(50% 60% at 95% 90%, #f3d9c4, transparent 70%), #f1eee8; }
.left { position: absolute; left: 64px; top: 0; bottom: 0; width: 500px; display: flex; flex-direction: column; justify-content: center; }
.brand { display: flex; align-items: center; gap: 20px; }
.brand img { width: 84px; height: 84px; border-radius: 24px; box-shadow: 0 10px 30px rgb(30 140 70 / 0.35); }
h1 { margin: 0; font: 700 62px/1 Barlow; text-transform: uppercase; letter-spacing: 0.01em; }
h1 span { font-size: 0.6em; text-transform: none; opacity: 0.6; }
p { margin: 28px 0 0; font-size: 31px; line-height: 1.25; font-weight: 600; }
p.no { margin-top: 10px; font-size: 26px; font-weight: 500; color: #5b6475; }
.sports { margin-top: 30px; font-size: 19px; color: #5b6475; }
.shot { position: absolute; top: 60px; width: 270px; border-radius: 26px; box-shadow: 0 24px 60px rgb(20 30 50 / 0.28); border: 6px solid #fff; }
</style></head><body>
<div class="left">
  <div class="brand"><img src="icons/icon.svg"><h1>Substitutor<span>.no</span></h1></div>
  <p>Fair playing time for every player</p>
  <p class="no">Rettferdig spilletid for alle spillerne</p>
  <div class="sports">Football · Bandy · Handball · Ice hockey · Floorball · Futsal</div>
</div>
<img class="shot" src="screenshots/1-match.png" style="left: 600px; top: 70px; transform: rotate(-3deg)">
<img class="shot" src="screenshots/3-field.png" style="left: 880px; top: 40px; transform: rotate(3deg)">
</body></html>`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${ROOT}icons/preview.png` });
  await page.close();
}

await browser.close();
server.kill();
console.log('✔ screenshots/ and icons/preview.png updated');
