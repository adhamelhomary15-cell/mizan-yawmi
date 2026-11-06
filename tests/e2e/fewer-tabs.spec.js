// Fewer tabs (feature 031): every action of the old Tasks and Course tabs has a place in Today or Settings (SC-001).
// openApp's day is Thursday 15 October 2026. All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, progress, EXAMPLE, seed} = require('./helpers');

const task = (id, due, done = false) => ({id, text: 'Generated ' + id, tag: 'uni', due, done, created: '2026-10-10'});
const open = (page, tasks) => openApp(page, {before: seed(EXAMPLE, {tasks})});
const section = page => page.locator('.o-tasks');
const dayList = page => page.locator('.o-tasks .day-list');
const part = (page, title) => page.locator('.o-tasks .task-part', {hasText: title});
const summary = (page, kind) => page.locator('.o-tasks .' + kind + ' summary');
const toast = page => page.locator('.toast p');
const undo = page => page.locator('.toast button', {hasText: 'رجّعها'}).click();
const pickDay = (page, date) => page.getByRole('button', {name: new RegExp(date + ' أكتوبر$')}).click();
const addTask = async (page, text, due) => {
  await button(page, 'مهمة').click();
  await page.locator('#task-text').fill(text);
  await page.locator('#task-due').fill(due);
  await button(page, 'ضيف المهمة').click();
};
const stored = async (page, id) => (await progress(page)).tasks.find(t => t.id === id);

