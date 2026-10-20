// Asking on its own to postpone (feature 015): the notice after a day ends, «أجّل الكل» with its undo, «راجعها»,
// «مش دلوقتي», several missed days, and no notice once the question is answered. All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, button, progress} = require('./helpers');

// Friday 2026-10-16, 10:00 in Cairo: the example's Thursday has ended with its study and course blocks open.
const FRIDAY = new Date('2026-10-16T07:00:00Z');
const notice = page => page.locator('[aria-label="حاجات ماتعملتش"]');
// Stored progress under the old key (the move to the new keys keeps askedUpTo), written once per test.
const seed = askedUpTo => {
  const data = JSON.stringify({v: 1, checks: {}, modules: {}, tasks: [], appts: [], courses: [], mainCourse: 'aa', extras: {}, phaseSeen: 'A', askedUpTo});
  return `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('fall26-planner-v1', ${JSON.stringify(data)}); }`;
};
const openWith = (page, askedUpTo) => openApp(page, {at: FRIDAY, before: askedUpTo === undefined ? undefined : seed(askedUpTo)});
const overlaps = list => list.some((a, i) => list.some((b, j) => i !== j && a.s < b.e && a.e > b.s));

test('the first run asks about yesterday only, and showing the notice writes nothing', async ({page}) => {
  await openWith(page);
  await expect(notice(page)).toBeVisible();
  await expect(notice(page).locator('b').first()).toContainText('ماتعملتش امبارح');
  await expect(notice(page).locator('.small b')).toHaveCount(0);
  const p = await progress(page);
  expect(p ? p.askedUpTo : null).toBeNull();
  expect(p ? p.checks : {}).toEqual({});
});

test('«أجّل الكل» postpones them all, the notice stays away, and one undo puts the day back', async ({page}) => {
  await openWith(page);
  await button(page, 'أجّل الكل').click();
  await expect.poll(async () => (await progress(page)).askedUpTo).toBe('2026-10-15');
  const marks = Object.values((await progress(page)).checks['2026-10-15']);
  expect(marks.length).toBeGreaterThan(0);
  marks.forEach(m => expect(m).toHaveProperty('moved'));
  await expect(notice(page)).toHaveCount(0);
  await page.locator('.toast button', {hasText: 'رجّعها'}).click();
  await expect.poll(async () => (await progress(page)).checks['2026-10-15']).toBeUndefined();
  expect((await progress(page)).extras).toEqual({});
  expect((await progress(page)).askedUpTo).toBe('2026-10-15');
  await page.reload();
  await expect(page.locator('nav button').first()).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
});

test('«راجعها» opens the review of that day', async ({page}) => {
  await openWith(page);
  await button(page, 'راجعها').click();
  await expect(page.locator('.review h2')).toHaveText('مراجعة الخميس');
  await expect.poll(async () => (await progress(page)).askedUpTo).toBe('2026-10-15');
});

test('«مش دلوقتي» closes it for good, and changes nothing else', async ({page}) => {
  await openWith(page);
  await button(page, 'مش دلوقتي').click();
  await expect(notice(page)).toHaveCount(0);
  await expect.poll(async () => (await progress(page)).askedUpTo).toBe('2026-10-15');
  await page.reload();
  await expect(page.locator('nav button').first()).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
  expect((await progress(page)).checks).toEqual({});
});

test('several missed days: one notice, oldest first, and places that never overlap', async ({page}) => {
  await openWith(page, '2026-10-12');
  await expect(notice(page).locator('b').first()).toContainText('من يوم التلات');
  await expect(notice(page).locator('.small b')).toHaveText(['التلات', 'الأربع', 'الخميس']);
  await button(page, 'أجّل الكل').click();
  await expect.poll(async () => (await progress(page)).askedUpTo).toBe('2026-10-15');
  const p = await progress(page);
  expect(Object.keys(p.checks).sort()).toEqual(['2026-10-13', '2026-10-14', '2026-10-15']);
  const toMin = t => +t.slice(0, 2) * 60 + +t.slice(3) + (t < '07:00' ? 1440 : 0);
  Object.values(p.extras).forEach(list => expect(overlaps(list.map(x => ({s: toMin(x.s), e: toMin(x.e)})))).toBe(false));
});

test('no notice once yesterday is answered', async ({page}) => {
  await openWith(page, '2026-10-15');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
});
