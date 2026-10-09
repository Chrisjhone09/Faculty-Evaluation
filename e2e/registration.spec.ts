import { expect, test } from '@playwright/test';

for (const isApproved of [true, false]) {
  test(`student registration shows ${isApproved ? 'automatic approval' : 'manual approval required'}`, async ({ page }, info) => {
    const message = isApproved
      ? 'Your student number is on the master list. Your account is approved and you can sign in now.'
      : 'Your account has been created. Guidance needs to approve it because your student number is not on an active master list.';
    await page.route('**/api/departments/public', route => route.fulfill({ json: [
      { id: 'd1', code: 'CS', name: 'Computer Studies' },
    ] }));
    let registrations = 0;
    await page.route('**/api/auth/register', route => {
      registrations++;
      expect(route.request().headers()['content-type']).toContain('multipart/form-data');
      expect(route.request().postData()).toContain('00123');
      return route.fulfill({ json: { message, isApproved } });
    });
    await page.goto('/register');
    await page.getByLabel('First name', { exact: true }).fill('Jamie');
    await page.getByLabel('Last name', { exact: true }).fill('Santos');
    await page.getByLabel('Email', { exact: true }).fill('student@example.test');
    await page.getByLabel('Password', { exact: true }).fill('E2eOnly!123');
    await page.getByLabel('Student number', { exact: true }).fill('00123');
    await page.getByLabel('Department', { exact: true }).selectOption('d1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('heading', { name: isApproved ? 'Account approved' : 'Awaiting approval', exact: true })).toBeVisible();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    expect(registrations).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/registration-${isApproved ? 'approved' : 'pending'}-${info.project.name}.png`, fullPage: true });
    await page.getByRole('link', { name: isApproved ? 'Sign in' : 'Back to sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
}
