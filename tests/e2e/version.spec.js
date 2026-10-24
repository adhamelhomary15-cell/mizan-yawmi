// New versions on return, and the version in Settings (feature 026). The full path, from a newly published version
// to the notice and the new code in Settings, needs a second build served in place, so it was checked by hand (tasks
// T006). These tests cover the trigger, its limit, offline, the network it uses and the Settings line. All data is
// generated.
const {test, expect} = require('@playwright/test');
const {THURSDAY_NIGHT, openApp, tab} = require('./helpers');

// Counts the browser's update checks; the page's own code calls ServiceWorkerRegistration.update.
const countUpdates = () => {
  window.__updates = 0;
  const update = ServiceWorkerRegistration.prototype.update;
  ServiceWorkerRegistration.prototype.update = function(){ window.__updates++; return update.call(this); };
};
// Opens the app and waits until its service worker controls the page, as an installed app is.
async function openInstalled(page, options) {
  await openApp(page, options);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}
const comeBack = page => page.evaluate(() => {
  for (const s of ['hidden', 'visible']) {
    Object.defineProperty(document, 'visibilityState', {value: s, configurable: true});
    document.dispatchEvent(new Event('visibilitychange'));
  }
});
const later = (page, ms) => page.clock.setFixedTime(new Date(THURSDAY_NIGHT.getTime() + ms));
const updates = page => page.evaluate(() => window.__updates);
const versionLine = page => page.locator('main p', {hasText: 'النسخة:'});

test.describe('US1: a new version is looked for when the app comes back', () => {
  test('a return looks for it at most once a minute, the load counting as the first look', async ({page}) => {
    await openInstalled(page, {before: countUpdates});
    await comeBack(page);
    expect(await updates(page)).toBe(0);
    await later(page, 61000);
    await comeBack(page);
    await expect.poll(() => updates(page)).toBe(1);
    await comeBack(page);
    expect(await updates(page)).toBe(1);
    await later(page, 122000);
    await comeBack(page);
    await expect.poll(() => updates(page)).toBe(2);
  });

  test('offline, a return shows no error and the app keeps working', async ({page, context}) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await openInstalled(page);
    await context.setOffline(true);
    await later(page, 61000);
    await comeBack(page);
    await page.waitForTimeout(500);
    await expect(page.locator('.notice', {hasText: 'فيه نسخة جديدة'})).toHaveCount(0);
    await tab(page, 'الأسبوع');
    await expect(page.locator('main h1')).toBeVisible();
    expect(errors).toEqual([]);
    await context.setOffline(false);
  });

  // Every request from the first load on is recorded. A browser may join the return's check to one already running,
  // so the check's own request can come before the return; the update count shows the return asked for it.
  test('the app contacts only its own site, and a return leaves the stored data as it was', async ({page, context, baseURL, browserName}) => {
    const seen = [];
    context.on('request', r => seen.push(r.url()));
    await openInstalled(page, {before: countUpdates});
    await page.locator('main [role=checkbox]').first().click();
    const stored = () => page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
    const before = await stored();
    await later(page, 61000);
    await comeBack(page);
    await expect.poll(() => updates(page)).toBe(1);
    await page.waitForTimeout(500);
    expect(seen.every(u => u.startsWith(new URL(baseURL).origin))).toBe(true);
    // Chromium reports the service worker's own requests for sw.js; Playwright's WebKit does not.
    if (browserName === 'chromium') expect(seen.some(u => new URL(u).pathname.endsWith('/sw.js'))).toBe(true);
    expect(await stored()).toBe(before);
  });
});

test.describe('US2: the version in Settings', () => {
  test('the line shows the running code, the same as the service worker\'s, and the day it arrived', async ({page}) => {
    await openInstalled(page);
    const code = await page.evaluate(() => document.querySelector('meta[name="mizan-version"]').content);
    expect(code).toMatch(/^[0-9a-f]{10}$/);
    expect(await page.evaluate(() => fetch('sw.js').then(r => r.text()))).toContain("'mizan-" + code + "'");
    await tab(page, 'الإعدادات');
    await expect(versionLine(page)).toContainText(code);
    await expect(versionLine(page)).toContainText('وصلت');
  });

  test('with a newer version installed, the line says so and «افتحها» opens it', async ({page}) => {
    await openInstalled(page);
    await page.evaluate(async () => {
      const c = await caches.open('mizan-0000000000');
      await c.put('./version', new Response(JSON.stringify({code: '0000000000', at: Date.now()})));
      window.__same = 1;
    });
    await tab(page, 'الإعدادات');
    await expect(versionLine(page)).toContainText('فيه نسخة أحدث جاهزة');
    await versionLine(page).locator('button', {hasText: 'افتحها'}).click();
    // A new page has no mark; the old one is still there for a moment after the tap.
    await expect.poll(() => page.evaluate(() => window.__same).catch(() => 1)).toBeUndefined();
  });

  test.describe('without service workers', () => {
    test.use({serviceWorkers: 'block'});
    test('the line shows the code alone, with no error', async ({page}) => {
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await openApp(page);
      const code = await page.evaluate(() => document.querySelector('meta[name="mizan-version"]').content);
      await tab(page, 'الإعدادات');
      await expect(versionLine(page)).toHaveText('النسخة: ' + code);
      expect(errors).toEqual([]);
    });
  });
});
