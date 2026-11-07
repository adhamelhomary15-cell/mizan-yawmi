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

test.describe('the course', () => {
  // Weeks of 2 modules from Monday 12 October, with a gap after the first; the shown day is Thursday 15 October.
  const week = (from, to, first) => ({from, to, label: from, items: [first, first + 1].map(n => [String(n), 'Module ' + n])});
  const settings = plan => { const s = JSON.parse(JSON.stringify(EXAMPLE)); s.course = {name: 'Course A', plan}; return s; };
  const PLAN = [week('2026-10-12', '2026-10-18', 1), week('2026-11-02', '2026-11-08', 3)];
  const ADDED = {id: 'cb', name: 'Course B', from: '2026-10-01', to: '2026-11-30', modules: [{id: 'm1', title: 'Module B1'}, {id: 'm2', title: 'Module B2'}], done: {}};
  const openCourse = (page, plan, progressPart = {}) => openApp(page, {before: seed(settings(plan), Object.assign({tasks: []}, progressPart))});
  const module = (page, n) => page.getByRole('checkbox', {name: 'خلّصت: Module ' + n});
  const card = page => page.locator('.target');
  const mods = page => page.locator('.target .target-mods');
  const row = (page, name) => page.locator('.course-row', {hasText: name});

  test('a module is ticked and unticked on the card, with the count and bar following, even the week\'s last', async ({page}) => {
    await openCourse(page, PLAN);
    await expect(card(page)).toContainText('خلّصت 0 من 4 موديول');
    await mods(page).locator(module(page, 1)).click();
    await expect(card(page)).toContainText('خلّصت 1 من 4 موديول');
    await expect(card(page).locator('.fill')).toHaveAttribute('style', /width: 25(\.0)?%/);
    await mods(page).locator(module(page, 2)).click();
    await expect(mods(page)).toContainText('Module 2');
    await mods(page).locator(module(page, 2)).click();
    await expect(card(page)).toContainText('خلّصت 1 من 4 موديول');
  });

  test('«الخطة كلها» shows the card\'s tick, and its own tick shows on the card', async ({page}) => {
    await openCourse(page, PLAN);
    const whole = page.locator('.target details');
    await mods(page).locator(module(page, 1)).click();
    await whole.locator('summary').click();
    await expect(whole.locator('.week')).toHaveCount(2);
    await expect(whole.locator('.week.is-current')).toContainText('Module 1');
    await expect(whole.locator(module(page, 1))).toHaveAttribute('aria-checked', 'true');
    await whole.locator(module(page, 2)).click();
    await expect(mods(page).locator(module(page, 2))).toHaveAttribute('aria-checked', 'true');
  });

  test('in a gap or past the end with modules open, the card shows the next modules and does not say it is done', async ({page}) => {
    await openCourse(page, [week('2026-09-01', '2026-09-07', 1), week('2026-09-08', '2026-09-14', 3)], {modules: {1: true, 2: true}});
    await expect(mods(page)).toContainText('Module 3');
    await expect(card(page)).not.toContainText('خلّصت الكورس كله');
    await expect(card(page)).toContainText('الجاي');
  });

  test('with every module ticked, the card says it is done', async ({page}) => {
    await openCourse(page, [week('2026-09-01', '2026-09-07', 1)], {modules: {1: true, 2: true}});
    await expect(card(page)).toContainText('خلّصت الكورس كله');
  });

  test('a course that is not main is ticked in Settings, and the main course does not change', async ({page}) => {
    await openCourse(page, PLAN, {courses: [ADDED]});
    await tab(page, 'الإعدادات');
    await expect(row(page, 'Course A')).toContainText('الكورس الأساسي');
    await row(page, 'Course B').locator('summary').click();
    await module(page, 'B1').click();
    await expect(row(page, 'Course B')).toContainText('خلّصت 1 من 2 موديول');
    await tab(page, 'اليوم');
    await expect(page.locator('.target-name')).toHaveText('Course A');
  });

  test('add a course, make it main, see it on the card, and delete it; a settings course has no delete', async ({page}) => {
    await openCourse(page, PLAN);
    await tab(page, 'الإعدادات');
    await expect(row(page, 'Course A').locator('button', {hasText: 'امسح الكورس'})).toHaveCount(0);
    await button(page, 'كورس جديد').click();
    await page.locator('#cf-name').fill('Course C');
    await page.locator('#cf-mods').fill('One\nTwo');
    await page.locator('.course-form button[type=submit]').click();
    await row(page, 'Course C').locator('button', {hasText: 'خليه الكورس الأساسي'}).click();
    await tab(page, 'اليوم');
    await expect(page.locator('.target-name')).toHaveText('Course C');
    await tab(page, 'الإعدادات');
    await row(page, 'Course C').locator('button', {hasText: 'امسح الكورس'}).click();
    await expect(page.locator('.toast p')).toContainText('اتمسح كورس');
    await tab(page, 'اليوم');
    await expect(page.locator('.target-name')).toHaveText('Course A');
  });
});

