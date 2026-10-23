// The «الآن» line (feature 023): where it sits in today's timeline, how it follows the clock, and that it moves no
// row and takes no tap. Times are on the example Thursday (2026-10-15, Cairo). All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp} = require('./helpers');

const at = hm => new Date('2026-10-15T' + hm + ':00+03:00');
// The row the line is on, the line's place in it as a share of the row's height, and the label.
const lineInfo = page => page.evaluate(() => {
  const line = document.querySelector('.nowline');
  if (!line) return null;
  const row = line.closest('li'), r = row.getBoundingClientRect(), l = line.getBoundingClientRect();
  return {time: row.querySelector('.time').innerText.replace(/\s+/g, ' '), share: (l.top - r.top) / r.height, cls: line.className,
    label: line.innerText.trim(), above: l.top < r.top, outline: row.classList.contains('is-now'), pill: !!row.querySelector('.now-pill')};
});
const rowBoxes = page => page.evaluate(() => [...document.querySelectorAll('.timeline > li')].map(e => { const b = e.getBoundingClientRect(); return [b.top, b.height]; }));

test.describe('US1: the moment inside the block in progress', () => {
  test('the line sits at the share of the block that has passed, with the outline, «دلوقتي» and the time', async ({page}) => {
    await openApp(page, {at: at('11:30')});
    const i = await lineInfo(page);
    expect(i.time).toContain('10:45');
    expect(Math.abs(i.share - 45 / 165)).toBeLessThan(0.05);
    expect([i.outline, i.pill]).toEqual([true, true]);
    expect(i.label).toBe('الآن 11:30ص');
  });

  test('with the app left open, the line follows the clock at the next refresh', async ({page}) => {
    await openApp(page, {at: at('11:30')});
    const before = await lineInfo(page);
    await page.clock.setFixedTime(at('12:00'));
    await page.clock.runFor(30000);
    await expect(page.locator('.nowline-t')).toHaveText('الآن 12:00م');
    // The line glides there over 450ms, so its place is waited for.
    await expect.poll(async () => Math.abs((await lineInfo(page)).share - 75 / 165)).toBeLessThan(0.05);
    expect((await lineInfo(page)).share).toBeGreaterThan(before.share);
  });

  test('when a block ends, the line moves to the top of the next one', async ({page}) => {
    await openApp(page, {at: at('13:29')});
    expect((await lineInfo(page)).time).toContain('10:45');
    await page.clock.setFixedTime(at('13:30'));
    await page.clock.runFor(30000);
    await expect(page.locator('.nowline-t')).toHaveText('الآن 1:30م');
    const i = await lineInfo(page);
    expect(i.time).toContain('1:30');
    expect(i.share).toBeLessThan(0.05);
  });
});

test('US2: before the day\'s first block, the line sits above its row', async ({page}) => {
  await openApp(page, {at: at('07:10')});
  const i = await lineInfo(page);
  expect(i.time).toContain('7:30');
  expect(i.cls).toContain('at-top');
  expect(i.above).toBe(true);
});

test('the check under the line ticks the block, and the row still opens', async ({page}) => {
  await openApp(page, {at: at('11:30')});
  const row = page.locator('.timeline > li', {has: page.locator('.nowline')});
  const check = row.locator('[role=checkbox]');
  await check.click();
  await expect(check).toHaveAttribute('aria-checked', 'true');
  await row.locator('button.row-body').click();
  await expect(row.locator('button.row-body')).toHaveAttribute('aria-expanded', 'true');
  expect(Math.abs((await lineInfo(page)).share - 45 / 165)).toBeLessThan(0.05);
});

test('the line shows on today only, and stays on the timeline with the review open', async ({page}) => {
  await openApp(page, {at: at('11:30')});
  await page.locator('.dp:not(.is-today)').first().click();
  await expect(page.locator('.nowline')).toHaveCount(0);
  await page.locator('main button', {hasText: 'النهارده'}).click();
  await expect(page.locator('.nowline')).toHaveCount(1);
  await page.locator('main button', {hasText: 'راجع يومك'}).first().click();
  await expect(page.locator('.o-now .nowline')).toHaveCount(0);
  await expect(page.locator('.o-timeline .nowline')).toHaveCount(1);
});

test('no row moves because of the line, and Today opens at the top', async ({page}) => {
  await openApp(page, {at: at('11:30')});
  const withLine = await rowBoxes(page);
  await page.evaluate(() => { document.querySelector('.nowline').style.display = 'none'; });
  expect(await rowBoxes(page)).toEqual(withLine);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test.describe('motion', () => {
  const duration = page => page.locator('.nowline').evaluate(e => getComputedStyle(e).transitionDuration);
  test('the line glides to its new place', async ({page}) => {
    await openApp(page, {at: at('11:30')});
    expect(await duration(page)).toBe('0.45s');
  });
  test.describe('with reduced motion', () => {
    test.use({reducedMotion: 'reduce'});
    test('it jumps', async ({page}) => {
      await openApp(page, {at: at('11:30')});
      expect(await duration(page)).toBe('0s');
    });
  });
});
