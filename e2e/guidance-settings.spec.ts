import { expect, test } from '@playwright/test';

const user = { id: 'u1', email: 'guidance@example.test', fullName: 'Guidance Office', roles: ['Guidance'], departmentId: null, studentId: null, instructorId: null };
test.beforeEach(async ({ page }) => {
  await page.addInitScript(user => { localStorage.setItem('fe.refreshToken', 'test-only'); localStorage.setItem('fe.currentUser', JSON.stringify(user)); }, user);
});

test('Unified settings saves percentages and custom numerical rubric', async ({ page }, info) => {
  let settings = { minimumRespondents: 5, minimumCommentRespondents: 5, respondentThresholdMode: 'Count', respondentPercentage: 50,
    commentThresholdMode: 'Count', commentPercentage: 30, neutralScoreMinimum: 50, positiveScoreMinimum: 75, applyToActivePeriod: false };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { user, accessToken: 'test-only', refreshToken: 'test-only', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z' } });
    if (path.endsWith('/evaluation-settings')) {
      if (route.request().method() === 'PUT') {
        settings = route.request().postDataJSON();
        expect(settings.respondentThresholdMode).toBe('Percentage'); expect(settings.respondentPercentage).toBe(50);
        expect(settings.commentThresholdMode).toBe('Percentage'); expect(settings.commentPercentage).toBe(30);
        expect(settings.neutralScoreMinimum).toBe(55); expect(settings.positiveScoreMinimum).toBe(80);
        expect(settings.applyToActivePeriod).toBe(true);
      }
      return route.fulfill({ json: settings });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/guidance/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'AI & budget', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Account', exact: true })).toBeVisible();
  await page.getByLabel('Respondent threshold', { exact: true }).selectOption('Percentage');
  await page.getByLabel('Written-feedback threshold', { exact: true }).selectOption('Percentage');
  await expect(page.getByLabel('Enrolled students required (%)', { exact: true })).toHaveValue('50');
  await page.getByLabel('Neutral starts at').fill('55'); await page.getByLabel('Positive starts at').fill('80');
  await expect(page.getByText('55 to below 80', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save evaluation settings', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved for the active period');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/settings-${info.project.name}.png`, fullPage: true });
  await page.reload();
  await expect(page.getByLabel('Neutral starts at')).toHaveValue('55');
  await expect(page.getByLabel('Enrolled students required (%)', { exact: true })).toHaveValue('50');
});

test('Guidance changes own password and is prompted to sign in again', async ({ page }) => {
  let changed = false;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { user, accessToken: 'test-only', refreshToken: 'test-only', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z' } });
    if (path.endsWith('/account/password')) {
      expect(route.request().postDataJSON()).toEqual({ currentPassword: 'CurrentPassword1', newPassword: 'NewPassword2', confirmPassword: 'NewPassword2' });
      changed = true; return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 204 });
  });
  await page.goto('/guidance/settings?tab=account');
  await expect(page.getByRole('heading', { name: 'Account settings', exact: true })).toBeVisible();
  await page.getByLabel('Current password', { exact: true }).fill('CurrentPassword1');
  await page.getByLabel('New password', { exact: true }).fill('NewPassword2');
  await page.getByLabel('Confirm new password', { exact: true }).fill('Mismatch2');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('matching new passwords'); expect(changed).toBe(false);
  await page.getByLabel('Confirm new password', { exact: true }).fill('NewPassword2');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page).toHaveURL(/guidance\/login\?passwordChanged=true/);
  await expect(page.getByRole('status')).toContainText('Password changed successfully');
  expect(changed).toBe(true);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('NewPassword2');
});
