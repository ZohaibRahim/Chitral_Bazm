import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;

// PRD §3 P1-2: layouts are checked at 360, 390 and 430 px wide.
export const MOBILE_WIDTHS = [360, 390, 430] as const;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Tests run against the production build, served statically.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
  },
});
