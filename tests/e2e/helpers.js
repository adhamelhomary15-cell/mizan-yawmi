// Shared steps for the end-to-end tests. All data is generated; nothing here is a real person's.
const fs = require('fs');
const path = require('path');
const {expect} = require('@playwright/test');

// The generic example settings embedded in the app.
const EXAMPLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'planner.html'), 'utf8')
  .match(/<script type="application\/json" id="example-settings">([\s\S]*?)<\/script>/)[1]);

// Thursday 2026-10-15, 23:30 in Cairo: every block of the example's Thursday has passed except «وقتك», so the day
// review has study and course blocks it can postpone into Friday's free time.
const THURSDAY_NIGHT = new Date('2026-10-15T20:30:00Z');

// Opens the app at a fixed time, collecting CSP violations from before the first script runs.
async function openApp(page, {at = THURSDAY_NIGHT, before} = {}) {
  await page.clock.setFixedTime(at);
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
  });
  if (before) await page.addInitScript(before);
  await page.goto('index.html');
  await expect(page.locator('nav button').first()).toBeVisible();
}
const tab = (page, name) => page.locator('nav button', {hasText: name}).click();
const button = (page, name) => page.locator('main button', {hasText: new RegExp('^\\s*' + name + '\\s*$')});
const cspViolations = page => page.evaluate(() => window.__csp);
const stored = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);
const progress = async page => ((await stored(page, 'mizan-progress')) || {}).data;
const noticeTitles = page => page.locator('.notice b').allInnerTexts();
// Clicks the button that saves, imports or resets the settings, and waits until they apply: the button's screen is gone
// and the toast names what happened (020: the page does not reopen).
async function applyChange(page, name, line) {
  await button(page, name).click();
  await expect(button(page, name)).toHaveCount(0);
  await expect(page.locator('.toast p')).toHaveText(line);
}
const saveSchedule = async page => { await button(page, 'احفظ الجدول').click(); await applyChange(page, 'أيوه، احفظ', 'اتحفظ الجدول'); };

// Settings stored as the app stores them (013), and progress under the old key, written once per test.
function seed(settings, progress) {
  const data = JSON.stringify(settings);
  const old = progress ? JSON.stringify(Object.assign({v: 1, checks: {}, modules: {}, tasks: [], appts: [], courses: [], extras: {}, phaseSeen: 'A'}, progress)) : null;
  return `if (!sessionStorage.getItem('seeded')) {
    sessionStorage.setItem('seeded', '1');
    const data = ${JSON.stringify(data)};
    let h = 0x811c9dc5; for (let i = 0; i < data.length; i++) { h ^= data.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    localStorage.setItem('mizan-settings', JSON.stringify({format: 'mizan-store', store: 'settings', version: 2, savedAt: new Date().toISOString(), sum: ('0000000' + h.toString(16)).slice(-8), data: JSON.parse(data)}));
    ${old ? `localStorage.setItem('fall26-planner-v1', ${JSON.stringify(old)});` : ''}
  }`;
}

module.exports = {THURSDAY_NIGHT, openApp, tab, button, cspViolations, stored, progress, noticeTitles, applyChange, saveSchedule, EXAMPLE, seed};
