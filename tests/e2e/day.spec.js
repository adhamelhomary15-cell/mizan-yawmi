// The day: loading under the CSP, ticking, cancelling with undo, and postponing in the day review.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, cspViolations, progress} = require('./helpers');

test('every tab opens with no CSP violation', async ({page}) => {
  await openApp(page);
  for (const name of ['الأسبوع', 'الكورس', 'المهام', 'تمارين', 'الإعدادات', 'اليوم']) {
    await tab(page, name);
    await expect(page.locator('main')).toBeVisible();
  }
  expect(await cspViolations(page)).toEqual([]);
});

test('a tick is saved, and survives a reload', async ({page}) => {
  await openApp(page);
  await page.locator('main [role=checkbox]').first().click();
  await expect.poll(async () => Object.values((await progress(page)).checks['2026-10-15'] || {})).toContain(true);
  await page.reload();
  await expect(page.locator('main [role=checkbox][aria-checked=true]').first()).toBeVisible();
});

test('a cancelled block comes back with undo', async ({page}) => {
  await openApp(page);
  await page.locator('main button', {hasText: 'مثال: مذاكرة مادة 2'}).first().click();
  await button(page, 'اتلغى النهارده').click();
  await expect.poll(async () => Object.values((await progress(page)).checks['2026-10-15'] || {})).toContain('skip');
  await page.locator('.toast button', {hasText: 'رجّعها'}).click();
  await expect.poll(async () => (await progress(page)).checks['2026-10-15']).toBeUndefined();
});

test('the review postpones an open block into the next free time', async ({page}) => {
  await openApp(page);
  await button(page, 'راجع يومك').first().click();
  await button(page, 'أجّلها').first().click();
  await button(page, 'تمام').click();
  await expect.poll(async () => Object.keys((await progress(page)).extras)).toEqual(['2026-10-16']);
  const marks = Object.values((await progress(page)).checks['2026-10-15']);
  expect(marks).toEqual([{moved: '2026-10-16'}]);
});
