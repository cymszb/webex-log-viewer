const { test, expect } = require('@playwright/test');

test.describe('Smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#topic-list', { state: 'visible' });
  });

  test('Page loads', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await expect(page).toHaveTitle('Webex Log Viewer');
    expect(consoleErrors).toHaveLength(0);
  });

  test('Sidebar visible', async ({ page }) => {
    await expect(page.locator('#topics-sidebar')).toBeVisible();
    const items = page.locator('#topic-list > *');
    await expect(items.first()).toBeVisible();
  });

  test('Toolbar present', async ({ page }) => {
    await expect(page.locator('#btn-upload-label')).toBeVisible();
    await expect(page.locator('#btn-clear-log')).toBeDisabled();
  });

  test('Drag handle present', async ({ page }) => {
    const handle = page.locator('#tl-drag-handle');
    await expect(handle).toBeVisible();
    await expect(handle).toContainText('Topic Visualization');
  });
});
