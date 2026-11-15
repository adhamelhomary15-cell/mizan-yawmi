// The backup reminder above the day (feature 035): due 14 days after the last backup, or after the first run here
// when there is none; one tap saves the Settings file; «مش دلوقتي» puts it off 3 days; nothing without marks; it
// waits behind the install notice. All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, tab, stored, seed, EXAMPLE, THURSDAY_NIGHT} = require('./helpers');

const DAY = 86400000, T = THURSDAY_NIGHT.getTime();
const later = days => new Date(T + days * DAY);
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const reminder = page => page.locator('.notice', {hasText: 'نسخة احتياطية'}).filter({has: page.getByRole('button', {name: 'احفظ نسخة دلوقتي'})});
const reload = async page => { await page.reload(); await expect(page.locator('nav button').first()).toBeVisible(); };

// One mark (or none), and the last backup that many days before the test's time (or none), written once per test.
function state({mark = true, lastDaysAgo = null} = {}) {
  const meta = lastDaysAgo === null ? '' : `localStorage.setItem('mizan-backup-meta-v1', ${JSON.stringify(JSON.stringify({lastBackupAt: new Date(T - lastDaysAgo * DAY).toISOString()}))});`;
  return seed(EXAMPLE, mark ? {checks: {'2026-10-14': {x: true}}} : null) + `
  if (!sessionStorage.getItem('seeded-meta')) { sessionStorage.setItem('seeded-meta', '1'); ${meta} }`;
}

test.describe('at phone width', () => {
  test.use({viewport: {width: 375, height: 812}});

  test('due with one mark: it shows on «اليوم» only, with no sideways scroll', async ({page}) => {
    await openApp(page, {before: state({lastDaysAgo: 15})});
    await expect(reminder(page)).toContainText('بقالك أسبوعين أو أكتر');
    await expect(reminder(page)).toContainText('على التليفون ده بس');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await tab(page, 'الأسبوع');
    await expect(reminder(page)).toHaveCount(0);
  });
});

test('«احفظ نسخة دلوقتي» saves the Settings file, hides it, and restarts the count', async ({page}) => {
  await openApp(page, {before: state({lastDaysAgo: 20})});
  const [download] = await Promise.all([page.waitForEvent('download'), reminder(page).getByRole('button', {name: 'احفظ نسخة دلوقتي'}).click()]);
  expect(download.suggestedFilename()).toMatch(/^mizan-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(reminder(page)).toHaveCount(0);
  await expect(page.locator('.toast p')).toContainText('اتحفظت النسخة');
  expect((await stored(page, 'mizan-backup-meta-v1')).lastBackupAt).toBe(THURSDAY_NIGHT.toISOString());
  await reload(page);
  await expect(reminder(page)).toHaveCount(0);
  await tab(page, 'الإعدادات');
  await expect(page.locator('.sec', {has: page.getByRole('heading', {name: 'نسخة احتياطية'})})).toContainText('آخر نسخة');
});

test('«مش دلوقتي» hides it for 3 days, then it comes back', async ({page}) => {
  await openApp(page, {before: state({lastDaysAgo: 20})});
  await reminder(page).getByRole('button', {name: 'مش دلوقتي'}).click();
  await expect(reminder(page)).toHaveCount(0);
  await reload(page);
  await expect(reminder(page)).toHaveCount(0);
  await page.clock.setFixedTime(later(2.9));
  await reload(page);
  await expect(reminder(page)).toHaveCount(0);
  await page.clock.setFixedTime(later(3.1));
  await reload(page);
  await expect(reminder(page)).toBeVisible();
});

test('nothing to lose: no reminder, whatever the dates', async ({page}) => {
  await openApp(page, {before: state({mark: false, lastDaysAgo: 40})});
  await expect(page.locator('.day, main').first()).toBeVisible();
  await expect(reminder(page)).toHaveCount(0);
});

test('a backup 5 days old: no reminder', async ({page}) => {
  await openApp(page, {before: state({lastDaysAgo: 5})});
  await expect(reminder(page)).toHaveCount(0);
});

test('never backed up: nothing on the first open, the reminder 14 days later', async ({page}) => {
  await openApp(page, {before: state()});
  await expect(reminder(page)).toHaveCount(0);
  expect((await stored(page, 'mizan-backup-reminder')).since).toBe(THURSDAY_NIGHT.toISOString());
  await page.clock.setFixedTime(later(14));
  await reload(page);
  await expect(reminder(page)).toContainText('لسه ما عملتش نسخة احتياطية');
});

test('a failed save keeps the reminder with the Settings message, and the count does not restart', async ({page}) => {
  await openApp(page, {before: state({lastDaysAgo: 20}) + `
  URL.createObjectURL = () => { throw new Error('blocked'); };`});
  await reminder(page).getByRole('button', {name: 'احفظ نسخة دلوقتي'}).click();
  await expect(reminder(page)).toContainText('مقدرتش أحفظ الملف');
  expect((await stored(page, 'mizan-backup-meta-v1')).lastBackupAt).toBe(new Date(T - 20 * DAY).toISOString());
});

test('with storage refused, the save-failure notice offers the backup and the reminder waits, with no error', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await openApp(page, {before: state({lastDaysAgo: 20}) + `
  Storage.prototype.setItem = () => { throw new Error('blocked'); };`});
  await expect(page.locator('.notice', {hasText: 'آخر تغيير ماتحفظش'})).toBeVisible();
  await expect(reminder(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test.describe('on an iPhone in Safari', () => {
  test.use({userAgent: IPHONE, hasTouch: true});
  test('the install notice shows first, and the reminder after «تمام»', async ({page}) => {
    await openApp(page, {before: state({lastDaysAgo: 20})});
    await expect(page.locator('.install-hint')).toBeVisible();
    await expect(reminder(page)).toHaveCount(0);
    await page.locator('.install-hint').getByRole('button', {name: 'تمام'}).click();
    await expect(reminder(page)).toBeVisible();
  });
});
