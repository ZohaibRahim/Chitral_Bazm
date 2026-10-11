import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const FONT_PAGE_PORT = 4322;
/** Preview build with the synthetic fixtures rendered through real song pages (KLA_SITE_MODE=preview). */
export const PREVIEW_URL = "http://localhost:4323";

// PRD §3 P1-2: layouts are checked at 360, 390 and 430 px wide.
export const MOBILE_WIDTHS = [360, 390, 430] as const;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? "github" : "list",
  use: { trace: "on-first-retry" },
  projects: [
    // The site, tested against the production build (npm run e2e).
    {
      name: "site",
      testDir: "tests/e2e",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}` },
    },
    // T-07 font test page (npm run fonts:e2e). Needs the font pipeline first: npm run fonts:fetch && fonts:check && fonts:page.
    {
      name: "fonts",
      testDir: "tests/fonts",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${FONT_PAGE_PORT}` },
    },
  ],
  webServer: [
    {
      // Production build on :4321 and preview build (synthetic fixtures, noindex) on :4323. See scripts/e2e-serve.mjs.
      command: "node scripts/e2e-serve.mjs",
      url: `http://localhost:${PORT}/`,
      reuseExistingServer: !process.env["CI"],
      timeout: 300_000,
    },
    {
      command: `node scripts/fonts/serve.mjs --port ${FONT_PAGE_PORT}`,
      url: `http://127.0.0.1:${FONT_PAGE_PORT}/font-test.html`,
      reuseExistingServer: !process.env["CI"],
      timeout: 30_000,
    },
  ],
});
