// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    browserName: "chromium",
    headless: true,
    viewport: { width: 390, height: 844 },
    baseURL: "http://localhost:8080",
    locale: "en-US",
    timezoneId: "UTC",
    // The service worker would cache files between tests; the app works without it.
    serviceWorkers: "block",
  },
  projects: [
    { name: "light", use: { colorScheme: "light" } },
    { name: "dark", use: { colorScheme: "dark" } },
  ],
  webServer: {
    command: "npm run serve",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
