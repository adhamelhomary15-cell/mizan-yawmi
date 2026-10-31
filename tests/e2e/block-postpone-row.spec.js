// «أجّلها» on the block's row (feature 029): an open block of a postponable kind shows the button once its time has
// come (a past day always, today once started, a future day never), and it opens the same proposal as the block's
// actions. The example week: on Thursday, مذاكرة at 08:30 and 14:30, شغل at 10:45, رياضة at 16:30, كورس at 19:00.
const {test, expect} = require('@playwright/test');
const {openApp} = require('./helpers');

const AT = new Date('2026-10-15T13:00:00Z');   // 16:00 on Thursday 15 October 2026 in Cairo
const rowButtons = page => page.locator('.timeline .row-pp button');
const labels = page => rowButtons(page).evaluateAll(bs => bs.map(b => b.getAttribute('aria-label')));
const STUDY_1 = 'أجّلها: مثال: مذاكرة مادة 1', STUDY_2 = 'أجّلها: مثال: مذاكرة مادة 2', COURSE = 'أجّلها: مثال: كورس';

test.describe('US1: today', () => {
  test('the open postponable blocks up to the one in progress have «أجّلها», later ones and other kinds none', async ({page}) => {
    await openApp(page, {at: AT});
    expect(await labels(page)).toEqual([STUDY_1, STUDY_2]);
    await expect(page.locator('.timeline .row', {hasText: 'مثال: شغل'}).locator('.row-pp')).toHaveCount(0);
  });

  test('a done block and a cancelled block lose it', async ({page}) => {
    await openApp(page, {at: AT});
    await page.getByRole('checkbox', {name: 'خلّصت: مثال: مذاكرة مادة 1'}).click();
    await page.locator('.timeline button.row-body', {hasText: 'مثال: مذاكرة مادة 2'}).click();
    await page.locator('.row-actions button', {hasText: 'اتلغى النهارده'}).click();
    expect(await labels(page)).toEqual([]);
  });

  test('one tap opens the proposal; «تمام» postpones the block and «رجّعها» brings the button back', async ({page}) => {
    await openApp(page, {at: AT});
    await page.getByRole('button', {name: STUDY_1}).click();
    await expect(page.locator('.postpone')).toContainText('هتتحط');
    await page.locator('.postpone button', {hasText: 'تمام'}).click();
    await expect(page.locator('.timeline .row', {hasText: 'مثال: مذاكرة مادة 1'})).toContainText('اتأجل لـ');
    await expect(page.getByRole('button', {name: STUDY_1})).toHaveCount(0);
    await page.locator('.toast button', {hasText: 'رجّعها'}).click();
    await expect(page.getByRole('button', {name: STUDY_1})).toHaveCount(1);
  });

  test('an opened row shows one «أجّلها», among its actions', async ({page}) => {
    await openApp(page, {at: AT});
    await page.locator('.timeline button.row-body', {hasText: 'مثال: مذاكرة مادة 1'}).click();
    const row = page.locator('.timeline .row', {hasText: 'مثال: مذاكرة مادة 1'});
    await expect(row.locator('button', {hasText: 'أجّلها'})).toHaveCount(1);
    await expect(row.locator('.row-actions button', {hasText: 'أجّلها'})).toHaveCount(1);
  });

  test('FR-004: when the clock passes a block\'s start, its row gains the button', async ({page}) => {
    await openApp(page, {at: AT});
    await expect(page.getByRole('button', {name: COURSE})).toHaveCount(0);
    await page.clock.setFixedTime(new Date('2026-10-15T16:01:00Z'));   // 19:01
    await page.clock.runFor(30000);
    await expect(page.getByRole('button', {name: COURSE})).toHaveCount(1);
  });
});

test.describe('US2: other days', () => {
  test('a past day shows it on every open postponable block, a future day on none', async ({page}) => {
    await openApp(page, {at: AT});
    await page.getByRole('button', {name: 'الأربع 14 أكتوبر'}).click();
    expect(await labels(page)).toEqual([STUDY_1, STUDY_2, COURSE]);
    await page.getByRole('button', {name: 'الجمعة 16 أكتوبر'}).click();
    expect(await labels(page)).toEqual([]);
  });
});

test('FR-005: at phone width the button is 44 px and nothing scrolls sideways', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await openApp(page, {at: AT});
  const box = await rowButtons(page).first().boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('the «الآن» line stays above the button on the row in progress', async ({page}) => {
  await openApp(page, {at: AT});
  const geo = await page.locator('.timeline .row.is-now').evaluate(r => ({
    line: r.querySelector('.nowline').getBoundingClientRect().top, button: r.querySelector('.row-pp button').getBoundingClientRect().top}));
  expect(geo.line).toBeLessThan(geo.button);
});
