// Settings that apply without reopening the page (feature 020): a saved schedule, a new place, an imported file and
// the example back, each with no reload, the screen the same as after a reload, and progress untouched. All data is
// generated.
const fs = require('fs');
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, stored, applyChange, saveSchedule, EXAMPLE} = require('./helpers');

// A mark on the page that only a reload would remove.
const markPage = page => page.evaluate(() => { window.__same = 1; });
const samePage = page => page.evaluate(() => window.__same === 1);
const openEditor = async page => { await tab(page, 'الإعدادات'); await button(page, 'عدّل الجدول').click(); };
const exampleNotice = page => page.locator('.notice', {hasText: 'ده جدول مثال عام'});
// Progress and workouts as stored, to compare before and after a change.
const userData = page => page.evaluate(() => [localStorage.getItem('mizan-progress'), localStorage.getItem('mizan-workouts')]);
// What Today and Week show, to compare with a fresh load.
async function screens(page){
  await tab(page, 'اليوم');
  const today = [await page.locator('main h1').innerText(), await page.locator('.timeline').innerText(), await page.locator('.o-prayers').innerText()];
  await tab(page, 'الأسبوع');
  return today.concat(await page.locator('main').innerText());
}

test('a saved schedule shows on Today with no reload, as a reload would show it, and progress stays', async ({page}) => {
  await openApp(page);
  await page.locator('.timeline li [role=checkbox]').first().click();
  const before = await userData(page);
  await markPage(page);
  await openEditor(page);
  await button(page, 'ضيف بلوك').click();
  await page.fill('#ed-start', '23:30');
  await page.fill('#ed-title', 'Late reading');
  await button(page, 'تمام').click();
  await saveSchedule(page);
  expect(await samePage(page)).toBe(true);
  await expect(page.locator('nav button[aria-current=page]')).toHaveText('اليوم');
  await expect(page.locator('.toast button')).toHaveCount(0);
  await expect(page.locator('.timeline li', {hasText: 'Late reading'})).toHaveCount(1);
  expect(await userData(page)).toEqual(before);
  const live = await screens(page);
  await page.reload();
  expect(await screens(page)).toEqual(live);
});

test('a new place gives its prayer times with no reload, the same as after a reload', async ({page}) => {
  await openApp(page);
  const cairo = await page.locator('.o-prayers').innerText();
  await markPage(page);
  await openEditor(page);
  await page.locator('details summary', {hasText: 'المكان'}).click();
  await page.fill('#pl-search', 'مكة');
  // The first city found; the block rows above it are buttons of the same class.
  await page.locator('.ed-part .tlist .wk-pick').first().click();
  await expect(page.locator('summary', {hasText: 'المكان'})).not.toContainText('Sample city');
  await saveSchedule(page);
  expect(await samePage(page)).toBe(true);
  const live = await page.locator('.o-prayers').innerText();
  expect(live).not.toBe(cairo);
  await page.reload();
  expect(await page.locator('.o-prayers').innerText()).toBe(live);
});

test('an imported file and then the example apply with no reload, and progress stays', async ({page}, info) => {
  await openApp(page);
  await page.locator('.timeline li [role=checkbox]').first().click();
  const before = await userData(page);
  const s = JSON.parse(JSON.stringify(EXAMPLE));
  s.name = 'Imported week';
  s.week['4'].blocks.push(['23:30', 'study', 'Imported block']);
  const file = info.outputPath('settings.json');
  fs.writeFileSync(file, JSON.stringify(s));
  await markPage(page);
  await tab(page, 'الإعدادات');
  await page.locator('#settings-file').setInputFiles(file);
  await applyChange(page, 'استبدل', 'اتطبّقت الإعدادات الجديدة');
  await expect(exampleNotice(page)).toHaveCount(0);
  await tab(page, 'اليوم');
  await expect(page.locator('.timeline li', {hasText: 'Imported block'})).toHaveCount(1);

  await tab(page, 'الإعدادات');
  await button(page, 'رجّع المثال').click();
  await applyChange(page, 'أيوه، ارجع للمثال', 'رجعت للمثال');
  await expect(exampleNotice(page)).toHaveCount(1);
  expect(await stored(page, 'mizan-settings')).toBeNull();
  await tab(page, 'اليوم');
  await expect(page.locator('.timeline li', {hasText: 'Imported block'})).toHaveCount(0);
  expect(await samePage(page)).toBe(true);
  expect(await userData(page)).toEqual(before);
});
