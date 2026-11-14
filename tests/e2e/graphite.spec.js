// The graphite palette (feature 032): the accent fills the band, the primary button and the chosen day, and a late
// task is marked by an icon as well as its colour, read once by a screen reader. openApp's day is Thursday 15 October
// 2026. All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, EXAMPLE, seed} = require('./helpers');

test.use({reducedMotion: 'reduce'});

const task = (id, due, done = false) => ({id, text: 'Generated ' + id, tag: 'uni', due, done, created: '2026-10-10'});
const open = (page, tasks) => openApp(page, {before: seed(EXAMPLE, {tasks})});
const look = theme => `localStorage.setItem('mizan-look', JSON.stringify({theme: '${theme}'}));`;
const colours = (page, selector) => page.locator(selector).first().evaluate(e => { const s = getComputedStyle(e); return [s.backgroundColor, s.color]; });
const row = (page, id) => page.locator('.o-tasks .titem', {hasText: 'Generated ' + id});

for (const [theme, accent, on] of [['light', 'rgb(31, 31, 34)', 'rgb(255, 255, 255)'], ['dark', 'rgb(236, 236, 234)', 'rgb(18, 19, 20)']]) {
  test(`in ${theme}, the band, the primary button and the chosen day take the accent`, async ({page}) => {
    await openApp(page, {before: look(theme)});
    expect(await colours(page, 'nav.nav')).toEqual([accent, on]);
    expect(await colours(page, 'main .btn.primary')).toEqual([accent, on]);
    expect((await colours(page, '.dp[aria-pressed="true"]'))[0]).toBe(accent);
  });
}

test('a late task shows the icon, the word and the danger colour, and is read as late once', async ({page}) => {
  await open(page, [task('late', '2026-10-12')]);
  const due = row(page, 'late').locator('.tdue.late');
  await expect(due.locator('svg.late-ic')).toBeVisible();
  await expect(due).toContainText('متأخرة');
  expect(await due.evaluate(e => getComputedStyle(e).color)).toBe('rgb(180, 35, 24)');
  await expect(due.getByRole('img', {name: 'متأخرة'})).toHaveCount(1);
  // The visible word is hidden from screen readers, so the icon's label is the only «متأخرة» read.
  await expect(due.locator('[aria-hidden="true"]', {hasText: 'متأخرة'})).toHaveCount(1);
});

test('a task due today and a done one have no late icon', async ({page}) => {
  await open(page, [task('today', '2026-10-15'), task('done', '2026-10-12', true)]);
  await expect(row(page, 'today')).toBeVisible();
  await expect(page.locator('.o-tasks svg.late-ic')).toHaveCount(0);
});

test('at phone width nothing scrolls sideways, in light and dark', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  for (const theme of ['light', 'dark']) {
    await openApp(page, {before: look(theme)});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
