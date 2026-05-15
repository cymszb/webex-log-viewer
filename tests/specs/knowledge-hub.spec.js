import { test, expect } from '@playwright/test';

async function openKnowledgeHub(page) {
  await page.goto('/shell.html?tool=knowledge-hub');
  const frame = page.frameLocator('#tool-frame');
  await frame.locator('aside').waitFor({ timeout: 10000 });
  return frame;
}

test('knowledge hub loads in shell iframe', async ({ page }) => {
  const frame = await openKnowledgeHub(page);
  await expect(frame.locator('aside')).toBeVisible();
  const topicButtons = frame.locator('aside nav > div > button').first();
  await expect(topicButtons).toBeVisible();
});

test('topic expand/collapse toggles file list', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // First topic is pre-expanded on load
  const allButtons = frame.locator('aside nav > div button');
  let count = await allButtons.count();
  expect(count).toBeGreaterThan(6); // topic buttons + file buttons

  // Click first topic to collapse it
  await frame.locator('aside nav > div > button').first().click();
  count = await allButtons.count();
  expect(count).toBe(5); // just the 5 topic buttons

  // Click again to re-expand
  await frame.locator('aside nav > div > button').first().click();
  count = await allButtons.count();
  expect(count).toBeGreaterThan(6);
});

test('clicking a file loads content', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // First topic is pre-expanded — click first file directly
  const firstTopicDiv = frame.locator('aside nav > div').first();
  const fileBtn = firstTopicDiv.locator('button').nth(1);
  await fileBtn.click();

  // Content area should show rendered markdown
  await expect(frame.locator('.prose')).toBeVisible({ timeout: 5000 });
  await expect(frame.locator('main p').first()).toBeVisible();
});

test('language toggle is visible', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // First topic is pre-expanded — click first file
  await frame.locator('aside nav > div').first().locator('button').nth(1).click();
  await frame.locator('.prose').waitFor({ timeout: 5000 });

  // Language toggle buttons are present (content is EN-only so CN is dimmed)
  await expect(frame.locator('button', { hasText: 'EN' })).toBeAttached();
});

test('search filters topics', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  const searchInput = frame.locator('aside input[type="text"]');
  await searchInput.fill('Foundations');

  // After filtering, only one topic div should remain
  const topicDivs = frame.locator('aside nav > div');
  await expect(topicDivs).toHaveCount(1);
  await expect(topicDivs.first().locator('> button').first()).toContainText('Foundations');
});
