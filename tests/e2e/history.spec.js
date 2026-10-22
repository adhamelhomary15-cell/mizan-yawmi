// Past days keep the schedule they had (feature 020): a change in the editor, a second save the same day, an import,
// going back to the example, a backup round trip, the export, and a kind removed since. Generated data only.
const path = require('path');
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, stored, EXAMPLE, seed} = require('./helpers');

const settings = async page => ((await stored(page, 'mizan-settings')) || {}).data;
const clickAndReload = (page, name) => Promise.all([page.waitForEvent('load'), button(page, name).click()]);
// The day shown on Today at a date: the clock moves there and the page opens again.
const openOn = async (page, iso) => {
  await page.clock.setFixedTime(new Date(iso + 'T15:00:00Z'));
  await page.reload();
  await expect(page.locator('nav button').first()).toBeVisible();
};
const dayTitles = async page => (await page.locator('main ol li .title').allInnerTexts()).map(t => t.split(' · ')[0]);
const exampleFile = path.join(__dirname, '..', '..', 'settings.example.json');
const THURSDAY = new Date('2026-10-15T15:00:00Z');

// The example's Tuesday, and its first tracked block, which these tests tick and change.
const TUESDAY = EXAMPLE.week['2'].blocks;
const TRACKED = TUESDAY.find(b => EXAMPLE.categories[b[1]] && EXAMPLE.categories[b[1]].track);
const KEY = TRACKED[0] + '-' + TRACKED[1];
// The example with its Tuesday's first block renamed, so it differs from the example on that day.
const OWN = (() => { const s = JSON.parse(JSON.stringify(EXAMPLE)); s.week['2'].blocks[0][2] = 'تلات بتاعي'; return s; })();

test('a change in the editor leaves a past day and its week as they were', async ({page}) => {
  await openApp(page, {at: THURSDAY, before: seed(EXAMPLE, {checks: {'2026-10-06': {[KEY]: true}}})});
  await tab(page, 'الأسبوع');
  await page.locator('main button[aria-label="الأسبوع اللي فات"]').click();
  const lastWeek = await page.locator('main .weekv').innerText();

  await tab(page, 'الإعدادات');
  await button(page, 'عدّل الجدول').click();
  await page.locator('main .dp', {hasText: 'تلات'}).click();
  await page.locator('main .ed-row', {hasText: TRACKED[2]}).click();
  await button(page, 'امسح البلوك').click();
  await button(page, 'احفظ الجدول').click();
  await expect(page.locator('.notice', {hasText: 'هتحفظ التغييرات دي؟'})).toContainText('الجدول الجديد بيبدأ من النهارده');
  await clickAndReload(page, 'أيوه، احفظ');
  expect((await settings(page)).history).toEqual([{until: '2026-10-14', days: {'2': EXAMPLE.week['2']}}]);

  await tab(page, 'الأسبوع');
  await page.locator('main button[aria-label="الأسبوع اللي فات"]').click();
  await expect.poll(() => page.locator('main .weekv').innerText()).toBe(lastWeek);
  await openOn(page, '2026-10-06');
  await expect(page.locator('main ol li', {hasText: TRACKED[2]}).locator('[role=checkbox]')).toHaveAttribute('aria-checked', 'true');
  await openOn(page, '2026-10-20');
  expect(await dayTitles(page)).not.toContain(TRACKED[2]);
});

test('the summary names today, and a second save the same day adds no entry', async ({page}) => {
  await openApp(page, {at: THURSDAY, before: seed(EXAMPLE)});
  for (const title of ['أول تعديل', 'تاني تعديل']) {
    await tab(page, 'الإعدادات');
    await button(page, 'عدّل الجدول').click();
    await page.locator('main .dp', {hasText: 'تلات'}).click();
    await page.locator('main .ed-row').first().click();
    await page.fill('#ed-title', title);
    await button(page, 'تمام').click();
    await button(page, 'احفظ الجدول').click();
    await expect(page.locator('.notice', {hasText: 'هتحفظ التغييرات دي؟'})).toContainText('الخميس');
    await clickAndReload(page, 'أيوه، احفظ');
  }
  const s = await settings(page);
  expect(s.history.map(h => h.until)).toEqual(['2026-10-14']);
  expect(s.week['2'].blocks[0][2]).toBe('تاني تعديل');
});

test('an import, going back to the example and a backup round trip keep the history; the export leaves it out', async ({page}, info) => {
  await openApp(page, {at: new Date('2026-10-17T15:00:00Z'), before: seed(OWN)});
  await tab(page, 'الإعدادات');
  await page.locator('#settings-file').setInputFiles(exampleFile);
  await clickAndReload(page, 'استبدل');
  await openOn(page, '2026-10-13');
  expect(await dayTitles(page)).toContain('تلات بتاعي');
  await openOn(page, '2026-10-20');
  expect(await dayTitles(page)).not.toContain('تلات بتاعي');

  await openOn(page, '2026-10-18');
  await tab(page, 'الإعدادات');
  const [backup] = await Promise.all([page.waitForEvent('download'), button(page, 'احفظ نسخة احتياطية').click()]);
  const backupFile = info.outputPath('backup.json');
  await backup.saveAs(backupFile);
  const [exported] = await Promise.all([page.waitForEvent('download'), button(page, 'صدّر جدولي كملف').click()]);
  const exportFile = info.outputPath('schedule.json');
  await exported.saveAs(exportFile);
  expect(JSON.parse(require('fs').readFileSync(exportFile, 'utf8'))).not.toHaveProperty('history');
  const before = (await settings(page)).history;

  await button(page, 'رجّع المثال').click();
  await clickAndReload(page, 'أيوه، ارجع للمثال');
  const reset = await settings(page);
  expect(reset.fromExample).toBe(true);
  expect(reset.history).toEqual(before);
  await expect(page.locator('.notice', {hasText: 'ده جدول مثال عام'})).toBeVisible();
  await openOn(page, '2026-10-13');
  expect(await dayTitles(page)).toContain('تلات بتاعي');

  await tab(page, 'الإعدادات');
  await page.setInputFiles('#backup-file', backupFile);
  // The restore writes, then opens the page again. The history alone cannot tell the two apart (going back to the
  // example kept it), so wait until fromExample is gone as well.
  await button(page, 'استرجع').click();
  const restored = async () => { const r = await settings(page).catch(() => null); return r ? {history: r.history, fromExample: 'fromExample' in r} : null; };
  await expect.poll(restored).toEqual({history: before, fromExample: false});
});

test('a past block of a kind removed since shows as «نوع اتمسح»', async ({page}) => {
  const s = Object.assign(JSON.parse(JSON.stringify(EXAMPLE)), {history: [{until: '2026-10-14', days: {'2': {blocks: [['08:00', 'k5', 'بلوك نوعه اتمسح'], ['12:00', 'study', 'مذاكرة قديمة']]}}}]});
  await openApp(page, {at: new Date('2026-10-13T15:00:00Z'), before: seed(s)});
  await expect(page.locator('main ol li', {hasText: 'بلوك نوعه اتمسح'})).toContainText('نوع اتمسح');
  await openOn(page, '2026-10-20');
  expect(await dayTitles(page)).not.toContain('بلوك نوعه اتمسح');
});
