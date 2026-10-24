// Encrypted sync (feature 025): two devices (two browser contexts) and the sync server's own code (server/worker.js on
// Node's SQLite), reached through the address in server/address.txt, which these tests intercept. Generated accounts
// and data only; nothing leaves this computer.
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, stored, EXAMPLE, seed} = require('./helpers');

const ADDRESS = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'address.txt'), 'utf8').trim();
const EMAIL = 'owner@example.test', PASSWORD = 'correct horse battery', PASSWORD2 = 'another long password';
const serverModule = file => import(pathToFileURL(path.join(__dirname, '..', '..', 'server', file)).href);

// A fresh server for one test: the Worker on an in-memory database, emails kept in a list, every request counted.
async function newServer(baseURL){
  const worker = (await serverModule('worker.js')).default, {localD1} = await serverModule('d1-local.js');
  const s = {emails: [], hits: 0, env: null};
  s.env = {DB: localD1(), PEPPER: 'e2e-pepper', APP_URL: baseURL, sendEmail: async m => { s.emails.push(m); }};
  s.link = kind => { const m = s.emails.map(e => e.text.match(new RegExp('#sync-' + kind + '=[A-Za-z0-9_-]+'))).filter(Boolean).pop(); return m && m[0]; };
  s.rows = table => s.env.DB.sqlite.prepare('SELECT * FROM ' + table).all();
  s.attach = async context => context.route(ADDRESS + '/**', async route => {
    s.hits++;
    const rq = route.request(), body = rq.postDataBuffer();
    const r = await worker.fetch(new Request(rq.url(), {method: rq.method(), headers: rq.headers(), body: rq.method() === 'GET' || rq.method() === 'OPTIONS' ? undefined : body}), s.env);
    await route.fulfill({status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer())});
  });
  return s;
}
// One device: its own context and page, signed up or signed in through «المزامنة».
async function device(browser, server, baseURL, before){
  const context = await browser.newContext({baseURL, viewport: {width: 375, height: 812}, timezoneId: 'Africa/Cairo', acceptDownloads: true});
  await server.attach(context);
  const page = await context.newPage();
  await openApp(page, {before});
  return {context, page};
}
const syncSection = page => page.locator('main .sec', {has: page.locator('h2', {hasText: 'المزامنة'})});
async function signUpAndConfirm(page, server){
  await tab(page, 'الإعدادات');
  await button(page, 'اعمل حساب').click();
  await page.fill('#sy-email', EMAIL); await page.fill('#sy-pass', PASSWORD); await page.fill('#sy-again', PASSWORD);
  await syncSection(page).locator('.check-line', {hasText: 'حفظت الكود'}).locator('input').check();
  const code = (await syncSection(page).locator('bdi.num').innerText()).trim();
  await button(page, 'اعمل الحساب').click();
  await expect(syncSection(page)).toContainText('بعتنالك إيميل');
  await openLink(page, server.link('confirm'));
  await expect(syncSection(page)).toContainText('اتأكد إيميلك');
  return code;
}
// An email link opens a new page, as tapping it in a mail app does.
async function openLink(page, hash){ await page.goto('about:blank'); await page.goto('index.html' + hash); }
async function signIn(page, password){
  await page.fill('#sy-email', EMAIL); await page.fill('#sy-pass', password || PASSWORD);
  await button(page, 'ادخل').click();
}
const lineSays = (page, text) => expect(page.locator('p.sync')).toContainText(text);
// Waits until this device has sent everything it changed: its sync record says nothing is waiting.
const settled = page => expect.poll(() => page.evaluate(() => {
  const r = JSON.parse(localStorage.getItem('mizan-sync') || 'null');
  return !!r && !!r.lastSync && !Object.values(r.dirty || {}).some(Boolean);
}), {timeout: 20000}).toBe(true);
const progressOf = async page => ((await stored(page, 'mizan-progress')) || {}).data;
const tasksOf = async page => ((await progressOf(page)) || {tasks: []}).tasks.map(t => t.text).sort();
async function addTask(page, text){
  await tab(page, 'المهام');
  await page.locator('main button.add-task', {hasText: 'مهمة جديدة'}).click();
  await page.fill('#task-text', text);
  await button(page, 'ضيف المهمة').click();
}

