import { defineConfig, devices } from '@playwright/test';

// Playwright config for the screenshot-regression demo.
// Boots the CRA dev server, opens the "New Test Case" form and compares it
// against a committed baseline screenshot. Run locally for the demo:
//   npm run test:e2e          # compare against baseline (this is the demo)
//   npm run test:e2e:update   # (re)generate the baseline
//   npm run test:e2e:report   # open the HTML report with the visual diff
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    reporter: [['html', { open: 'never' }], ['list']],
    use: {
        baseURL: 'http://localhost:3100',
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        // This codebase uses hyphenated `data-test-id`, not Playwright's
        // default `data-testid`. Point getByTestId() at the right attribute.
        testIdAttribute: 'data-test-id',
    },
    // Keep pixel comparison strict but not flaky on font anti-aliasing.
    expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        // Dedicated port (3100) so the demo never collides with a dev server
        // you already have on :3000 and always serves the current source.
        command: 'npm start',
        url: 'http://localhost:3100',
        reuseExistingServer: true,
        timeout: 120_000,
        // Don't pop a real browser window; the CRA backend URL is irrelevant
        // because the form renders before any API call.
        env: { BROWSER: 'none', PORT: '3100' },
    },
});