test.describe('done state', () => {
  const week = (from, to, first) => ({from, to, label: from, items: [first, first + 1].map(n => [String(n), 'Module ' + n])});
  const settings = () => { const s = JSON.parse(JSON.stringify(EXAMPLE)); s.course = {name: 'Course A', plan: [week('2026-10-12', '2026-10-18', 1)]}; return s; };
  const tasks = [task('today', '2026-10-15'), task('later', '2026-10-20'), task('finished', '2026-10-14', true)];
  const openIt = page => openApp(page, {before: seed(settings(), {tasks})});

  test('at phone size and offline, a tick on a task and a module stays after a reload', async ({page, context, browserName}) => {
    // Playwright's WebKit blocks every navigation while offline (see offline.spec.js).
    test.skip(browserName === 'webkit', 'Playwright WebKit blocks offline navigation before the service worker');
    await openIt(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.getByRole('checkbox', {name: 'خلّص: Generated today'}).click();
    await page.getByRole('checkbox', {name: 'خلّصت: Module 1'}).first().click();
    await page.reload();
    await expect(page.getByRole('checkbox', {name: 'خلّصت: Module 1'}).first()).toHaveAttribute('aria-checked', 'true');
    await summary(page, 'finished').click();
    await expect(section(page).locator('.finished')).toContainText('Generated today');
    await context.setOffline(false);
  });

  test('opening the lists and the plan writes nothing', async ({page}) => {
    await openIt(page);
    const before = JSON.stringify(await progress(page));
    await summary(page, 'others').click();
    await summary(page, 'finished').click();
    await page.locator('.target details summary').click();
    await expect(page.locator('.target details .week')).toHaveCount(1);
    expect(JSON.stringify(await progress(page))).toBe(before);
  });
});

test.describe('the band and the widths', () => {
  const TABS = ['اليوم', 'الأسبوع', 'تمارين', 'الإعدادات'];
  const noSideways = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  test('four tabs, in order, fill the band', async ({page}) => {
    await open(page, []);
    await expect(page.locator('nav button')).toHaveText(TABS);
    const band = await page.locator('.nav-in').boundingBox();
    const last = await page.locator('nav button').nth(3).boundingBox();
    const first = await page.locator('nav button').nth(0).boundingBox();
    expect(Math.max(first.x + first.width, last.x + last.width) - Math.min(first.x, last.x)).toBeGreaterThan(band.width - 2);
  });

  for (const name of ['tasks', 'course']) {
    test('the old address #' + name + ' opens Today', async ({page}) => {
      await page.clock.setFixedTime(new Date('2026-10-15T20:30:00Z'));
      await page.goto('index.html#' + name);
      await expect(page.locator('nav button', {hasText: 'اليوم'})).toHaveAttribute('aria-current', 'page');
      await expect(section(page)).toBeVisible();
    });
  }

  test('at 375 px nothing scrolls sideways on Today and Settings, with lists and the plan open', async ({page}) => {
    await open(page, [task('today', '2026-10-15'), task('later', '2026-10-20'), task('undated', ''), task('finished', '2026-10-14', true)]);
    await summary(page, 'others').click();
    await summary(page, 'finished').click();
    await page.locator('.target details summary').click();
    expect(await noSideways(page)).toBe(true);
    await button(page, 'مهمة').click();
    expect(await noSideways(page)).toBe(true);
    await tab(page, 'الإعدادات');
    expect(await noSideways(page)).toBe(true);
  });

  test('on desktop the side column holds only the target, prayers and rosette, and the tasks follow the timeline', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await open(page, [task('today', '2026-10-15')]);
    await expect(page.locator('.today-side > *')).toHaveCount(3);
    await expect(page.locator('.today-side .o-tasks')).toHaveCount(0);
    await expect(page.locator('.today-main > .o-timeline + .o-tasks')).toHaveCount(1);
    expect(await noSideways(page)).toBe(true);
  });
});
