const { test, expect } = require('@playwright/test');
const path = require('path');

const fixturePath = path.join(__dirname, '../fixtures/sample.txt');

test.describe('Log upload + filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#topic-list', { state: 'visible' });
    // Disable all topics so they don't filter out log rows
    await page.evaluate(() => {
      topicsState.forEach(t => { t.enabled = false; });
      applyFilters();
      renderTopicList();
    });
  });

  test('Upload log', async ({ page }) => {
    await page.setInputFiles('#file-input', fixturePath);
    await expect(page.locator('#upload-status')).toContainText('lines loaded');
    const rows = page.locator('#log-body tr');
    await expect(rows).toHaveCount(10);
  });

  test('Level filter - Error only', async ({ page }) => {
    await page.setInputFiles('#file-input', fixturePath);
    await expect(page.locator('#upload-status')).toContainText('lines loaded');

    // Uncheck all level checkboxes via JS (they are hidden, clicks don't work)
    await page.evaluate(() => {
      document.querySelectorAll('.level-cb').forEach(cb => {
        if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
      });
    });
    // Check only Error via JS
    await page.evaluate(() => {
      const cb = document.querySelector('.lvl-error input');
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    });

    const rows = page.locator('#log-body tr');
    await expect(rows).toHaveCount(2);
  });

  test('Text search', async ({ page }) => {
    await page.setInputFiles('#file-input', fixturePath);
    await expect(page.locator('#upload-status')).toContainText('lines loaded');

    // Ensure all level filters are checked (reset state) via JS
    await page.evaluate(() => {
      document.querySelectorAll('.level-cb').forEach(cb => {
        if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
      });
    });

    await page.fill('#search-input', 'CoreFrameworkImpl');
    const rows = page.locator('#log-body tr');
    await expect(rows).toHaveCount(2);
  });

  test('Clear log', async ({ page }) => {
    await page.setInputFiles('#file-input', fixturePath);
    await expect(page.locator('#upload-status')).toContainText('lines loaded');

    await page.click('#btn-clear-log');

    const rows = page.locator('#log-body tr');
    await expect(rows).toHaveCount(0);
    await expect(page.locator('#btn-clear-log')).toBeDisabled();
  });
});
