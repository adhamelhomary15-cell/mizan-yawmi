// Escape closes each panel that listens for it (useEscape): the postpone panel, a workout sheet, the editor of a
// past set, and the restore question. All data is generated.
const {test, expect} = require('@playwright/test');
const {openApp, tab, button} = require('./helpers');

// Presses Escape once the panel's effects ran: Preact runs them after a frame, and openApp's clock holds frames back
// until the clock moves.
const escape = async page => { await page.clock.runFor(100); await page.keyboard.press('Escape'); };

test('Escape closes the postpone panel', async ({page}) => {
  await openApp(page);
  await page.locator('.timeline button.row-body', {hasText: 'مذاكرة'}).first().click();
  await page.locator('.row-actions button', {hasText: 'أجّلها'}).click();
  await expect(page.locator('.postpone')).toBeVisible();
  await escape(page);
  await expect(page.locator('.postpone')).toHaveCount(0);
});

// A workout with one finished set, saved, so the history has it.
async function saveWorkout(page) {
  await tab(page, 'تمارين');
  await button(page, 'ابدأ تمرينة فاضية').click();
  await button(page, 'ضيف تمرين').click();
  await page.locator('.wk-pick', {hasText: 'Bench Press'}).first().click();
  await page.getByLabel('Bench Press، مجموعة 1، الوزن بالكيلو').fill('60');
  await page.getByLabel('Bench Press، مجموعة 1، التكرارات').fill('8');
  await page.getByLabel('خلّصت مجموعة 1').click();
  await page.locator('#wk-finish').click();
}

test('Escape closes a workout sheet, and then the editor of a past set', async ({page}) => {
  await openApp(page);
  await saveWorkout(page);
  const sheet = page.getByRole('dialog', {name: 'إنهاء التمرينة'});
  await expect(sheet).toBeVisible();
  await escape(page);
  await expect(sheet).toHaveCount(0);

  await page.locator('#wk-finish').click();
  await button(page, 'احفظ التمرينة').click();
  await button(page, 'السجل').click();
  await page.locator('.wk-card').first().click();
  const fix = page.getByLabel('عدّل مجموعة 1 من Bench Press');
  await fix.click();
  await expect(fix).toHaveCount(0);
  await escape(page);
  await expect(fix).toBeVisible();
});

test('Escape cancels the restore question', async ({page}, info) => {
  await openApp(page);
  await tab(page, 'الإعدادات');
  const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'احفظ نسخة احتياطية').click()]);
  const file = info.outputPath('backup.json');
  await download.saveAs(file);
  await page.setInputFiles('#backup-file', file);
  await expect(button(page, 'استرجع')).toBeVisible();
  await escape(page);
  await expect(button(page, 'استرجع')).toHaveCount(0);
});
