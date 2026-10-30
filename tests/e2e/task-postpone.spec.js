// Postponing a task from anywhere (feature 028): «أجّلها» on every dated task in Today's list and in the Tasks tab,
// to the day after its date and never earlier than tomorrow, with an undo of that date only. openApp's day is
// Thursday 15 October 2026, so tomorrow is Friday the 16th. All tasks are generated.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, progress} = require('./helpers');

const TASKS = [
  {id: 'today', text: 'Generated task for today', tag: 'uni', due: '2026-10-15', done: false, created: '2026-10-10'},
  {id: 'late', text: 'Generated late task', tag: 'work', due: '2026-10-12', done: false, created: '2026-10-10'},
  {id: 'later', text: 'Generated task in three days', tag: 'course', due: '2026-10-18', done: false, created: '2026-10-10'},
  {id: 'next', text: 'Generated task after it', tag: 'course', due: '2026-10-19', done: false, created: '2026-10-10'},
  {id: 'undated', text: 'Generated undated task', tag: 'personal', due: '', done: false, created: '2026-10-10'},
  {id: 'done', text: 'Generated done task', tag: 'uni', due: '2026-10-15', done: true, created: '2026-10-10'}
];
// Progress under the old key, written once per test, as day.spec.js does.
const seedTasks = tasks => `if (!sessionStorage.getItem('seeded')) {
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('fall26-planner-v1', ${JSON.stringify(JSON.stringify({v: 1, checks: {}, modules: {}, appts: [], courses: [], extras: {}, phaseSeen: 'A', tasks}))});
}`;
const open = page => openApp(page, {before: seedTasks(TASKS)});
const dueOf = async (page, id) => (await progress(page)).tasks.find(t => t.id === id).due;
const postpone = (page, text) => page.getByRole('button', {name: 'أجّلها: ' + text}).click();
const toast = page => page.locator('.toast p');

test.describe('US1: from Today', () => {
  test('a task due today and an overdue one go to tomorrow, and leave today\'s list', async ({page}) => {
    await open(page);
    const list = page.locator('.o-tasks');
    await postpone(page, 'Generated task for today');
    await expect(toast(page)).toHaveText('اتأجلت المهمة لـ الجمعة، 16 أكتوبر');
    await expect(list.locator('.titem', {hasText: 'Generated task for today'})).toHaveCount(0);
    await postpone(page, 'Generated late task');
    expect([await dueOf(page, 'today'), await dueOf(page, 'late')]).toEqual(['2026-10-16', '2026-10-16']);
  });

  test('«رجّعها» puts the stored tasks back exactly, and a block ticked in between stays ticked', async ({page}) => {
    await open(page);
    const before = JSON.stringify((await progress(page)).tasks);
    await postpone(page, 'Generated late task');
    await page.locator('.timeline [role=checkbox]').first().click();
    const ticked = JSON.stringify((await progress(page)).checks);
    expect(ticked).not.toBe('{}');
    await page.locator('.toast button', {hasText: 'رجّعها'}).click();
    const after = await progress(page);
    expect(JSON.stringify(after.tasks)).toBe(before);
    expect(JSON.stringify(after.checks)).toBe(ticked);
  });

  test('on another day picked in the strip, a task due that day goes to the day after it', async ({page}) => {
    await open(page);
    await page.getByRole('button', {name: 'الأسبوع الجاي'}).click();
    await page.getByRole('button', {name: 'السبت 17 أكتوبر'}).click();
    await page.getByRole('button', {name: 'الحد 18 أكتوبر'}).click();
    await postpone(page, 'Generated task in three days');
    expect(await dueOf(page, 'later')).toBe('2026-10-19');
  });
});

test.describe('US2: from the Tasks tab', () => {
  test('a later task moves one day per tap, the list stays in date order, and «رجّعها» undoes the last move', async ({page}) => {
    await open(page);
    await tab(page, 'المهام');
    await postpone(page, 'Generated task in three days');
    await expect(toast(page)).toHaveText('اتأجلت المهمة لـ الاتنين، 19 أكتوبر');
    await postpone(page, 'Generated task in three days');
    expect(await dueOf(page, 'later')).toBe('2026-10-20');
    const order = await page.locator('.a-tasks .titem .ttext').allInnerTexts();
    expect(order.indexOf('Generated task after it')).toBeLessThan(order.indexOf('Generated task in three days'));
    await page.locator('.toast button', {hasText: 'رجّعها'}).click();
    expect(await dueOf(page, 'later')).toBe('2026-10-19');
  });

  test('an undated task, a done task and a task being edited have no «أجّلها»', async ({page}) => {
    await open(page);
    await tab(page, 'المهام');
    await expect(page.getByRole('button', {name: /^أجّلها: /})).toHaveCount(4);
    await expect(page.getByRole('button', {name: 'أجّلها: Generated undated task'})).toHaveCount(0);
    await page.getByRole('button', {name: 'عدّل Generated task after it'}).click();
    await expect(page.getByRole('button', {name: 'أجّلها: Generated task after it'})).toHaveCount(0);
    await button(page, 'خلصت').click();
    await expect(page.getByText('Generated done task')).toBeVisible();
    await expect(page.getByRole('button', {name: /^أجّلها: /})).toHaveCount(0);
  });
});

test('FR-005: postponing changes the date only', async ({page}) => {
  await open(page);
  await tab(page, 'المهام');
  const was = (await progress(page)).tasks.find(t => t.id === 'later');
  await postpone(page, 'Generated task in three days');
  const now = (await progress(page)).tasks.find(t => t.id === 'later');
  expect(now).toEqual(Object.assign({}, was, {due: '2026-10-19'}));
});

test('FR-006: the day review still sends a task to the day after the reviewed day', async ({page}) => {
  await open(page);
  await button(page, 'راجع يومك').first().click();
  await page.locator('.review-tasks li', {hasText: 'Generated task for today'}).locator('button', {hasText: 'أجّلها'}).click();
  expect(await dueOf(page, 'today')).toBe('2026-10-16');
});

test('at phone width a long task wraps and the Tasks tab has no horizontal scroll', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await openApp(page, {before: seedTasks([{id: 'long', text: 'A generated task with a long text that has to wrap at phone width without pushing any button out', tag: 'uni', due: '2026-10-18', done: false}])});
  await tab(page, 'المهام');
  await expect(page.getByRole('button', {name: /^أجّلها: A generated task/})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
