// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const slowMo = Number(process.env.SLOWMO || 0);

module.exports = defineConfig({
  testDir: './tests/specs',
  testIgnore: ['**/knowledge-hub.spec.js'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8099',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        headless: true,
        launchOptions: slowMo > 0 ? { slowMo } : undefined,
      },
    },
  ],

  webServer: {
    command: 'python -m http.server 8099',
    url: 'http://localhost:8099/tools.json',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
