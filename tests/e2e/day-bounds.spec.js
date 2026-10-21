// Choosing when the day starts and ends (feature 018): an early start, a late night and the date at night, a block
// left outside the day, and the guide. All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, stored, EXAMPLE, seed} = require('./helpers');

const settings = async page => ((await stored(page, 'mizan-settings')) || {}).data;
const openEditor = async page => { await tab(page, 'الإعدادات'); await button(page, 'عدّل الجدول').click(); };
const openDay = page => page.locator('summary', {hasText: 'يومك'}).click();
const clickAndReload = (page, name) => Promise.all([page.waitForEvent('load'), button(page, name).click()]);
const saveSchedule = async page => { await button(page, 'احفظ الجدول').click(); await clickAndReload(page, 'أيوه، احفظ'); };

test('an early day: a 05:00 block is saved, opens Today, and the Week starts at 5ص', async ({page}) => {
  await openApp(page);
  await openEditor(page);
  await openDay(page);
  await page.fill('#day-start', '04:30');
  await button(page, 'ضيف بلوك').click();
  await page.fill('#ed-start', '05:00');
  await page.fill('#ed-title', 'Early study');
  await button(page, 'تمام').click();
  await saveSchedule(page);
  const s = await settings(page);
  expect(s.day).toEqual({start: '04:30', end: '01:00'});
  expect(s.week['4'].blocks[0].slice(0, 3)).toEqual(['05:00', 'study', 'Early study']);
  await expect(page.locator('.timeline li').first()).toContainText('Early study');
  await tab(page, 'الأسبوع');
  await expect(page.locator('.axis-track span').first()).toHaveText('5ص');
});

// The example with a day that ends at 03:00 and a Thursday block at 01:30 after midnight.
const lateNight = () => {
  const s = JSON.parse(JSON.stringify(EXAMPLE));
  s.day = {start: '07:00', end: '03:00'};
  s.week['4'].blocks.push(['25:30', 'study', 'Night study']);
  return s;
};

test('a late night: until 03:00 Today is still Thursday with its night block now; at 03:10 it is Friday', async ({page}) => {
  await openApp(page, {at: new Date('2026-10-15T23:30:00Z'), before: seed(lateNight())});   // 02:30 on Friday in Cairo
  await expect(page.locator('main h1')).toHaveText('الخميس');
  await expect(page.locator('.timeline li', {hasText: 'Night study'})).toContainText('دلوقتي');
  await page.clock.setFixedTime(new Date('2026-10-16T00:10:00Z'));   // 03:10
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('الجمعة');
});

test('narrowing the day with blocks outside it is refused, names them, and stores nothing', async ({page}) => {
  await openApp(page);
  await openEditor(page);
  await openDay(page);
  await page.fill('#day-end', '20:30');
  await button(page, 'احفظ الجدول').click();
  await expect(page.locator('.notice', {hasText: 'الجدول ماتحفظش'})).toContainText('الخميس، البلوك 10 (21:00 وقتك): الوقت ده برّه يومك (من 7:00ص لحد 8:30م)');
  expect(await stored(page, 'mizan-settings')).toBeNull();
  await page.fill('#day-end', '06:00');
  await expect(page.locator('.ed-part .form-err')).toBeVisible();
});

test('the guide stores the day the user chose', async ({page}) => {
  await openApp(page);
  await button(page, 'اعمل جدولك').click();
  await page.fill('#pl-search', 'القاهرة');
  await page.locator('main .wk-pick').first().click();
  await button(page, 'التالي').click();
  await page.fill('#day-start', '05:00');
  await page.fill('#day-end', '02:00');
  await button(page, 'التالي').click();
  await button(page, 'كمّل وعدّل الأيام').click();
  await saveSchedule(page);
  expect((await settings(page)).day).toEqual({start: '05:00', end: '02:00'});
});