// every sign-up, sign-in and new password runs 600,000 PBKDF2 rounds in the page, so these tests get more time
test.describe.configure({mode: 'serial', timeout: 120000});
// Playwright's WebKit sends the CORS preflight of a routed request to the real network, past page.route, so these
// tests would reach the sync address itself there. Chromium sends no preflight for a routed request (every request goes
// through the route, checked by hand), so nothing leaves the computer.
test.skip(({browserName}) => browserName === 'webkit', 'Playwright WebKit sends CORS preflights past page.route');

test('sign up, confirm, sign in: changes go up encrypted, and the server holds no plain word', async ({browser, baseURL}) => {
  const server = await newServer(baseURL), a = await device(browser, server, baseURL);
  const noSideScroll = () => a.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  await signUpAndConfirm(a.page, server);
  expect(await noSideScroll()).toBe(true);
  await signIn(a.page);
  await lineSays(a.page, 'متزامن');
  expect(await noSideScroll()).toBe(true);
  await addTask(a.page, 'مهمة سرية من الجهاز الأول');
  await expect.poll(() => server.rows('stores').filter(r => r.name === 'progress').length, {timeout: 15000}).toBe(1);
  await expect.poll(async () => (await server.rows('stores').find(r => r.name === 'progress')).version, {timeout: 15000}).toBeGreaterThan(1);
  const dump = JSON.stringify(['accounts', 'signins', 'stores', 'email_tokens'].map(t => server.rows(t)));
  expect(dump).not.toContain('مهمة سرية');
  expect(dump).not.toContain(PASSWORD);
  expect(dump).not.toContain(Buffer.from('مهمة سرية').toString('base64url'));
  // once in step, a device stays quiet until the next poll (a merge written back must not send it again)
  const hits = server.hits;
  await a.page.waitForTimeout(7000);
  expect(server.hits - hits).toBeLessThanOrEqual(1);
  await a.context.close();
});

test('a second device joins: both keep their own tasks, and a change on one reaches the other', async ({browser, baseURL}) => {
  const server = await newServer(baseURL), a = await device(browser, server, baseURL), b = await device(browser, server, baseURL);
  await addTask(a.page, 'من الأول');
  await signUpAndConfirm(a.page, server); await signIn(a.page);
  await settled(a.page);
  await addTask(b.page, 'من التاني');
  await tab(b.page, 'الإعدادات'); await button(b.page, 'ادخل').click(); await signIn(b.page);
  await expect.poll(() => tasksOf(b.page), {timeout: 15000}).toEqual(['من الأول', 'من التاني']);
  await a.page.reload();
  await expect.poll(() => tasksOf(a.page), {timeout: 15000}).toEqual(['من الأول', 'من التاني']);
  await a.context.close(); await b.context.close();
});

test('offline changes wait, then go when the device is online again', async ({browser, baseURL}) => {
  const server = await newServer(baseURL), a = await device(browser, server, baseURL);
  await signUpAndConfirm(a.page, server); await signIn(a.page); await lineSays(a.page, 'متزامن');
  await a.context.setOffline(true);
  await addTask(a.page, 'من غير نت');
  await expect.poll(async () => (await a.page.locator('p.sync').innerText()), {timeout: 15000}).toContain('مستنية');
  const before = server.rows('stores').find(r => r.name === 'progress').version;
  await a.context.setOffline(false);
  await a.page.evaluate(() => dispatchEvent(new Event('online')));
  await expect.poll(() => server.rows('stores').find(r => r.name === 'progress').version, {timeout: 15000}).toBeGreaterThan(before);
  await a.context.close();
});

