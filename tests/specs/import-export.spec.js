const { test, expect } = require('@playwright/test');
const path = require('path');

test.beforeEach(async ({ page }) => {
  await page.goto('/shell.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.frameLocator('#tool-frame').locator('#topic-list').waitFor();
});

test('Export triggers a download', async ({ page }) => {
  const frame = page.frameLocator('#tool-frame');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    frame.locator('#btn-export-topics').click(),
  ]);
  expect(download).toBeTruthy();
});

test('Import round-trip shows Test Topic in list', async ({ page }) => {
  const frame = page.frameLocator('#tool-frame');
  const fixturePath = path.resolve(__dirname, '../fixtures/topics-import.json');
  await frame.locator('#import-topics-input').setInputFiles(fixturePath);
  await expect(frame.locator('#topic-list')).toContainText('Test Topic');
});

test('Import persists after reload', async ({ page }) => {
  const frame = page.frameLocator('#tool-frame');
  const fixturePath = path.resolve(__dirname, '../fixtures/topics-import.json');
  await frame.locator('#import-topics-input').setInputFiles(fixturePath);
  await expect(frame.locator('#topic-list')).toContainText('Test Topic');
  await page.reload();
  await page.frameLocator('#tool-frame').locator('#topic-list').waitFor();
  await expect(page.frameLocator('#tool-frame').locator('#topic-list')).toContainText('Test Topic');
});
