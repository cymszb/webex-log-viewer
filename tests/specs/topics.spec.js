const { test, expect } = require('@playwright/test');

async function createTopic(page, name, regex) {
  await page.click('#btn-new-topic');
  await page.waitForSelector('#modal-name-input', { state: 'visible' });
  await page.fill('#modal-regex-input', regex);
  await page.fill('#modal-name-input', name);
  await page.waitForSelector('#btn-modal-save:not([disabled])');
  await page.click('#btn-modal-save');
  await page.waitForSelector(`#topic-list .topic-name >> text=${name}`);
}

test.describe('Topic CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#topic-list', { state: 'visible' });
  });

  test('Create topic', async ({ page }) => {
    await page.click('#btn-new-topic');
    await page.waitForSelector('#modal-name-input', { state: 'visible' });
    await page.fill('#modal-regex-input', 'TestRegex');
    await page.fill('#modal-name-input', 'My Test Topic');
    await page.waitForSelector('#btn-modal-save:not([disabled])');
    await page.click('#btn-modal-save');
    await expect(page.locator('#topic-list')).toContainText('My Test Topic');
  });

  test('Edit topic', async ({ page }) => {
    await createTopic(page, 'My Test Topic', 'TestRegex');

    // Click edit button on the topic row
    const topicRow = page.locator('.topic-row', { hasText: 'My Test Topic' });
    await topicRow.locator('button.edit-btn').click();

    await page.waitForSelector('#modal-name-input', { state: 'visible' });
    await page.fill('#modal-name-input', 'Renamed Topic');
    await page.waitForSelector('#btn-modal-save:not([disabled])');
    await page.click('#btn-modal-save');

    await expect(page.locator('#topic-list')).toContainText('Renamed Topic');
    await expect(page.locator('#topic-list')).not.toContainText('My Test Topic');
  });

  test('Delete topic', async ({ page }) => {
    await createTopic(page, 'My Test Topic', 'TestRegex');

    // Open overflow menu
    const topicRow = page.locator('.topic-row', { hasText: 'My Test Topic' });
    await topicRow.locator('button.overflow-btn').click();

    // Wait for the overflow menu to appear, then click Delete (accepts confirm dialog)
    const deleteBtn = page.locator('.topic-overflow-menu .menu-item.danger');
    await deleteBtn.waitFor({ state: 'visible' });
    page.once('dialog', dialog => dialog.accept());
    await deleteBtn.click();

    await expect(page.locator('#topic-list')).not.toContainText('My Test Topic');
  });

  test('Persists in localStorage', async ({ page }) => {
    await createTopic(page, 'My Test Topic', 'TestRegex');

    await page.reload();
    await page.waitForSelector('#topic-list', { state: 'visible' });

    await expect(page.locator('#topic-list')).toContainText('My Test Topic');
  });
});
