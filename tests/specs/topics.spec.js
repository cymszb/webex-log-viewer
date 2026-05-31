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

  test('Create combined event with child events', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');

    // Navigate and clear state
    await page.goto('/shell.html');
    await frame.locator('#topic-list').waitFor();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await frame.locator('#topic-list').waitFor();

    // Create topic
    await frame.locator('#btn-new-topic').click();
    await frame.locator('#modal-name-input').waitFor({ state: 'visible' });
    await frame.locator('#modal-regex-input').fill('CallTest');
    await frame.locator('#modal-regex-feedback.valid').waitFor();
    await frame.locator('#modal-name-input').fill('Call Topic');
    await frame.locator('#btn-modal-save:not([disabled])').waitFor();
    await frame.locator('#btn-modal-save').click();

    // Open topic edit modal ? add combined event
    const topicRow = frame.locator('.topic-row', { hasText: 'Call Topic' });
    await topicRow.locator('button.edit-btn').click();
    await frame.locator('#topic-modal-backdrop.open').waitFor();

    // Click + Add Event button (opens inline form)
    await frame.locator('#btn-modal-add-event').click();
    await frame.locator('#modal-event-inline-form').waitFor({ state: 'visible' });

    // Select "combined" type
    await frame.locator('.modal-event-type-btn[data-type="combined"]').click();
    await frame.locator('#modal-event-children-section').waitFor({ state: 'visible' });

    // Fill event name and keywords
    await frame.locator('#modal-event-name-input').fill('Meeting Span');
    await frame.locator('#modal-event-start-kw-input').fill('meeting start');
    await frame.locator('#modal-event-end-kw-input').fill('meeting end');

    // Add first child
    await frame.locator('#btn-add-child-event').click();
    await frame.locator('.child-name-input[data-idx="0"]').fill('Muted');
    await frame.locator('.child-kw-input[data-idx="0"]').fill('mute on');

    // Add second child
    await frame.locator('#btn-add-child-event').click();
    await frame.locator('.child-name-input[data-idx="1"]').fill('Screen share');
    await frame.locator('.child-kw-input[data-idx="1"]').fill('sharing started');

    // Save the event
    await frame.locator('#btn-modal-event-save').click();
    await frame.locator('#modal-event-inline-form').waitFor({ state: 'detached' });

    // Verify combined event appears in list with correct badge
    await expect(frame.locator('.modal-event-row .modal-event-badge.combined')).toBeVisible();
    await expect(frame.locator('.modal-event-name', { hasText: 'Meeting Span' })).toBeVisible();

    // Close modal and reopen to verify persistence
    await frame.locator('#btn-modal-close').click();
    await topicRow.locator('button.edit-btn').click();
    await frame.locator('#topic-modal-backdrop.open').waitFor();

    // Reopen the event form to verify child events persisted
    await frame.locator('.modal-event-row', { hasText: 'Meeting Span' }).locator('button.edit-btn').click();
    await frame.locator('#modal-event-inline-form').waitFor({ state: 'visible' });
    await expect(frame.locator('.child-name-input[data-idx="0"]')).toHaveValue('Muted');
    await expect(frame.locator('.child-kw-input[data-idx="0"]')).toHaveValue('mute on');
    await expect(frame.locator('.child-name-input[data-idx="1"]')).toHaveValue('Screen share');
    await expect(frame.locator('.child-kw-input[data-idx="1"]')).toHaveValue('sharing started');
  });
});
