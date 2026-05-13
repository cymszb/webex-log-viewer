const { test, expect } = require('@playwright/test');

test.describe('Smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shell.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.frameLocator('#tool-frame').locator('#topic-list').waitFor({ state: 'visible' });
  });

  test('Page loads', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    await page.goto('/shell.html');
    await page.frameLocator('#tool-frame').locator('#topic-list').waitFor({ state: 'visible' });
    await expect(page).toHaveTitle('Log Viewer — Webex Tools');
    expect(consoleErrors).toHaveLength(0);
  });

  test('Sidebar visible', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await expect(frame.locator('#topics-sidebar')).toBeVisible();
    const items = frame.locator('#topic-list > *');
    await expect(items.first()).toBeVisible();
  });

  test('Toolbar present', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await expect(frame.locator('#btn-upload-label')).toBeVisible();
    await expect(frame.locator('#btn-clear-log')).toBeDisabled();
  });

  test('Drag handle present', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    const handle = frame.locator('#tl-drag-handle');
    await expect(handle).toBeVisible();
    await expect(handle).toContainText('Topic Visualization');
  });
});
