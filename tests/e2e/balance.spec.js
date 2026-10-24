// The balance comes alive when it opens (feature 027): the rosette's petals draw in, and its centre hours and two
// shares count up with them, every time a rosette appears; a tick does not draw again; reduced motion shows it whole.
// Frames are read on the real clock: openApp's Playwright clock replaces requestAnimationFrame (found in 022). The
// day is today's real date, on the example week. All data is generated.
const {test, expect} = require('@playwright/test');

async function openLive(page) {
  await page.goto('index.html');
  await expect(page.locator('nav button').first()).toBeVisible();
}
// Ticks a few of today's blocks, so the rosette has ink.
async function tickSome(page) {
  const checks = page.locator('.timeline [role=checkbox]');
  for (let i = 0; i < Math.min(3, await checks.count()); i++) await checks.nth(i).click();
}
// Clicks a button inside the page and reads the rosettes on the second frame after it, so the reading does not
// depend on how fast the test runs.
const clickThenRead = (page, selector, text) => page.evaluate(([selector, text]) => new Promise(done => {
  [...document.querySelectorAll(selector)].find(b => b.textContent.includes(text)).click();
  requestAnimationFrame(() => requestAnimationFrame(() => done(window.__readBalance())));
}), [selector, text]);
// Installed in the page: the state of every rosette shown, by its section.
const installReader = page => page.addInitScript(() => {
  window.__readBalance = () => [...document.querySelectorAll('.balance')].map(b => {
    const petals = [...b.querySelectorAll('.petal')];
    return {
      where: b.closest('.o-now') ? 'review' : b.closest('.o-balance') ? 'today' : b.closest('.a-balance') ? 'week' : '?',
      drawing: petals.flatMap(p => p.getAnimations()).filter(a => a.animationName === 'petal-draw' && a.playState === 'running').length,
      petals: petals.length,
      centre: b.querySelector('.core-num').textContent.replace(/[⁦⁩]/g, ''),
      shares: [...b.querySelectorAll('.balance-legend [aria-hidden]')].map(s => s.textContent),
      finals: [...b.querySelectorAll('.balance-legend .sr-only')].map(s => s.textContent)
    };
  });
});
const read = page => page.evaluate(() => window.__readBalance());
const of = (list, where) => list.find(b => b.where === where);
// Waits until no rosette is drawing. A drawing takes under a second from the moment it is shown (measured by hand in
// phase 1), but on the app's first load the browser shows the first frame late, so the wait is for the state, not a time.
const settle = page => expect.poll(async () => (await read(page)).reduce((n, b) => n + b.drawing, 0), {timeout: 3000}).toBe(0);

test.beforeEach(async ({page}) => { await installReader(page); });

