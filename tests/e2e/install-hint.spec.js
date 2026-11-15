// How to add the app to the home screen (feature 034): the iPhone notice, the Android steps when the browser offers
// no install of its own, nothing from the home screen or on a computer, and the steps kept in Settings.
const {test, expect} = require('@playwright/test');
const {openApp, tab} = require('./helpers');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const INSTAGRAM = IPHONE + ' Instagram 357.0.0.25.101';
const hint = page => page.locator('.install-hint');
const steps = page => page.locator('.install-hint .install-steps li');
const done = page => hint(page).getByRole('button', {name: 'تمام'});
const reload = async page => { await page.reload(); await expect(page.locator('nav button').first()).toBeVisible(); };

test.describe('on an iPhone in Safari', () => {
  test.use({userAgent: IPHONE, viewport: {width: 375, height: 812}, hasTouch: true});

  test('the notice shows the reason, the two steps and the Share drawing, with no sideways scroll', async ({page}) => {
    await openApp(page);
    await expect(hint(page)).toContainText('Safari ممكن يمسح بياناتك');
    await expect(steps(page)).toHaveCount(2);
    await expect(steps(page).first().locator('svg.share-ic')).toBeVisible();
    await expect(steps(page).nth(1)).toContainText('Add to Home Screen');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('«تمام» hides it for good, and Settings keeps the steps', async ({page}) => {
    await openApp(page);
    await done(page).click();
    await expect(hint(page)).toHaveCount(0);
    await reload(page);
    await expect(hint(page)).toHaveCount(0);
    await tab(page, 'الإعدادات');
    await expect(page.locator('.install-line .install-steps li')).toHaveCount(2);
  });

  test('with storage refused, «تمام» hides it until the page closes, with no error', async ({page}) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await openApp(page, {before: () => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; }});
    await done(page).click();
    await expect(hint(page)).toHaveCount(0);
    await reload(page);
    await expect(hint(page)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('opened from the home screen, there is no notice and no Settings line', async ({page}) => {
    await openApp(page, {before: () => { Object.defineProperty(navigator, 'standalone', {get: () => true}); }});
    await expect(hint(page)).toHaveCount(0);
    await tab(page, 'الإعدادات');
    await expect(page.locator('.install-line')).toHaveCount(0);
  });
});

test.describe('inside another app on an iPhone', () => {
  test.use({userAgent: INSTAGRAM, hasTouch: true});
  test('the notice asks to open the link in Safari first', async ({page}) => {
    await openApp(page);
    await expect(steps(page)).toHaveCount(1);
    await expect(steps(page)).toContainText('افتح اللينك في Safari الأول');
  });
});

test.describe('on Android', () => {
  test.use({userAgent: ANDROID, hasTouch: true});

  test('with no install offer, the Android steps show', async ({page}) => {
    await openApp(page);
    await expect(steps(page)).toHaveCount(2);
    await expect(steps(page).nth(1)).toContainText('Install app');
  });

  test('when the browser offers installing, its «ثبّت» button shows instead of the steps', async ({page}) => {
    await openApp(page);
    await page.evaluate(() => { const e = new Event('beforeinstallprompt', {cancelable: true}); e.prompt = async () => {}; window.dispatchEvent(e); });
    await expect(page.locator('.install button', {hasText: 'ثبّت'})).toBeVisible();
    await expect(hint(page)).toHaveCount(0);
    await tab(page, 'الإعدادات');
    await expect(page.locator('.install-line .install-steps li')).toHaveCount(2);
  });
});

test('on a computer there is no notice and no Settings line', async ({page}) => {
  await openApp(page);
  await expect(hint(page)).toHaveCount(0);
  await tab(page, 'الإعدادات');
  await expect(page.locator('.install-line')).toHaveCount(0);
});
