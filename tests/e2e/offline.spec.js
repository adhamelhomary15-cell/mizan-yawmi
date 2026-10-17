// The installed app: the service worker serves it offline, and an app update keeps the drawings the user downloaded.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button} = require('./helpers');

const cacheNames = page => page.evaluate(async () => (await caches.keys()).sort());

test('it opens offline, and an update keeps downloaded drawings', async ({page, context, browserName}) => {
  // Playwright's WebKit blocks every navigation while offline before the service worker can answer ("Blocked by Web
  // Inspector"), so this cannot be tested there. Chromium runs the worker the way Safari does for this path.
  test.skip(browserName === 'webkit', 'Playwright WebKit blocks offline navigation before the service worker');
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  // a drawing downloaded on tap, kept in its own cache
  await tab(page, 'تمارين');
  await button(page, 'التمارين').click();
  await page.locator('main input[type=text]').last().fill('Cable Fly');
  await button(page, 'ضيف تمرين').click();
  await page.locator('.wk-pick', {hasText: 'Cable Fly'}).click();
  await button(page, 'نزّل الرسمة').click();
  await expect(page.locator('.wk-ex-detail img')).toHaveCount(3);

  // offline: the page comes from the service worker, and the drawing from its cache
  await page.evaluate(() => { window.__before = true; });
  await context.setOffline(true);
  await page.reload();
  expect(await page.evaluate(() => !!window.__before)).toBe(false);   // a new page, served by the worker
  await expect(page.locator('nav button').first()).toBeVisible();
  await tab(page, 'تمارين');
  await button(page, 'التمارين').click();
  await expect(page.locator('.wk-pick', {hasText: 'Cable Fly'}).locator('img.wg-thumb')).toBeVisible();
  await context.setOffline(false);

  // An update: a new service worker activates while the old app cache is still there. Playwright cannot serve a changed
  // worker script, so the test puts back that state itself: an old app cache, then a new worker (a new script URL). Its
  // activate step must delete the old app cache and keep the downloaded drawings.
  await page.evaluate(async () => {
    await (await caches.open('mizan-0000000000')).put('/old', new Response('old app'));
    // a new script URL makes the browser install and activate a new worker, as a real update does
    const reg = await navigator.serviceWorker.register('sw.js?update=1', {updateViaCache: 'none'});
    await new Promise(done => { const w = reg.installing || reg.waiting; if (!w) return done(); w.addEventListener('statechange', () => { if (w.state === 'activated') done(); }); });
  });
  await expect.poll(async () => (await cacheNames(page)).includes('mizan-0000000000')).toBe(false);
  expect(await cacheNames(page)).toContain('mizan-guides-v1');
});
