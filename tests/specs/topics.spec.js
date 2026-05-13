const { test, expect } = require('@playwright/test');

async function createTopic(page, frame, name, regex) {
  await frame.locator('#btn-new-topic').click();
  await frame.locator('#modal-name-input').waitFor({ state: 'visible' });
  await frame.locator('#modal-regex-input').fill(regex);
  // Wait for debounced regex validation (300ms) to mark field valid before typing name
  await frame.locator('#modal-regex-feedback.valid').waitFor();
  await frame.locator('#modal-name-input').fill(name);
  await frame.locator('#btn-modal-save:not([disabled])').waitFor();
  await frame.locator('#btn-modal-save').click();
  await expect(frame.locator('#topic-list .topic-name', { hasText: name })).toBeVisible();
}

test.describe('Topic CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shell.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.frameLocator('#tool-frame').locator('#topic-list').waitFor({ state: 'visible' });
  });

  test('Create topic', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await createTopic(page, frame, 'My Test Topic', 'TestRegex');
    await expect(frame.locator('#topic-list .topic-name', { hasText: 'My Test Topic' })).toBeVisible();
  });

  test('Edit topic', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await createTopic(page, frame, 'My Test Topic', 'TestRegex');

    // Click edit button on the topic row
    const topicRow = frame.locator('.topic-row', { hasText: 'My Test Topic' });
    await topicRow.locator('button.edit-btn').click();

    await frame.locator('#modal-name-input').waitFor({ state: 'visible' });
    await frame.locator('#modal-name-input').fill('Renamed Topic');
    await frame.locator('#btn-modal-save:not([disabled])').waitFor();
    await frame.locator('#btn-modal-save').click();

    await expect(frame.locator('#topic-list')).toContainText('Renamed Topic');
    await expect(frame.locator('#topic-list')).not.toContainText('My Test Topic');
  });

  test('Delete topic', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await createTopic(page, frame, 'My Test Topic', 'TestRegex');

    // Open overflow menu
    const topicRow = frame.locator('.topic-row', { hasText: 'My Test Topic' });
    await topicRow.locator('button.overflow-btn').click();

    // Wait for the overflow menu to appear, then click Delete (accepts confirm dialog)
    const deleteBtn = frame.locator('.topic-overflow-menu .menu-item.danger');
    await deleteBtn.waitFor({ state: 'visible' });
    page.once('dialog', dialog => dialog.accept());
    await deleteBtn.click();

    await expect(frame.locator('#topic-list')).not.toContainText('My Test Topic');
  });

  test('Persists in localStorage', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');
    await createTopic(page, frame, 'My Test Topic', 'TestRegex');

    await page.reload();
    await page.frameLocator('#tool-frame').locator('#topic-list').waitFor({ state: 'visible' });

    await expect(frame.locator('#topic-list')).toContainText('My Test Topic');
  });
});
