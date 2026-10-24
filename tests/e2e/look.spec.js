// The look (feature 022): four palettes that change only the frame and the ground, a light, dark or automatic theme
// kept on the device under its own key, and a soft change of colours. Tests that are not about the fade run with
// reduced motion, so colours are read at their end value. All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button, cspViolations} = require('./helpers');

test.use({reducedMotion: 'reduce'});

const root = (page, name) => page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const attr = (page, name) => page.evaluate(n => document.documentElement.getAttribute(n), name);
const band = page => page.locator('nav.nav').evaluate(e => getComputedStyle(e).backgroundColor);
const statusBar = page => page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
const pressed = page => page.locator('main button[aria-pressed="true"]').allInnerTexts();
const pick = async (page, name) => { await button(page, name).click(); };
// openApp fixes the date through Playwright's clock, which also replaces requestAnimationFrame and performance.now.
// Tests that read frames open the app on the real clock instead; none of them depends on the date.
async function openLive(page, before) {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
  });
  if (before) await page.addInitScript(before);
  await page.goto('index.html');
  await expect(page.locator('nav button').first()).toBeVisible();
}
// What each frame shows while the page loads (FR-005: no flash of other colours): recorded by a requestAnimationFrame
// loop set before any of the page's scripts, which runs before each paint, until the app has drawn its bar. The ground
// is the body's background, the browser's own white until the colours are parsed. Every frame is kept, not only the
// first: under load the first frame can come before the look script, and a later one could still be unthemed.
const loadFrames = () => {
  window.__frames = [];
  const tick = () => {
    const d = document.documentElement;
    window.__frames.push({palette: d.getAttribute('data-palette'), theme: d.getAttribute('data-theme'), bg: document.body && getComputedStyle(document.body).backgroundColor});
    if (document.querySelector('nav button')) window.__loaded = true; else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
// The page can be visible to Playwright before the frame that shows it is drawn, so that frame is waited for. Returns
// the frames that differ from the loaded page.
const otherFrames = async page => {
  await expect.poll(() => page.evaluate(() => !!window.__loaded)).toBe(true);
  return page.evaluate(() => {
    const d = document.documentElement;
    const now = {palette: d.getAttribute('data-palette'), theme: d.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor};
    return window.__frames.filter(f => JSON.stringify(f) !== JSON.stringify(now));
  });
};

test.describe('US1: picking a palette', () => {
  test('a palette changes the band and the ground, never a kind\'s ink, and is kept with no flash', async ({page}) => {
    await openLive(page, loadFrames);
    const ink = await root(page, '--uni'), oldBand = await band(page), oldBg = await root(page, '--bg');
    await tab(page, 'الإعدادات');
    expect(await pressed(page)).toEqual(['تلقائي', 'عنابي']);
    await pick(page, 'كحلي');
    expect(await attr(page, 'data-palette')).toBe('navy');
    expect(await band(page)).not.toBe(oldBand);
    expect(await root(page, '--bg')).not.toBe(oldBg);
    expect(await root(page, '--uni')).toBe(ink);
    expect(await pressed(page)).toEqual(['تلقائي', 'كحلي']);
    await page.reload();
    await expect(page.locator('nav button').first()).toBeVisible();
    expect(await attr(page, 'data-palette')).toBe('navy');
    expect(await otherFrames(page)).toEqual([]);
    expect(await cspViolations(page)).toEqual([]);
  });

  test('the status bar takes the band of the palette, in light and in dark', async ({page}) => {
    await openApp(page);
    await tab(page, 'الإعدادات');
    await pick(page, 'كحلي');
    await pick(page, 'فاتح');
    expect((await statusBar(page)).toUpperCase()).toBe('#1F2F4F');
    await pick(page, 'غامق');
    expect((await statusBar(page)).toUpperCase()).toBe('#121C30');
  });
});

test.describe('US2: light, dark or automatic', () => {
  test.describe('on a dark phone', () => {
    test.use({colorScheme: 'dark'});
    test('a first open with no choice is dark, with «تلقائي» chosen', async ({page}) => {
      await openLive(page, loadFrames);
      expect(await attr(page, 'data-theme')).toBe('dark');
      expect(await otherFrames(page)).toEqual([]);
      await tab(page, 'الإعدادات');
      expect(await pressed(page)).toEqual(['تلقائي', 'عنابي']);
    });
  });

  test('«غامق» is kept after a reload, whatever the phone', async ({page}) => {
    await openApp(page);
    await tab(page, 'الإعدادات');
    await pick(page, 'غامق');
    expect(await attr(page, 'data-theme')).toBe('dark');
    await page.reload();
    await expect(page.locator('nav button').first()).toBeVisible();
    expect(await attr(page, 'data-theme')).toBe('dark');
  });

  test('«تلقائي» follows the phone while the app is open; «فاتح» does not', async ({page}) => {
    await page.emulateMedia({colorScheme: 'light'});
    await openApp(page);
    await tab(page, 'الإعدادات');
    await pick(page, 'تلقائي');
    await page.emulateMedia({colorScheme: 'dark'});
    await expect.poll(() => attr(page, 'data-theme')).toBe('dark');
    await page.emulateMedia({colorScheme: 'light'});
    await expect.poll(() => attr(page, 'data-theme')).toBe('light');
    await pick(page, 'فاتح');
    await page.emulateMedia({colorScheme: 'dark'});
    await page.waitForTimeout(300);
    expect(await attr(page, 'data-theme')).toBe('light');
  });
});

test.describe('US3: a soft change of colours', () => {
  test.use({reducedMotion: 'no-preference'});
  // Waits until the page has settled after loading, so a frame's timing is the fade's and not the load's.
  const settle = page => page.waitForTimeout(500);

  // Time is counted in drawn frames, not timers: with tests in parallel, headless Chromium sometimes draws no frames for
  // a page for a while, and a CSS transition only moves with frames. The fade's real time on a slow phone is measured
  // in tasks.md (T012).
  test('the colours fade together to the new ones', async ({page}) => {
    await openLive(page);
    await settle(page);
    const r = await page.evaluate(() => new Promise(done => {
      const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const before = [css('--bg'), css('--uni')];
      let t0 = null, mid = null;
      mizanLook.set({theme: 'dark'});
      const tick = now => {
        if (t0 === null) t0 = now;
        if (!mid && now - t0 >= 100) mid = [css('--bg'), css('--uni')];
        if (now - t0 < 700) requestAnimationFrame(tick); else done({before, mid, after: [css('--bg'), css('--uni')]});
      };
      requestAnimationFrame(tick);
    }));
    expect(r.after).toEqual(['rgb(22, 20, 26)', 'rgb(238, 142, 156)']);
    r.mid.forEach((v, i) => { expect(v).not.toBe(r.before[i]); expect(v).not.toBe(r.after[i]); });
  });

  test('a check tap during the fade ticks the block', async ({page}) => {
    await openLive(page);
    await settle(page);
    const ticked = await page.evaluate(() => new Promise(done => {
      const chk = document.querySelector('.timeline li [role=checkbox]');
      const was = chk.getAttribute('aria-checked');
      mizanLook.set({theme: 'dark'});
      setTimeout(() => { chk.click(); setTimeout(() => done([was, document.querySelector('.timeline li [role=checkbox]').getAttribute('aria-checked')]), 50); }, 100);
    }));
    expect(ticked).toEqual(['false', 'true']);
  });

  test('«فاتح» then «غامق» within the fade ends dark, with no turn back toward light', async ({page}) => {
    await openLive(page);
    await settle(page);
    const lights = await page.evaluate(() => new Promise(done => {
      const light = () => { const [r, g, b] = getComputedStyle(document.documentElement).getPropertyValue('--bg').match(/\d+/g).map(Number); return r + g + b; };
      // Taps at frames 0, 5 and 10 (about 80ms apart), then records every frame for 700ms of drawn time.
      const seen = [];
      let frame = 0, t0 = null;
      const tick = now => {
        if (frame === 0) mizanLook.set({theme: 'dark'});
        if (frame === 5) mizanLook.set({theme: 'light'});
        if (frame === 10) { mizanLook.set({theme: 'dark'}); t0 = now; }
        if (t0 !== null) seen.push(light());
        frame++;
        if (t0 === null || now - t0 < 700) requestAnimationFrame(tick); else done(seen);
      };
      requestAnimationFrame(tick);
    }));
    expect(lights[lights.length - 1]).toBe(22 + 20 + 26);
    lights.slice(1).forEach((v, i) => expect(v).toBeLessThanOrEqual(lights[i]));
  });

  test.describe('with reduced motion', () => {
    test.use({reducedMotion: 'reduce'});
    test('the new colours show at once', async ({page}) => {
      await openLive(page);
      const bg = await page.evaluate(() => { mizanLook.set({theme: 'dark'}); return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(); });
      expect(bg).toBe('rgb(22, 20, 26)');
    });
  });
});

test.describe('edge cases', () => {
  test('with storage blocked the choice applies, and a reload opens in the default with no error', async ({page}) => {
    await openApp(page, {before: () => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; }});
    await tab(page, 'الإعدادات');
    await pick(page, 'رمادي');
    expect(await attr(page, 'data-palette')).toBe('graphite');
    await page.reload();
    await expect(page.locator('nav button').first()).toBeVisible();
    expect(await attr(page, 'data-palette')).toBe('oxblood');
  });

  test('a broken stored look reads as the defaults', async ({page}) => {
    await openApp(page, {before: () => { localStorage.setItem('mizan-look', '{"palette":"pink","theme":7'); }});
    expect([await attr(page, 'data-palette'), await page.evaluate(() => mizanLook.get().theme)]).toEqual(['oxblood', 'auto']);
    await tab(page, 'الإعدادات');
    expect(await pressed(page)).toEqual(['تلقائي', 'عنابي']);
  });

  test('a backup holds no look, and restoring it or importing settings leaves the look as it is', async ({page}, info) => {
    await openApp(page);
    await tab(page, 'الإعدادات');
    await pick(page, 'كحلي');
    const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'احفظ نسخة احتياطية').click()]);
    const file = info.outputPath('backup.json');
    await download.saveAs(file);
    expect(require('fs').readFileSync(file, 'utf8')).not.toContain('mizan-look');
    await pick(page, 'رمادي');
    await page.setInputFiles('#backup-file', file);
    await button(page, 'استرجع').click();
    await page.waitForLoadState('load');
    await expect.poll(() => attr(page, 'data-palette')).toBe('graphite');
    await tab(page, 'الإعدادات');
    await page.locator('main input[type=file]:not(#backup-file)').setInputFiles(require('path').join(__dirname, '..', '..', 'settings.example.json'));
    await button(page, 'استبدل').click();
    await page.waitForLoadState('load');
    expect(await attr(page, 'data-palette')).toBe('graphite');
  });

  test('offline, the app opens in the kept look', async ({page, context, browserName}) => {
    // As in offline.spec.js: Playwright's WebKit blocks offline navigation before the service worker can answer.
    test.skip(browserName === 'webkit', 'Playwright WebKit blocks offline navigation before the service worker');
    await openApp(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await tab(page, 'الإعدادات');
    await pick(page, 'زيتي');
    await pick(page, 'غامق');
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('nav button').first()).toBeVisible();
    expect([await attr(page, 'data-palette'), await attr(page, 'data-theme')]).toEqual(['olive', 'dark']);
    await context.setOffline(false);
  });
});
