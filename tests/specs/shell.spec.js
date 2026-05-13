const { test, expect } = require('@playwright/test');

test.describe('Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shell.html');
  });

  test('loads shell with nav rail', async ({ page }) => {
    await expect(page.locator('#nav-rail')).toBeVisible();
    await expect(page.locator('#tool-frame')).toBeVisible();
  });

  test('Log Viewer is the default active tool', async ({ page }) => {
    const active = page.locator('#nav-rail .nav-item.active');
    await expect(active).toHaveAttribute('aria-label', 'Log Viewer');
  });

  test('switching to Knowledge Hub loads upcoming page', async ({ page }) => {
    await page.locator('#nav-rail .nav-item[aria-label="Knowledge Hub"]').click();
    const frame = page.frameLocator('#tool-frame');
    await expect(frame.locator('#tool-name')).toHaveText('Knowledge Hub');
  });

  test('URL updates when switching tools', async ({ page }) => {
    await page.locator('#nav-rail .nav-item[aria-label="Knowledge Hub"]').click();
    await expect(page).toHaveURL(/tool=knowledge-hub/);
  });

  test('index.html redirects to shell', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveURL(/shell\.html\?tool=log-viewer/);
  });
});
