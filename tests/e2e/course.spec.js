// Courses without one person's rules (feature 017): course blocks follow the main course by kind, settings without a
// course show none, the pace line comes from the plan, and opening the app writes nothing. All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, stored, EXAMPLE, seed} = require('./helpers');

const week = (from, to, n, first) => ({from, to, label: from, items: Array.from({length: n}, (_, i) => [String(first + i), 'Module ' + (first + i)])});
const ADDED = {id: 'cb', name: 'Course B', from: '2026-10-01', to: '2026-11-30', modules: [{id: 'm1', title: 'One'}, {id: 'm2', title: 'Two'}], done: {}};

const withCourse = name => {
  const s = JSON.parse(JSON.stringify(EXAMPLE));
  s.course = {name, plan: [week('2026-10-12', '2026-10-18', 3, 1), week('2026-10-19', '2026-10-25', 3, 4), week('2026-10-26', '2026-11-01', 3, 7)]};
  const b = s.week['4'].blocks;
  b[1] = [b[1][0], 'course', name + '|study'];
  b[3] = [b[3][0], 'uni', name + '|lecture'];
  return s;
};

test('course blocks follow the main course; a lecture of another kind keeps its title', async ({page}) => {
  await openApp(page, {before: seed(withCourse('Course A'), {courses: [ADDED], mainCourse: 'cb'})});
  await expect(page.locator('.timeline li.c-course .title')).toContainText(['Course B']);
  await expect(page.locator('.timeline li.c-uni .title')).toContainText(['Course A']);
  await tab(page, 'الكورس');
  await button(page, 'Course A').click();
  await button(page, 'خليه الكورس الأساسي').click();
  await tab(page, 'اليوم');
  await expect(page.locator('.timeline li.c-course .title')).toContainText(['Course A']);
});

test('settings without a course show none until one is added, and it becomes main', async ({page}) => {
  const s = JSON.parse(JSON.stringify(EXAMPLE)); delete s.course;
  await openApp(page, {before: seed(s)});
  await expect(page.locator('.target')).toHaveCount(0);
  await tab(page, 'الكورس');
  await expect(page.locator('.coursev .top')).toContainText('لسه مفيش كورس');
  await expect(page.locator('main')).not.toContainText('Course');
  await button(page, 'كورس جديد').click();
  await page.locator('.coursev form input').first().fill('Course C');
  await page.locator('.coursev form textarea').fill('One\nTwo\nThree');
  await page.locator('.coursev form button[type=submit]').click();
  await expect(page.locator('.coursev .top .sub')).toHaveText('الكورس الأساسي، التارجت الأول للفترة دي');
  await tab(page, 'اليوم');
  await expect(page.locator('.target-name')).toHaveText('Course C');
});

test('the settings course says its pace from its plan, and opening the app writes nothing', async ({page}) => {
  await openApp(page, {before: seed(withCourse('Course A'), {courses: [ADDED], mainCourse: 'gone'})});
  const before = await stored(page, 'mizan-progress');
  await tab(page, 'الكورس');
  await expect(page.locator('.coursev h1')).toHaveText('Course A');
  await expect(page.locator('.prog-row')).toContainText('حوالي 3 في الأسبوع');
  await page.reload();
  await expect(page.locator('nav button').first()).toBeVisible();
  expect(await stored(page, 'mizan-progress')).toEqual(before);
});
