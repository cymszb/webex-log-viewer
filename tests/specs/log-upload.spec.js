const { test, expect } = require('@playwright/test');
const path = require('path');

const fixturePath = path.join(__dirname, '../fixtures/sample.txt');

test.describe('Log upload + filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shell.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.frameLocator('#tool-frame').locator('#topic-list').waitFor({ state: 'visible' });
    // Disable all topics so they don't filter out log rows
    const iframeHandle = page.frames().find(f => f.url().includes('index.html'));
    await iframeHandle.evaluate(() => {
      topicsState.forEach(t => { t.enabled = false; });
      applyFilters();
      renderTopicList();
    });
  });

  test('Upload log', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await frame.locator('#file-input').setInputFiles(fixturePath);
    await expect(frame.locator('#upload-status')).toContainText('lines loaded');
    const rows = frame.locator('#log-body tr');
    await expect(rows).toHaveCount(10);
  });

  test('Level filter - Error only', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await frame.locator('#file-input').setInputFiles(fixturePath);
    await expect(frame.locator('#upload-status')).toContainText('lines loaded');

    // Uncheck all level checkboxes via JS (they are hidden, clicks don't work)
    const iframeHandle = page.frames().find(f => f.url().includes('index.html'));
    await iframeHandle.evaluate(() => {
      document.querySelectorAll('.level-cb').forEach(cb => {
        if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
      });
    });
    // Check only Error via JS
    await iframeHandle.evaluate(() => {
      const cb = document.querySelector('.lvl-error input');
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    });

    const rows = frame.locator('#log-body tr');
    await expect(rows).toHaveCount(2);
  });

  test('Text search', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await frame.locator('#file-input').setInputFiles(fixturePath);
    await expect(frame.locator('#upload-status')).toContainText('lines loaded');

    // Ensure all level filters are checked (reset state) via JS
    const iframeHandle = page.frames().find(f => f.url().includes('index.html'));
    await iframeHandle.evaluate(() => {
      document.querySelectorAll('.level-cb').forEach(cb => {
        if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
      });
    });

    await frame.locator('#search-input').fill('CoreFrameworkImpl');
    const rows = frame.locator('#log-body tr');
    await expect(rows).toHaveCount(2);
  });

  test('Regex search supports class-method-message boundaries', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await frame.locator('#file-input').setInputFiles(fixturePath);
    await expect(frame.locator('#upload-status')).toContainText('lines loaded');

    await frame.locator('#btn-regex-toggle').click();
    await frame.locator('#search-input').fill('CoreFrameworkImpl::init::CF\\s+(Initializing|Security)');

    await expect(frame.locator('#search-input-wrap')).toHaveClass(/regex-active/);
    await expect(frame.locator('#log-body tr')).toHaveCount(2);
  });

  test('PID, TID, and source filters narrow uploaded logs', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await frame.locator('#file-input').setInputFiles(fixturePath);
    await expect(frame.locator('#upload-status')).toContainText('lines loaded');

    await frame.locator('#pid-input').fill('1234');
    await expect(frame.locator('#log-body tr')).toHaveCount(10);

    await frame.locator('#tid-input').fill('567f');
    await expect(frame.locator('#log-body tr')).toHaveCount(1);
    await expect(frame.locator('#log-body')).toContainText('Security check failed');

    await frame.locator('#tid-input').fill('');
    await frame.locator('#source-input').fill('security.cpp');
    await expect(frame.locator('#log-body tr')).toHaveCount(1);
    await expect(frame.locator('#log-body')).toContainText('Security check failed');
  });

  test('Clear log', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await frame.locator('#file-input').setInputFiles(fixturePath);
    await expect(frame.locator('#upload-status')).toContainText('lines loaded');

    await frame.locator('#btn-clear-log').click();

    const rows = frame.locator('#log-body tr');
    await expect(rows).toHaveCount(0);
    await expect(frame.locator('#btn-clear-log')).toBeDisabled();
  });
});
