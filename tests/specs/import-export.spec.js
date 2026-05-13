const { test, expect } = require('@playwright/test');
const path = require('path');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#topic-list');
});

test('Export triggers a download', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#btn-export-topics'),
  ]);
  expect(download).toBeTruthy();
});

test('Import round-trip shows Test Topic in list', async ({ page }) => {
  const fixturePath = path.resolve(__dirname, '../fixtures/topics-import.json');
  await page.setInputFiles('#import-topics-input', fixturePath);
  await expect(page.locator('#topic-list')).toContainText('Test Topic');
});

test('Import persists after reload', async ({ page }) => {
  const fixturePath = path.resolve(__dirname, '../fixtures/topics-import.json');
  await page.setInputFiles('#import-topics-input', fixturePath);
  await expect(page.locator('#topic-list')).toContainText('Test Topic');
  await page.reload();
  await page.waitForSelector('#topic-list');
  await expect(page.locator('#topic-list')).toContainText('Test Topic');
});
