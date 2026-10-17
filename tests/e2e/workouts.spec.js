// The workout log: a workout with one set, and an exercise drawing downloaded on tap.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, stored} = require('./helpers');

test('a workout with one finished set is saved', async ({page}) => {
  await openApp(page);
  await tab(page, 'تمارين');
  await button(page, 'ابدأ تمرينة فاضية').click();
  await button(page, 'ضيف تمرين').click();
  await page.locator('.wk-pick', {hasText: 'Bench Press'}).first().click();
  await page.getByLabel('Bench Press، مجموعة 1، الوزن بالكيلو').fill('60');
  await page.getByLabel('Bench Press، مجموعة 1، التكرارات').fill('8');
  await page.getByLabel('خلّصت مجموعة 1').click();
  await expect.poll(async () => JSON.stringify(((await stored(page, 'mizan-workouts')) || {}).data.current)).toContain('"done":true');
});

test('a custom exercise downloads its drawing on tap', async ({page}) => {
  await openApp(page);
  await tab(page, 'تمارين');
  await button(page, 'التمارين').click();
  await page.locator('main input[type=text]').last().fill('Cable Fly');
  await button(page, 'ضيف تمرين').click();
  await page.locator('.wk-pick', {hasText: 'Cable Fly'}).click();
  await button(page, 'نزّل الرسمة').click();
  await expect(page.locator('.wk-ex-detail img')).toHaveCount(3);
});
