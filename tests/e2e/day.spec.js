// The day: loading under the CSP, ticking, cancelling with undo, and postponing in the day review, from the timeline
// (019) and for a late task.
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

// What postponing stored, without the extra block's random id.
const postponed = async page => { const p = await progress(page); return {checks: p.checks, extras: JSON.parse(JSON.stringify(p.extras, (k, v) => k === 'id' ? undefined : v))}; };
const row = (page, title) => page.locator('.timeline li', {hasText: title});

test('«أجّلها» on the timeline stores what the review stores, and one undo puts it all back', async ({page}) => {
  await openApp(page);
  const before = await progress(page);
  await row(page, 'مثال: مذاكرة مادة 1').locator('.row-body').click();
  await row(page, 'مثال: مذاكرة مادة 1').locator('button', {hasText: 'أجّلها'}).click();
  await row(page, 'مثال: مذاكرة مادة 1').locator('button', {hasText: 'تمام'}).click();
  await expect(row(page, 'مثال: مذاكرة مادة 1').locator('.meta')).toContainText('اتأجل لـ');
  const fromTimeline = await postponed(page);
  await page.locator('.toast button', {hasText: 'رجّعها'}).click();
  await expect.poll(() => progress(page)).toEqual(before);

  await button(page, 'راجع يومك').first().click();
  await page.locator('.review-list li', {hasText: 'مثال: مذاكرة مادة 1'}).locator('button', {hasText: 'أجّلها'}).click();
  await button(page, 'تمام').click();
  await expect.poll(() => postponed(page)).toEqual(fromTimeline);
});

test('a block of a kind that cannot be postponed has no «أجّلها» on the timeline', async ({page}) => {
  await openApp(page);
  await row(page, 'مثال: شغل').first().locator('.row-body').click();
  await expect(row(page, 'مثال: شغل').first().locator('.row-actions button', {hasText: 'اتلغى النهارده'})).toBeVisible();
  await expect(row(page, 'مثال: شغل').first().locator('.row-actions button', {hasText: 'أجّلها'})).toHaveCount(0);
});

test('a late task moves to tomorrow with «أجّلها», and «رجّعها» brings it back undone; a task for today has «أجّلها» too (028)', async ({page}) => {
  await openApp(page, {before: () => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('fall26-planner-v1', JSON.stringify({v: 1, checks: {}, modules: {}, appts: [], courses: [], extras: {}, phaseSeen: 'A',
      tasks: [{id: 't1', text: 'Generated late task', tag: 'uni', due: '2026-10-13', done: false}, {id: 't2', text: 'Generated task for today', tag: 'work', due: '2026-10-15', done: false}]}));
  }});
  const tasks = page.locator('.o-tasks .titem');
  await expect(tasks.filter({hasText: 'Generated task for today'}).locator('button', {hasText: 'أجّلها'})).toBeVisible();
  await tasks.filter({hasText: 'Generated late task'}).locator('button', {hasText: 'أجّلها'}).click();
  await expect.poll(async () => (await progress(page)).tasks.map(t => [t.id, t.due, t.done])).toEqual([['t1', '2026-10-16', false], ['t2', '2026-10-15', false]]);
  await page.locator('.toast button', {hasText: 'رجّعها'}).click();
  await expect.poll(async () => (await progress(page)).tasks.map(t => [t.id, t.due, t.done])).toEqual([['t1', '2026-10-13', false], ['t2', '2026-10-15', false]]);
});
