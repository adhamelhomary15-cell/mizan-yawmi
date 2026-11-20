// An easier first run (feature 036): the guide in two steps, cities suggested from the device's time zone, and «ابدأ»
// storing the schedule without the editor. The tests run in Africa/Cairo (playwright.config.js). All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, stored} = require('./helpers');

const settings = async page => ((await stored(page, 'mizan-settings')) || {}).data;
const near = page => page.locator('main .near-cities .wk-pick');
const startGuide = async page => { await button(page, 'اعمل جدولك').click(); await expect(page.locator('main h1')).toHaveText('اعمل جدولك'); };
const reload = async page => { await page.reload(); await expect(page.locator('nav button').first()).toBeVisible(); };

test.describe('at phone width', () => {
  test.use({viewport: {width: 375, height: 812}});

  test('from the example to my own day in 4 taps, with no typing', async ({page}) => {
    await openApp(page);
    await startGuide(page);                                   // 1
    await expect(page.locator('main .sub')).toHaveText('1 من 2: إنت فين؟');
    await expect(near(page)).toHaveCount(6);
    await expect(near(page).first()).toContainText('القاهرة');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await near(page).first().click();                         // 2
    await expect(page.locator('main .place-pick b').first()).toHaveText('القاهرة');
    await button(page, 'التالي').click();                      // 3
    await expect(page.locator('main .sub')).toHaveText('2 من 2: أسبوعك شكله إيه؟');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await button(page, 'ابدأ').click();                        // 4
    await expect(page.locator('.toast p')).toHaveText('اتحفظ الجدول');
    await expect(page.locator('nav button[aria-current="page"]')).toContainText('اليوم');
    await expect(page.locator('.notice', {hasText: 'ده جدول مثال عام'})).toHaveCount(0);
    const s = await settings(page);
    expect(s.location.label).toBe('القاهرة');
    expect(s.prayerMethod).toBe('Egyptian');
    await reload(page);
    await expect(page.locator('.notice', {hasText: 'ده جدول مثال عام'})).toHaveCount(0);
  });
});

test('«عدّل الأيام الأول» opens the editor and stores nothing', async ({page}) => {
  await openApp(page);
  await startGuide(page);
  await near(page).first().click();
  await button(page, 'التالي').click();
  await button(page, 'عدّل الأيام الأول').click();
  await expect(page.locator('main h1')).toHaveText('عدّل الجدول');
  expect(await stored(page, 'mizan-settings')).toBeNull();
});

test('over a stored schedule, «ابدأ» asks first, and «لأ» stores nothing', async ({page}) => {
  await openApp(page);
  await startGuide(page);
  await near(page).nth(1).click();
  await button(page, 'التالي').click();
  await button(page, 'ابدأ').click();
  await expect(page.locator('.toast p')).toHaveText('اتحفظ الجدول');
  const first = await stored(page, 'mizan-settings');
  await tab(page, 'الإعدادات');
  await button(page, 'اعمل جدولك من الأول').click();
  await near(page).first().click();
  await button(page, 'التالي').click();
  await button(page, 'ابدأ').click();
  await expect(page.locator('main .notice', {hasText: 'ده هيبدّل جدولك الحالي'})).toBeVisible();
  await button(page, 'لأ').click();
  expect(await stored(page, 'mizan-settings')).toEqual(first);
  await button(page, 'ابدأ').click();
  await button(page, 'أيوه، ابدأ').click();
  await expect(page.locator('.toast p')).toHaveText('اتحفظ الجدول');
  expect((await settings(page)).location.label).toBe('القاهرة');
});

test('with storage refused, the guide stays and says the schedule was not stored', async ({page}) => {
  await openApp(page, {before: () => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; }});
  await startGuide(page);
  await near(page).first().click();
  await button(page, 'التالي').click();
  await button(page, 'ابدأ').click();
  await expect(page.locator('main .form-err')).toHaveText('المتصفح ده مش بيسمح بالحفظ، فالجدول مش هيتخزن.');
  await expect(page.locator('main h1')).toHaveText('اعمل جدولك');
});

test('day hours outside the range disable both ways forward', async ({page}) => {
  await openApp(page);
  await startGuide(page);
  await near(page).first().click();
  await button(page, 'التالي').click();
  await page.getByText('تفاصيل اختيارية').click();
  await page.fill('#day-start', '14:00');
  await expect(button(page, 'ابدأ')).toBeDisabled();
  await expect(button(page, 'عدّل الأيام الأول')).toBeDisabled();
  await page.fill('#day-start', '06:00');
  await expect(button(page, 'ابدأ')).toBeEnabled();
});

test.describe('in a time zone with no listed city', () => {
  test.use({timezoneId: 'Europe/Oslo'});
  test('no suggestions show, and the search works', async ({page}) => {
    await openApp(page);
    await startGuide(page);
    await expect(near(page)).toHaveCount(0);
    await page.fill('#pl-search', 'القاهرة');
    await page.locator('main .wk-pick').first().click();
    await expect(page.locator('main .place-pick b').first()).toHaveText('القاهرة');
  });
});
