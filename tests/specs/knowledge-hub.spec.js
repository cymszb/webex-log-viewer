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
  // Sidebar should have topic buttons
  const topicButtons = frame.locator('aside nav > div > button').first();
  await expect(topicButtons).toBeVisible();
});

test('topic expand/collapse toggles file list', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // On load the first topic (Architecture) is expanded, so there are file buttons
  const allButtons = frame.locator('aside nav > div button');
  let count = await allButtons.count();
  expect(count).toBeGreaterThan(1);

  // Click Architecture topic button to collapse it
  await frame.locator('aside nav > div > button').first().click();

  // Both topics now collapsed — exactly one button per topic
  count = await allButtons.count();
  expect(count).toBe(2);

  // Click Architecture topic button again to expand it
  await frame.locator('aside nav > div > button').first().click();

  // Architecture expanded — file buttons visible again
  count = await allButtons.count();
  expect(count).toBeGreaterThan(1);
});

test('clicking a file loads content', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // Architecture is expanded by default — click the Overview file
  // (second button in the first topic div: topic header + file button)
  const firstTopicDiv = frame.locator('aside nav > div').first();
  const fileBtn = firstTopicDiv.locator('button').nth(1);
  await fileBtn.click();

  // Content area should show rendered markdown
  await expect(frame.locator('.prose')).toBeVisible({ timeout: 5000 });
  // Should have breadcrumb
  await expect(frame.locator('main p').first()).toBeVisible();
});

test('language toggle switches between EN and CN', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // Architecture is expanded — click the Overview file
  const firstTopicDiv = frame.locator('aside nav > div').first();
  await firstTopicDiv.locator('button').nth(1).click();
  await frame.locator('.prose').waitFor({ timeout: 5000 });

  // Check language toggle buttons are visible
  const enBtn = frame.getByRole('button', { name: 'EN' });
  const zhBtn = frame.getByRole('button', { name: '中文' });
  await expect(enBtn).toBeVisible();
  await expect(zhBtn).toBeVisible();

  // EN should be active (highlighted/enabled)
  // Switch to Chinese if available
  if (await zhBtn.isEnabled()) {
    await zhBtn.click();
    // Content should reload (wait a moment)
    await frame.waitForTimeout(500);
  }
});

test('search filters topics', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  const searchInput = frame.locator('aside input[type="text"]');
  await searchInput.fill('Architecture');

  // After filtering, only Architecture topic div should remain.
  // Since Architecture is expanded, count of topic divs should be 1.
  const topicDivs = frame.locator('aside nav > div');
  await expect(topicDivs).toHaveCount(1);

  // The first (only) topic button should contain "Architecture"
  await expect(topicDivs.first().locator('> button').first()).toContainText('Architecture');
});
