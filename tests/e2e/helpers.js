// Shared steps for the end-to-end tests. All data is generated; nothing here is a real person's.
const {expect} = require('@playwright/test');

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

module.exports = {THURSDAY_NIGHT, openApp, tab, button, cspViolations, stored, progress, noticeTitles};
