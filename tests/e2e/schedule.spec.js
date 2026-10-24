// Making and editing the schedule in the app (features 014 and 016): the guide, the device location, the editor, a refused
// save, a prayer tie through the seasons, a schedule file exported and imported back, and kinds the user adds.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, stored, applyChange, saveSchedule} = require('./helpers');

const settings = async page => ((await stored(page, 'mizan-settings')) || {}).data;
const openEditor = async page => { await tab(page, 'الإعدادات'); await button(page, 'عدّل الجدول').click(); };
const startGuide = async page => { await button(page, 'اعمل جدولك').click(); await expect(page.locator('main h1')).toHaveText('اعمل جدولك'); };

test('the guide makes a week from a listed city, a template and subjects', async ({page}) => {
  await openApp(page);
  await startGuide(page);
  await page.fill('#pl-search', 'القاهرة');
  await page.locator('main .wk-pick').first().click();
  await expect(page.locator('main .place-pick b').first()).toHaveText('القاهرة');
  await button(page, 'التالي').click();
  await button(page, 'التالي').click();
  await page.fill('#gs-0', 'مادة تجريبية');
  await button(page, 'كمّل وعدّل الأيام').click();
  expect(await stored(page, 'mizan-settings')).toBeNull();
  await saveSchedule(page);
  const s = await settings(page);
  expect(s.location.label).toBe('القاهرة');
  expect(s.prayerMethod).toBe('Egyptian');
  expect(Object.values(s.subjects)).toEqual(['مادة تجريبية']);
  await expect(page.locator('.notice', {hasText: 'ده جدول مثال عام'})).toHaveCount(0);
});

test.describe('with the location allowed', () => {
  test.use({geolocation: {latitude: 21.4225, longitude: 39.8262}, permissions: ['geolocation']});
  test('«استخدم موقعي» names the nearest city and its method', async ({page}) => {
    await openApp(page);
    await startGuide(page);
    await button(page, 'استخدم موقعي').click();
    await expect(page.locator('main .place-pick b').first()).toHaveText('قريب من مكة المكرمة');
    await expect(page.locator('#pl-method')).toHaveValue('UmmAlQura');
  });
});

test('with the location refused, the guide says so and offers the other ways', async ({page}) => {
  await openApp(page);
  await page.context().clearPermissions();
  await startGuide(page);
  await button(page, 'استخدم موقعي').click();
  await expect(page.locator('main .form-err')).toContainText('اختار مدينتك أو اكتب الإحداثيات');
  await expect(button(page, 'التالي')).toBeDisabled();
});

test('a block after midnight, copied to another day, is saved and exported, and the file imports back', async ({page}, info) => {
  await openApp(page);
  await openEditor(page);
  await button(page, 'ضيف بلوك').click();
  await page.fill('#ed-start', '00:30');
  await page.fill('#ed-title', 'بلوك تجريبي');
  await button(page, 'تمام').click();
  await button(page, 'انسخ اليوم ده').click();
  await page.locator('main .check-line', {hasText: 'الحد'}).locator('input').check();
  await button(page, 'انسخ').click();
  await saveSchedule(page);
  const s = await settings(page);
  expect(s.week['4'].blocks.at(-1).slice(0, 3)).toEqual(['24:30', 'study', 'بلوك تجريبي']);
  expect(s.week['0'].blocks).toEqual(s.week['4'].blocks);

  await tab(page, 'الإعدادات');
  const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'صدّر جدولي كملف').click()]);
  expect(download.suggestedFilename()).toBe('mizan-settings-2026-10-15.json');
  const file = info.outputPath('schedule.json');
  await download.saveAs(file);
  await button(page, 'رجّع المثال').click();
  await applyChange(page, 'أيوه، ارجع للمثال', 'رجعت للمثال');
  // the past days showed the saved week, so the example is stored with it as history (feature 021)
  expect((await settings(page)).fromExample).toBe(true);
  await tab(page, 'الإعدادات');
  await page.locator('#settings-file').setInputFiles(file);
  await applyChange(page, 'استبدل', 'اتطبّقت الإعدادات الجديدة');
  expect((await settings(page)).week).toEqual(s.week);
});

test('a save the settings refuse names the day and the block, and stores nothing', async ({page}) => {
  await openApp(page);
  await openEditor(page);
  await page.locator('main .ed-row').first().click();
  await page.locator('main .check-line', {hasText: 'اربطه بالصلاة'}).locator('input').check();
  await button(page, 'تمام').click();
  await button(page, 'احفظ الجدول').click();
  await expect(page.locator('.notice', {hasText: 'الجدول ماتحفظش'})).toContainText('الخميس، البلوك 1 (07:30 صحيان وفطار): أول وآخر بلوك');
  expect(await stored(page, 'mizan-settings')).toBeNull();
});