test.describe('tasks in Today', () => {
  test('with no task, the section shows with both buttons and the empty line', async ({page}) => {
    await open(page, []);
    await expect(section(page).locator('h2')).toHaveText('مهام النهارده');
    await expect(button(page, 'مهمة')).toBeVisible();
    await expect(button(page, 'الصق مهام من AI')).toBeVisible();
    await expect(section(page).locator('.empty')).toHaveText('مفيش مهام لليوم ده.');
  });

  test('a new task takes the day shown as its date, no date on a past day, and changing day closes the form', async ({page}) => {
    await open(page, []);
    await button(page, 'مهمة').click();
    await expect(page.locator('#task-due')).toHaveValue('2026-10-15');
    await pickDay(page, '16');
    await expect(section(page).locator('h2')).toHaveText('مهام اليوم ده');
    await expect(page.locator('#task-text')).toHaveCount(0);
    await button(page, 'مهمة').click();
    await expect(page.locator('#task-due')).toHaveValue('2026-10-16');
    await pickDay(page, '14');
    await button(page, 'مهمة').click();
    await expect(page.locator('#task-due')).toHaveValue('');
  });

  test('a task with its date cleared is under «من غير ميعاد» on every day', async ({page}) => {
    await open(page, []);
    await addTask(page, 'Generated no date', '');
    await expect(part(page, 'من غير ميعاد')).toContainText('Generated no date');
    await pickDay(page, '16');
    await expect(part(page, 'من غير ميعاد')).toContainText('Generated no date');
    await expect(page.getByRole('button', {name: 'أجّلها: Generated no date'})).toHaveCount(0);
  });

  test('a task due another day is in «باقي المهام» with its count, and in the day\'s list on its day', async ({page}) => {
    await open(page, []);
    await addTask(page, 'Generated tomorrow', '2026-10-16');
    await expect(section(page).locator('.empty')).toBeVisible();
    await expect(summary(page, 'others')).toHaveText('باقي المهام (1)');
    await expect(section(page).locator('.others .titem').first()).toBeHidden();
    await summary(page, 'others').click();
    await expect(section(page).locator('.others')).toContainText('Generated tomorrow');
    await pickDay(page, '16');
    await expect(dayList(page)).toContainText('Generated tomorrow');
    await expect(section(page).locator('.others')).toHaveCount(0);
  });

  test('every open task is in exactly one list, on today and on another day', async ({page}) => {
    await open(page, [task('late', '2026-10-12'), task('today', '2026-10-15'), task('later', '2026-10-18'), task('undated', '')]);
    const counts = async () => section(page).locator('.titem').count();
    expect(await counts()).toBe(4);
    await expect(dayList(page).locator('.titem')).toHaveCount(2);
    await expect(dayList(page)).toContainText('متأخرة');
    await pickDay(page, '16');
    expect(await counts()).toBe(4);
    await expect(section(page).locator('.others .titem')).toHaveCount(3);
  });

  test('pasted tasks land in their lists', async ({page}) => {
    await open(page, []);
    await button(page, 'الصق مهام من AI').click();
    await page.locator('#paste-input').fill('uni | Generated pasted dated | 2026-10-20\nwork | Generated pasted undated');
    await button(page, 'افحص').click();
    await button(page, 'ضيف 2 مهمة').click();
    await expect(toast(page)).toHaveText('اتضافت 2 مهمة');
    await expect(summary(page, 'others')).toHaveText('باقي المهام (1)');
    await expect(part(page, 'من غير ميعاد')).toContainText('Generated pasted undated');
    await expect(button(page, 'الصق مهام من AI')).toBeFocused();
  });

  test('a task in the day\'s list can be ticked, and edited and deleted with «رجّعها»', async ({page}) => {
    await open(page, [task('one', '2026-10-15'), task('two', '2026-10-15')]);
    await page.getByRole('checkbox', {name: 'خلّص: Generated one'}).click();
    await expect.poll(async () => (await stored(page, 'one')).done).toBe(true);
    await expect(dayList(page)).not.toContainText('Generated one');

    await page.getByRole('button', {name: 'عدّل Generated two'}).click();
    await page.locator('#edit-task-text').fill('Generated changed');
    await button(page, 'احفظ التعديل').click();
    await expect(toast(page)).toHaveText('اتعدّلت المهمة');
    await expect(dayList(page)).toContainText('Generated changed');
    await expect(page.getByRole('button', {name: 'عدّل Generated changed'})).toBeFocused();
    await undo(page);
    await expect(dayList(page)).toContainText('Generated two');

    await page.getByRole('button', {name: 'امسح Generated two'}).click();
    await expect(toast(page)).toHaveText('اتمسحت المهمة');
    await expect(section(page).locator('.empty')).toBeVisible();
    await undo(page);
    await expect(dayList(page)).toContainText('Generated two');
  });

  test('a finished task can be edited, unticked and deleted; an undated one edited and deleted', async ({page}) => {
    await open(page, [task('done', '2026-10-15', true), task('gone', '2026-10-14', true), task('undated', '')]);
    await expect(section(page).locator('.finished .titem').first()).toBeHidden();
    await summary(page, 'finished').click();
    await page.getByRole('button', {name: 'عدّل Generated done'}).click();
    await page.locator('#edit-task-text').fill('Generated done edited');
    await button(page, 'احفظ التعديل').click();
    await expect(section(page).locator('.finished')).toContainText('Generated done edited');
    await page.getByRole('checkbox', {name: 'رجّع: Generated done edited'}).click();
    await expect(dayList(page)).toContainText('Generated done edited');
    await page.getByRole('button', {name: 'امسح Generated gone'}).click();
    await expect.poll(async () => stored(page, 'gone')).toBeUndefined();

    await page.getByRole('button', {name: 'عدّل Generated undated'}).click();
    await page.locator('#edit-task-text').fill('Generated undated edited');
    await button(page, 'احفظ التعديل').click();
    await expect(part(page, 'من غير ميعاد')).toContainText('Generated undated edited');
    await page.getByRole('button', {name: 'امسح Generated undated edited'}).click();
    await expect.poll(async () => stored(page, 'undated')).toBeUndefined();
  });
});

test.describe('appointments in Settings', () => {
  test('add, edit, open its day, and delete', async ({page}) => {
    await open(page, []);
    await tab(page, 'الإعدادات');
    await button(page, 'ميعاد').click();
    await page.locator('#appt-label').fill('Generated meeting');
    await page.locator('#appt-time').fill('19:00');
    await button(page, 'ضيف الميعاد').click();
    await expect(page.locator('.appt')).toContainText('Generated meeting');

    await page.getByRole('button', {name: 'عدّل Generated meeting'}).click();
    await page.locator('#edit-appt-label').fill('Generated call');
    await button(page, 'احفظ التعديل').click();
    await expect(page.locator('.appt')).toContainText('Generated call');

    await button(page, 'افتح اليوم').click();
    await expect(page.locator('.o-head')).toContainText('16 أكتوبر');
    await expect(page.locator('.o-timeline')).toContainText('Generated call');

    await tab(page, 'الإعدادات');
    await page.getByRole('button', {name: 'امسح Generated call'}).click();
    await expect.poll(async () => (await progress(page)).appts.length).toBe(0);
    await tab(page, 'اليوم');
    await expect(page.locator('.o-timeline')).not.toContainText('Generated call');
  });
});
