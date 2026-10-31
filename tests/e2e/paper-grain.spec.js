// Paper grain on the page ground (feature 030): a fixed layer behind the content, faint in light and a little stronger
// in dark, covered by the cards and the band, taking no taps, and gone under more contrast, forced colours and print.
// All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, cspViolations} = require('./helpers');

const look = theme => `localStorage.setItem('mizan-look', JSON.stringify({palette: 'oxblood', theme: '${theme}'}));`;
const layer = page => page.evaluate(() => {
  const s = getComputedStyle(document.body, '::before');
  return {display: s.display, position: s.position, zIndex: s.zIndex, pointerEvents: s.pointerEvents, opacity: s.opacity, image: s.backgroundImage.startsWith('url("data:image/svg+xml,')};
});
// A background that hides what is under it: no transparency.
const solid = (page, selector) => page.locator(selector).first().evaluate(e => {
  const c = getComputedStyle(e).backgroundColor;
  return c !== 'transparent' && !/rgba\(.*,\s*0(\.\d+)?\)$/.test(c);
});

for (const [theme, opacity] of [['light', '0.045'], ['dark', '0.06']]) {
  test(`in ${theme}, the grain is a fixed layer behind the content, at ${opacity}, with no policy violation`, async ({page}) => {
    await openApp(page, {before: look(theme)});
    expect(await layer(page)).toEqual({display: 'block', position: 'fixed', zIndex: '-1', pointerEvents: 'none', opacity, image: true});
    expect(await cspViolations(page)).toEqual([]);
  });
}

test('the cards and the band cover the grain, and a tap still ticks a block', async ({page}) => {
  await openApp(page);
  expect(await solid(page, 'main .notice')).toBe(true);
  expect(await solid(page, 'nav.nav')).toBe(true);
  const box = page.getByRole('checkbox').first();
  await box.click();
  await expect(box).toHaveAttribute('aria-checked', 'true');
});

for (const [name, media] of [['more contrast', {contrast: 'more'}], ['forced colours', {forcedColors: 'active'}], ['print', {media: 'print'}]]) {
  test(`the grain is gone under ${name}`, async ({page, browserName}) => {
    test.skip(name === 'forced colours' && browserName !== 'chromium', 'forced colours are emulated in Chromium only');
    await openApp(page);
    await page.emulateMedia(media);
    expect((await layer(page)).display).toBe('none');
  });
}

test('at phone width nothing scrolls sideways', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await openApp(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