// Thursdays in summer and in winter; Asr in Cairo moves by about two hours between them.
const SUMMER = new Date('2026-06-18T09:00:00Z'), WINTER = new Date('2026-12-17T09:00:00Z');
// The Asr time on the Today screen, minus ten minutes and rounded to five as tied blocks are, as the preview writes it.
async function tenBeforeAsr(page){
  await tab(page, 'اليوم');
  const [h, m] = (await page.locator('.pr', {hasText: 'العصر'}).locator('.pt').innerText()).split(':').map(Number);
  const min = Math.round(((h % 12 + 12) * 60 + m - 10) / 5) * 5;
  return (Math.floor(min / 60) % 12 || 12) + ':' + String(min % 60).padStart(2, '0') + 'م';
}
const previewStart = async page => (await page.locator('.ed-preview p', {hasText: 'مثال: مذاكرة مادة 2'}).innerText()).split(' – ')[0];

test('a block tied to Asr follows it from summer to winter', async ({page}) => {
  await openApp(page, {at: SUMMER});
  await openEditor(page);
  await page.locator('main .ed-row', {hasText: 'مثال: مذاكرة مادة 2'}).click();
  await page.locator('main .check-line', {hasText: 'اربطه بالصلاة'}).locator('input').check();
  await page.selectOption('#ed-prayer', 'asr');
  await page.fill('#ed-min', '10');
  await button(page, 'تمام').click();
  await saveSchedule(page);
  expect((await settings(page)).week['4'].blocks.find(b => b[2] === 'مثال: مذاكرة مادة 2')[5]).toEqual({prayer: 'asr', dir: 'before', min: 10});

  const starts = [];
  for (const at of [SUMMER, WINTER]) {
    await page.clock.setFixedTime(at);
    await page.reload();
    const want = await tenBeforeAsr(page);
    await openEditor(page);
    expect(await previewStart(page)).toBe(want);
    starts.push(want);
    await button(page, 'رجوع').click();
  }
  expect(starts[0]).not.toBe(starts[1]);
});

// Added kinds (feature 016): «تدريس», copper, on the second side, put on Thursday's first block.
async function addTeaching(page){
  await openEditor(page);
  await page.locator('summary', {hasText: /^الأنواع$/}).click();
  await button(page, 'ضيف نوع').click();
  await page.fill('#kl-k1', 'تدريس');
  await page.locator('.swatch', {hasText: 'نحاسي'}).click();
  await page.selectOption('#ks-k1', 'b');
  await page.locator('main .ed-row').first().click();
  await page.selectOption('#ed-kind', 'k1');
  await button(page, 'تمام').click();
  await saveSchedule(page);
}

test('an added kind shows in its colour, can be ticked, counts on its side, and has its Week row', async ({page}) => {
  await openApp(page);
  await addTeaching(page);
  expect((await settings(page)).categories.k1).toEqual({label: 'تدريس', track: true, color: 'copper', side: 'b'});
  const row = page.locator('.timeline li.c-k-copper');
  await expect(row.locator('.meta b')).toHaveText('تدريس');
  // The share's final value (027: the shown number counts up beside it).
  await expect(page.locator('.balance-legend .b .sr-only')).toHaveText('0%');
  await row.locator('[role=checkbox]').click();
  await expect(page.locator('.balance-legend .b .sr-only')).not.toHaveText('0%');
  await tab(page, 'الأسبوع');
  await expect(page.locator('.stat.c-k-copper')).toContainText('تدريس');
});

test('a used kind cannot be deleted; once unused it goes, and the summary names it', async ({page}) => {
  await openApp(page);
  await addTeaching(page);
  await openEditor(page);
  await page.locator('summary', {hasText: /^الأنواع$/}).click();
  await button(page, 'امسح النوع').click();
  await expect(page.locator('.ed-kind .form-err')).toHaveText('مستخدم يوم الخميس. شيل البلوكات دي أو غيّر نوعها الأول.');
  await page.locator('main .ed-row').first().click();
  await page.selectOption('#ed-kind', 'personal');
  await button(page, 'تمام').click();
  await button(page, 'امسح النوع').click();
  await expect(page.locator('#kl-k1')).toHaveCount(0);
  await button(page, 'احفظ الجدول').click();
  await expect(page.locator('.notice', {hasText: 'هتحفظ التغييرات دي؟'})).toContainText('الأنواع: تدريس');
  await applyChange(page, 'أيوه، احفظ', 'اتحفظ الجدول');
  expect((await settings(page)).categories.k1).toBeUndefined();
});

test('an exported schedule brings its added kinds back on import', async ({page}, info) => {
  await openApp(page);
  await addTeaching(page);
  const before = await settings(page);
  await tab(page, 'الإعدادات');
  const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'صدّر جدولي كملف').click()]);
  const file = info.outputPath('kinds.json');
  await download.saveAs(file);
  await button(page, 'رجّع المثال').click();
  await applyChange(page, 'أيوه، ارجع للمثال', 'رجعت للمثال');
  await tab(page, 'الإعدادات');
  await page.locator('#settings-file').setInputFiles(file);
  await applyChange(page, 'استبدل', 'اتطبّقت الإعدادات الجديدة');
  const after = await settings(page);
  expect(after.categories).toEqual(before.categories);
  expect(after.week['4']).toEqual(before.week['4']);
});