test('a new password signs the other device out; a reset with the code keeps the copy, without it starts over', async ({browser, baseURL}) => {
  const server = await newServer(baseURL), a = await device(browser, server, baseURL), b = await device(browser, server, baseURL);
  const code = await signUpAndConfirm(a.page, server); await signIn(a.page);
  await addTask(a.page, 'باقية');
  await settled(a.page);
  await tab(b.page, 'الإعدادات'); await button(b.page, 'ادخل').click(); await signIn(b.page); await lineSays(b.page, 'متزامن');

  await tab(a.page, 'الإعدادات'); await button(a.page, 'غيّر الباسورد').click();
  await a.page.fill('#sy-old', PASSWORD); await a.page.fill('#sy-pass', PASSWORD2); await a.page.fill('#sy-again', PASSWORD2);
  await button(a.page, 'غيّر').click();
  await expect(syncSection(a.page)).toContainText('اتغيّر الباسورد');
  await b.page.reload(); await lineSays(b.page, 'ادخل تاني');

  await tab(b.page, 'الإعدادات'); await button(b.page, 'نسيت الباسورد').click();
  await b.page.fill('#sy-email', EMAIL); await button(b.page, 'ابعتلي لينك').click();
  await openLink(b.page, server.link('reset'));
  await b.page.fill('#sy-email', EMAIL); await b.page.fill('#sy-pass', PASSWORD); await b.page.fill('#sy-again', PASSWORD); await b.page.fill('#sy-code', code.toLowerCase());
  await button(b.page, 'غيّر الباسورد').click();
  await expect(syncSection(b.page)).toContainText('النسخة المتزامنة زي ما هي');
  await expect.poll(() => tasksOf(b.page), {timeout: 15000}).toContain('باقية');

  await tab(b.page, 'الإعدادات'); await button(b.page, 'اخرج من الجهاز ده').click();
  await button(b.page, 'ادخل').click(); await button(b.page, 'نسيت الباسورد').click();
  await b.page.fill('#sy-email', EMAIL); await button(b.page, 'ابعتلي لينك').click();
  await openLink(b.page, server.link('reset'));
  await b.page.fill('#sy-email', EMAIL); await b.page.fill('#sy-pass', PASSWORD2); await b.page.fill('#sy-again', PASSWORD2);
  await expect(syncSection(b.page)).toContainText('النسخة اللي على السيرفر هتتمسح');
  await button(b.page, 'غيّر الباسورد').click();
  await expect(syncSection(b.page)).toContainText('كود الاسترجاع الجديد');
  await a.context.close(); await b.context.close();
});

test('signing out keeps the data; turning sync off deletes the account and its copy', async ({browser, baseURL}) => {
  const server = await newServer(baseURL), a = await device(browser, server, baseURL);
  await addTask(a.page, 'تفضل على الجهاز');
  await signUpAndConfirm(a.page, server); await signIn(a.page);
  await settled(a.page);
  await tab(a.page, 'الإعدادات'); await button(a.page, 'اخرج من الجهاز ده').click();
  await lineSays(a.page, 'على الجهاز ده بس');
  expect(await tasksOf(a.page)).toEqual(['تفضل على الجهاز']);
  expect(server.rows('accounts').length).toBe(1);

  await button(a.page, 'ادخل').click(); await signIn(a.page); await lineSays(a.page, 'متزامن');
  await button(a.page, 'اقفل المزامنة وامسح نسختها').click();
  await button(a.page, 'أيوه، امسحها').click();
  await expect(syncSection(a.page)).toContainText('اتقفلت المزامنة');
  for (const t of ['accounts', 'signins', 'stores', 'email_tokens', 'failures']) expect(server.rows(t)).toEqual([]);
  expect(await tasksOf(a.page)).toEqual(['تفضل على الجهاز']);
  await a.context.close();
});

test('two different schedules on the first join: a backup first, then the owner chooses, and the choice wins', async ({browser, baseURL}) => {
  const named = name => Object.assign(JSON.parse(JSON.stringify(EXAMPLE)), {name});
  const server = await newServer(baseURL), a = await device(browser, server, baseURL, seed(named('جدول الحساب'))), b = await device(browser, server, baseURL, seed(named('جدول الجهاز التاني')));
  await signUpAndConfirm(a.page, server); await signIn(a.page);
  await expect.poll(() => server.rows('stores').some(r => r.name === 'settings'), {timeout: 15000}).toBe(true);
  await tab(b.page, 'الإعدادات'); await button(b.page, 'ادخل').click(); await signIn(b.page);
  await expect(syncSection(b.page)).toContainText('الجدول على الحساب غير الجدول على الجهاز ده');
  const [backup] = await Promise.all([b.page.waitForEvent('download'), button(b.page, 'جدول الجهاز ده').click()]);
  expect(backup.suggestedFilename()).toMatch(/^mizan-backup-/);
  await lineSays(b.page, 'متزامن');
  await a.page.reload();
  await expect.poll(async () => ((await stored(a.page, 'mizan-settings')) || {data: {}}).data.name, {timeout: 15000}).toBe('جدول الجهاز التاني');
  await a.context.close(); await b.context.close();
});

test('with sync off, the app sends nothing to the sync server', async ({browser, baseURL}) => {
  const server = await newServer(baseURL), a = await device(browser, server, baseURL);
  await addTask(a.page, 'محلية بس');
  for (const name of ['اليوم', 'الأسبوع', 'الكورس', 'تمارين', 'الإعدادات']) await tab(a.page, name);
  await a.page.reload();
  expect(server.hits).toBe(0);
  await a.context.close();
});
