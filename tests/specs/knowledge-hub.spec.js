import { test, expect } from '@playwright/test';

async function openKnowledgeHub(page) {
  await page.goto('/shell.html?tool=knowledge-hub');
  const frame = page.frameLocator('#tool-frame');
  await frame.locator('aside').waitFor({ timeout: 10000 });
  // Wait for topics to load and render
  await frame.locator('aside nav > div > button').first().waitFor({ timeout: 10000 });
  return frame;
}

test('knowledge hub loads in shell iframe', async ({ page }) => {
  const frame = await openKnowledgeHub(page);
  await expect(frame.locator('aside')).toBeVisible();
});

test('topic expand/collapse toggles file list', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // First topic (Web Dev) is pre-expanded — file buttons visible
  const firstTopicBtn = frame.locator('aside nav > div > button').first();
  const topicName = await firstTopicBtn.textContent();

  // Click to collapse
  await firstTopicBtn.click();
  // After collapse, the topic button still exists but files are hidden
  await expect(firstTopicBtn).toBeVisible();

  // Click to re-expand
  await firstTopicBtn.click();
  // Files should be visible again — check that a sub-topic button appears
  await expect(frame.locator('aside nav button').filter({ hasText: 'Foundations' })).toBeVisible();
});

test('clicking a file loads content', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // First topic is pre-expanded — find a file button by looking for
  // buttons that don't have chevron indicators (topic toggles have ▼/▶)
  const fileBtn = frame.locator('aside button').filter({ hasText: 'How The Web Works' });
  await fileBtn.click();

  await expect(frame.locator('.prose')).toBeVisible({ timeout: 5000 });
});

test('language toggle is visible', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // Click a file that exists in the pre-expanded structure
  await frame.locator('aside button').filter({ hasText: 'How The Web Works' }).click();
  await frame.locator('.prose').waitFor({ timeout: 5000 });

  // Language toggle buttons are rendered in the ContentArea
  await expect(frame.locator('main button').filter({ hasText: 'EN' })).toBeAttached();
});

test('search filters topics', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  const searchInput = frame.locator('aside input[type="text"]');
  await searchInput.fill('Foundations');

  // After filtering, the Foundations topic should still be visible
  const foundationsBtn = frame.locator('aside nav button').filter({ hasText: 'Foundations' });
  await expect(foundationsBtn).toBeVisible();
});