test.describe('US1: the petals draw in', () => {
  test('every petal draws when Week opens, and the finished rosette has no dash left', async ({page}) => {
    await openLive(page);
    await tickSome(page);
    const opening = of(await clickThenRead(page, 'nav button', 'الأسبوع'), 'week');
    expect([opening.petals, opening.drawing]).toEqual([72, 72]);
    await settle(page);
    expect(of(await read(page), 'week').drawing).toBe(0);
    const left = await page.evaluate(() => [...document.querySelectorAll('.a-balance .petal')]
      .filter(p => { const c = getComputedStyle(p); return c.strokeDasharray !== 'none' || parseFloat(c.strokeDashoffset) !== 0; }).length);
    expect(left).toBe(0);
  });

  test('on WebKit the finished rosette is pixel for pixel the one shown with reduced motion', async ({page, browserName}) => {
    // Chromium smooths the edges of any animated SVG slightly differently after it ends, so this holds on WebKit (027 plan).
    test.skip(browserName !== 'webkit', 'Chromium redraws animated SVG edges slightly differently');
    await openLive(page);
    await tickSome(page);
    await page.locator('nav button', {hasText: 'الأسبوع'}).click();
    await settle(page);
    const drawn = await page.locator('.a-balance svg').screenshot();
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.locator('nav button', {hasText: 'اليوم'}).click();
    await page.locator('nav button', {hasText: 'الأسبوع'}).click();
    await page.waitForTimeout(200);
    expect(Buffer.compare(drawn, await page.locator('.a-balance svg').screenshot())).toBe(0);
  });

  test('coming back to a tab draws again, and so does another week', async ({page}) => {
    await openLive(page);
    await page.locator('nav button', {hasText: 'الأسبوع'}).click();
    await settle(page);
    expect(of(await clickThenRead(page, 'nav button', 'اليوم'), 'today').drawing).toBe(72);
    await settle(page);
    expect(of(await clickThenRead(page, 'nav button', 'الأسبوع'), 'week').drawing).toBe(72);
    await settle(page);
    const next = await page.evaluate(() => new Promise(done => {
      document.querySelector('main .arrows button').click();
      requestAnimationFrame(() => requestAnimationFrame(() => done(window.__readBalance())));
    }));
    expect(of(next, 'week').drawing).toBe(72);
  });

  test('opening the review draws its own rosette, and Today\'s does not draw again', async ({page}) => {
    await openLive(page);
    await settle(page);
    const after = await clickThenRead(page, 'main button', 'راجع يومك');
    expect(of(after, 'review').drawing).toBe(72);
    expect(of(after, 'today').drawing).toBe(0);
  });

  test('a check tapped while the rosette draws ticks the block', async ({page}) => {
    await openLive(page);
    await page.locator('nav button', {hasText: 'الأسبوع'}).click();
    await settle(page);
    await page.locator('nav button', {hasText: 'اليوم'}).click();
    const check = page.locator('.timeline [role=checkbox]').first();
    const was = await check.getAttribute('aria-checked');
    await check.click();
    await expect(check).toHaveAttribute('aria-checked', was === 'true' ? 'false' : 'true');
  });
});

test.describe('US2: the rosette\'s numbers count up', () => {
  test('the centre and the shares start below their values and end on them, and screen readers get the finals', async ({page}) => {
    await openLive(page);
    await tickSome(page);
    await page.locator('nav button', {hasText: 'اليوم'}).click();
    await settle(page);
    const final = of(await read(page), 'today');
    expect(final.centre).not.toBe('0');
    await page.locator('nav button', {hasText: 'الأسبوع'}).click();
    await settle(page);
    const early = of(await clickThenRead(page, 'nav button', 'اليوم'), 'today');
    expect(early.centre).not.toBe(final.centre);
    expect(early.finals).toEqual(final.finals);
    await settle(page);
    const end = of(await read(page), 'today');
    expect([end.centre, end.shares]).toEqual([final.centre, final.finals]);
  });

  test('values of 0 show 0 at once', async ({page}) => {
    await openLive(page);
    const opening = of(await clickThenRead(page, 'nav button', 'الأسبوع'), 'week');
    expect([opening.centre, opening.shares]).toEqual(['0', ['0%', '0%']]);
  });

  test('a tick does not draw again, and the numbers change at once', async ({page}) => {
    await openLive(page);
    await settle(page);
    const before = of(await read(page), 'today');
    const after = await page.evaluate(() => new Promise(done => {
      document.querySelector('.timeline [role=checkbox]').click();
      requestAnimationFrame(() => requestAnimationFrame(() => done(window.__readBalance())));
    }));
    const today = of(after, 'today');
    expect(today.drawing).toBe(0);
    expect(today.centre).not.toBe(before.centre);
    expect(today.shares).toEqual(today.finals);
  });
});

test.describe('with reduced motion', () => {
  test.use({reducedMotion: 'reduce'});
  test('nothing moves, and the final numbers are there in the first frame', async ({page}) => {
    await openLive(page);
    await tickSome(page);
    await page.locator('nav button', {hasText: 'اليوم'}).click();
    await settle(page);
    const final = of(await read(page), 'today');
    await page.locator('nav button', {hasText: 'الأسبوع'}).click();
    const first = of(await clickThenRead(page, 'nav button', 'اليوم'), 'today');
    expect(first.drawing).toBe(0);
    expect([first.centre, first.shares]).toEqual([final.centre, final.finals]);
  });
});
