const { test, expect } = require('@playwright/test');
const path = require('path');

const fixturePath = path.join(__dirname, '../fixtures/sample.txt');

async function seedAppFlowTopic(page) {
  await page.evaluate(() => {
    localStorage.setItem('webex-log-viewer:topics', JSON.stringify({
      groups: [],
      topics: [{
        id: 'app-flow',
        name: 'App Flow',
        pattern: 'AppController',
        color: '#4db6e8',
        enabled: true,
        group_id: null,
        events: [{
          id: 'app-session',
          name: 'App Session',
          start_keywords: ['Starting application'],
          end_keywords: ['Application shutdown'],
          value_regex: '',
          color: '#4db6e8',
        }],
      }],
    }));
  });
  await page.reload();
  await page.frameLocator('#tool-frame').locator('#topic-list').waitFor({ state: 'visible' });
}

test.describe('Timeline and theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shell.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.frameLocator('#tool-frame').locator('#topic-list').waitFor({ state: 'visible' });
  });

  test('Timeline opens and renders an event row for uploaded logs', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');

    await seedAppFlowTopic(page);
    await expect(frame.locator('.topic-row', { hasText: 'App Flow' })).toBeVisible();

    await frame.locator('#file-input').setInputFiles(fixturePath);
    await expect(frame.locator('#upload-status')).toContainText('lines loaded');

    await frame.locator('#tl-drag-handle').click();
    await expect(frame.locator('#timeline-panel')).toBeVisible();
    await expect(frame.locator('.tl-event-row')).toHaveCount(1);
    await expect(frame.locator('.tl-event-row .tl-label')).toContainText('App Session');

    const hasPixels = await frame.locator('.tl-canvas').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return true;
      }
      return false;
    });
    expect(hasPixels).toBe(true);
  });

  test('Theme toggle syncs Log Viewer and shell theme', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');

    await frame.locator('#theme-toggle').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(frame.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await page.frameLocator('#tool-frame').locator('#topic-list').waitFor({ state: 'visible' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.frameLocator('#tool-frame').locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
