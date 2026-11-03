import { expect, test } from '@playwright/test';

for (const hasActivePeriod of [true, false]) {
  test(`active student can log in without assigned evaluations (active period: ${hasActivePeriod})`, async ({ page }) => {
    await page.route('**/api/auth/student-login', route => route.fulfill({ json: {
      accessToken: 'test', refreshToken: 'test', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
      user: { id: 'student', email: 'student@students.invalid', fullName: 'Jamie Santos', roles: ['Student'], studentId: 's1' },
    } }));
    await page.route('**/api/students/me/evaluations', route => route.fulfill({ json: { hasActivePeriod,
      evaluationPeriodName: hasActivePeriod ? 'Current period' : null, evaluationPeriodEndDate: '2027-01-01T00:00:00Z', pending: [], completed: [] } }));
    await page.goto('/student/login'); await page.getByLabel('Student ID', { exact: true }).fill('00123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Pending Evaluations' })).toBeVisible();
    await expect(page.getByText(hasActivePeriod ? 'No evaluations are currently assigned to you.'
      : "There's no active evaluation period right now. Check back once your school opens one.", { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Evaluate', exact: true })).toHaveCount(0);
  });
}

test('student login uses Student ID only and registration is unavailable', async ({ page }, info) => {
  let calls = 0;
  await page.route('**/api/auth/student-login', route => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ studentNumber: '00123' });
    return route.fulfill({ json: {
      accessToken: 'e2e-only', refreshToken: 'e2e-only', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
      user: { id: 'u1', email: 'internal@students.invalid', fullName: 'Jamie Santos', roles: ['Student'], studentId: 's1', departmentId: null, instructorId: null },
    } });
  });
  await page.route('**/api/students/me/evaluations', route => route.fulfill({ json: {
    hasActivePeriod: true, evaluationPeriodName: 'First Semester 2026', evaluationPeriodEndDate: '2027-01-01T00:00:00Z',
    pending: [{ classMembershipId: 'm1', classOfferingId: 'c1', subjectCode: 'CS101, CS102', subjectTitle: 'Computing / Programming',
      sectionCode: 'CS1A', term: '2026', instructorName: 'Alex Reyes', submittedAtUtc: null }], completed: [],
  } }));
  await page.goto('/register');
  await expect(page).toHaveURL(/\/student\/login$/);
  await expect(page.getByLabel('Password')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Create an account' })).toHaveCount(0);
  await page.getByLabel('Student ID', { exact: true }).fill('00123');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/student-login-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pending Evaluations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Evaluate', exact: true })).toHaveCount(1);
  expect(calls).toBe(1);
});

test('unlisted Student ID gets a clear login error', async ({ page }) => {
  await page.route('**/api/auth/student-login', route => route.fulfill({ status: 401, json: { detail: 'Student access unavailable.' } }));
  await page.goto('/student/login'); await page.getByLabel('Student ID', { exact: true }).fill('99999');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Student ID was not found or the account is inactive.');
  await expect(page).toHaveURL(/\/student\/login$/);
});

test('Guidance has a separate password-protected login', async ({ page }) => {
  await page.goto('/guidance/settings');
  await expect(page).toHaveURL(/\/guidance\/login$/);
  await expect(page.getByText('Guidance Login', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('combined student evaluation presents descending ratings and optional comments', async ({ page }) => {
  const user = { id: 'u1', email: 'internal@students.invalid', fullName: 'Jamie Santos', roles: ['Student'], studentId: 's1', departmentId: null, instructorId: null };
  await page.addInitScript(user => {
    localStorage.setItem('fe.refreshToken', 'e2e-only'); localStorage.setItem('fe.currentUser', JSON.stringify(user));
  }, user);
  await page.route('**/api/auth/refresh', route => route.fulfill({ json: { user, accessToken: 'e2e-only', refreshToken: 'e2e-only', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z' } }));
  await page.route('**/api/students/me/evaluations/m1/form', route => route.fulfill({ json: {
    classMembershipId: 'm1', evaluationPeriodId: 'p1', subjectCode: 'CS101, CS102', subjectTitle: 'Computing / Programming', sectionCode: 'CS1A', instructorName: 'Alex Reyes',
    categories: [{ id: 'cat1', name: 'Teaching', displayOrder: 1, questions: [
      { id: 'q1', text: 'Explains concepts clearly.', questionType: 'Likert1to5', displayOrder: 1, isReverseScored: true },
      { id: 'q2', text: 'Overall appraisal', questionType: 'RapidAppraisal', displayOrder: 2, isReverseScored: false },
    ] }],
  } }));
  let submissions = 0;
  await page.route('**/api/evaluations', route => {
    submissions++;
    expect(route.request().postDataJSON().answers).toEqual([
      { questionId: 'q1', ratingValue: 5, commentText: null }, { questionId: 'q2', ratingValue: 10, commentText: null },
    ]);
    return route.fulfill({ json: { evaluationId: 'e1', submittedAtUtc: '2026-10-11T00:00:00Z' } });
  });
  await page.goto('/student/evaluate/m1');
  await expect(page.getByRole('heading', { name: 'Alex Reyes', exact: true })).toBeVisible();
  const inventory = page.locator('input[name="q1"]');
  await expect(inventory).toHaveCount(5);
  expect(await inventory.evaluateAll(inputs => inputs.map(input => input.closest('label')!.textContent!.trim()))).toEqual(['5', '4', '3', '2', '1']);
  await inventory.first().check(); await page.locator('input[name="q2"]').first().check();
  await page.getByRole('button', { name: 'Submit evaluation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  expect(submissions).toBe(1); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
