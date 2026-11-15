// The app icon in graphite (feature 033): the shipped manifest, the first status bar colour and every icon carry the
// graphite palette, with no oxblood left.
const {test, expect} = require('@playwright/test');

const ICONS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

test('the manifest takes the accent for the title bar and the light paper for the splash', async ({request}) => {
  const m = await (await request.get('manifest.webmanifest')).json();
  expect([m.theme_color, m.background_color]).toEqual(['#1F1F22', '#F2F2F0']);
});

test('the status bar is the accent before any script runs', async ({request}) => {
  const page = await (await request.get('index.html')).text();
  expect(page.match(/<meta name="theme-color" content="([^"]+)">/)[1]).toBe('#1F1F22');
  expect(page).not.toMatch(/#6E1A28|#E7ECE3/i);
});

// Each icon drawn on a canvas: a pixel near the top edge is the graphite ground, the rosette holds navy and amber
// pixels, and no pixel is oxblood.
for (const name of ICONS) {
  test(`${name} is the rosette on graphite, navy and amber, with no oxblood`, async ({page}) => {
    await page.goto('index.html');
    const r = await page.evaluate(async src => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      const near = (i, [r, gg, b]) => Math.abs(px[i] - r) + Math.abs(px[i + 1] - gg) + Math.abs(px[i + 2] - b) < 30 && px[i + 3] > 200;
      let navy = 0, amber = 0, oxblood = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (near(i, [158, 189, 250])) navy++;
        if (near(i, [217, 136, 75])) amber++;
        if (near(i, [110, 26, 40])) oxblood++;
      }
      const top = ((Math.round(c.height * 0.06) * c.width) + Math.round(c.width / 2)) * 4;
      return {ground: [px[top], px[top + 1], px[top + 2]], navy: navy > 0, amber: amber > 0, oxblood};
    }, name);
    expect(r).toEqual({ground: [31, 31, 34], navy: true, amber: true, oxblood: 0});
  });
}
