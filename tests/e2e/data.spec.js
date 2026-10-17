// Stored data (feature 013): the move from the old keys, recovery from the IndexedDB copy, the browser without
// IndexedDB, the save-failure notice, a backup round trip, and a settings import.
const path = require('path');
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, progress, noticeTitles} = require('./helpers');

const mirrorCopy = (page, store) => page.evaluate(s => new Promise(done => {
  const rq = indexedDB.open('mizan', 1);
  rq.onsuccess = () => { const g = rq.result.transaction('copies').objectStore('copies').get(s); g.onsuccess = () => done(g.result || null); };
  rq.onerror = () => done(null);
}), store);

test('old keys move to the new ones, and a broken entry is set aside, not lost', async ({page}) => {
  await openApp(page, {before: () => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('fall26-planner-v1', JSON.stringify({v: 1, checks: {'2026-10-14': {'08:30-study': true, x: 'oops'}},
      modules: {}, tasks: [{id: 't1', text: 'generated task', tag: 'uni', due: '', done: false, created: '2026-10-13'}, {text: 'no id'}],
      appts: [], courses: [], mainCourse: 'aa', extras: {}, phaseSeen: 'A'}));
  }});
  const p = await progress(page);
  expect(p.checks['2026-10-14']).toEqual({'08:30-study': true});
  expect(p.tasks.map(t => t.text)).toEqual(['generated task']);
  expect(p.setAside.map(x => x.value)).toEqual(['oops', {text: 'no id'}]);
  expect(await page.evaluate(() => localStorage.getItem('fall26-planner-v1'))).toBeNull();
  expect(await noticeTitles(page)).toContain('فيه 2 حاجة في بياناتك شكلها بايظ');
});

test('with localStorage wiped, the data comes back from the IndexedDB copy', async ({page}) => {
  await openApp(page);
  await page.locator('main [role=checkbox]').first().click();
  await expect.poll(async () => JSON.stringify(((await mirrorCopy(page, 'progress')) || {}).data || {})).toContain('true');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.notice', {hasText: 'رجّعنا بياناتك من النسخة المحفوظة على الجهاز.'})).toBeVisible();
  expect(Object.values((await progress(page)).checks['2026-10-15'])).toContain(true);
});

test('without IndexedDB the app still saves, and Settings says the extra copy is off', async ({page}) => {
  await openApp(page, {before: () => { Object.defineProperty(window, 'indexedDB', {value: undefined, configurable: true}); }});
  await page.locator('main [role=checkbox]').first().click();
  await expect.poll(async () => Object.values((await progress(page)).checks['2026-10-15'] || {})).toContain(true);
  await tab(page, 'الإعدادات');
  await expect(page.locator('.storage-line', {hasText: 'مش بيسمح بنسخة تانية'})).toBeVisible();
});

test('a refused save shows the save-failure notice', async ({page}) => {
  await openApp(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('full'); }; });
  await page.locator('main [role=checkbox]').first().click();
  await expect(page.locator('.notice', {hasText: 'آخر تغيير ماتحفظش على الجهاز'})).toBeVisible();
});

test('a backup file restores the data exactly as it was', async ({page}, info) => {
  await openApp(page);
  await page.locator('main [role=checkbox]').first().click();
  await tab(page, 'الإعدادات');
  const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'احفظ نسخة احتياطية').click()]);
  const file = info.outputPath('backup.json');
  await download.saveAs(file);
  const before = await progress(page);
  await tab(page, 'اليوم');
  await page.locator('main [role=checkbox]').nth(1).click();
  await tab(page, 'الإعدادات');
  await page.setInputFiles('#backup-file', file);
  await button(page, 'استرجع').click();
  await page.waitForLoadState('load');
  await expect.poll(async () => JSON.stringify((await progress(page)).checks)).toBe(JSON.stringify(before.checks));
});

test('importing a settings file replaces the example', async ({page}) => {
  await openApp(page);
  await tab(page, 'الإعدادات');
  await page.locator('main input[type=file]:not(#backup-file)').setInputFiles(path.join(__dirname, '..', '..', 'settings.example.json'));
  await expect(page.locator('.notice', {hasText: 'جاهز للاستيراد'})).toBeVisible();
  await button(page, 'استبدل').click();
  await page.waitForLoadState('load');
  await expect(page.locator('.notice', {hasText: 'ده جدول مثال عام'})).toHaveCount(0);
});
