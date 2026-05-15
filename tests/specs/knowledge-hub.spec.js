import { test, expect } from '@playwright/test';

async function openKnowledgeHub(page) {
  await page.goto('/shell.html?tool=knowledge-hub');
  const frame = page.frameLocator('#tool-frame');
  await frame.locator('aside').waitFor({ timeout: 10000 });
  // Wait for topic list to render
  await frame.locator('aside nav button').first().waitFor({ timeout: 10000 });
  return frame;
}

test('knowledge hub loads in shell iframe', async ({ page }) => {
  const frame = await openKnowledgeHub(page);
  await expect(frame.locator('aside')).toBeVisible();
});

test('sidebar has title header', async ({ page }) => {
  const frame = await openKnowledgeHub(page);
  // The title header should show "Knowledge Hub"
  await expect(frame.locator('aside')).toContainText('Knowledge Hub');
});

test('topic expand/collapse toggles children', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // The first topic button is "Web Dev" (parent, pre-expanded with ancestor fix)
  const webDevBtn = frame.locator('aside nav > div > button').first();
  await expect(webDevBtn).toBeVisible();

  // Click to collapse
  await webDevBtn.click();
  // Children should now be hidden
  const childBtn = frame.locator('aside nav button').filter({ hasText: 'Foundations' });
  await expect(childBtn).not.toBeVisible();

  // Click to re-expand
  await webDevBtn.click();
  await expect(childBtn).toBeVisible();
});

test('clicking a file loads content', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // Click a file that's visible when nested topics are pre-expanded
  const fileBtn = frame.locator('aside nav button').filter({ hasText: 'How The Web Works' });
  await fileBtn.click();

  await expect(frame.locator('.prose')).toBeVisible({ timeout: 5000 });
});

test('search filters topics', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  const searchInput = frame.locator('aside input[type="text"]');
  await searchInput.fill('Foundations');

  // After filtering, Foundations should be visible
  await expect(frame.locator('aside nav button').filter({ hasText: 'Foundations' })).toBeVisible();
});
