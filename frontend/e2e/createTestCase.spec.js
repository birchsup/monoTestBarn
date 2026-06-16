import { test, expect } from '@playwright/test';

// Screenshot-regression demo for the "New Test Case" form.
//
// The test pins the visual appearance of the form's action row (the DEMO
// marker + "Add Step"/"Create" buttons). Apply docs/demo/break-css.patch to
// break the layout and watch this test fail with a baseline-vs-actual diff in
// the Playwright HTML report.
test.describe('Create Test Case form — visual', () => {
    test('action row matches the baseline screenshot', async ({ page }) => {
        await page.goto('/create');

        // Make sure the form is fully rendered before we snapshot.
        const form = page.getByTestId('test-case-form');
        await expect(form).toBeVisible();
        await expect(page.getByTestId('demo-marker')).toBeVisible();

        // Snapshot just the action row so the diff zeroes in on the DEMO area.
        const actions = page.getByTestId('create-actions');
        await expect(actions).toHaveScreenshot('create-actions.png');
    });

    // A wider snapshot of the whole form, in case you want to show a bigger diff.
    test('full form matches the baseline screenshot', async ({ page }) => {
        await page.goto('/create');

        const form = page.getByTestId('test-case-form');
        await expect(form).toBeVisible();
        await expect(page.getByTestId('demo-marker')).toBeVisible();

        await expect(form).toHaveScreenshot('create-form.png');
    });
});
