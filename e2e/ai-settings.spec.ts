import { expect, test } from '@playwright/test';

test('Guidance connects without persisting credentials, configures budgets, and reviews usage', async ({ page }, info) => {
  const user = { id: 'u1', email: 'guidance@example.test', fullName: 'Guidance Office', roles: ['Guidance'], departmentId: null, studentId: null, instructorId: null };
  let connected = false; let tests = 0; let budget: number | null = null;
  const settings = () => ({ connectionStatus: connected ? 'Connected' : 'Disconnected', hasKey: connected, selectedModel: 'gpt-4o-mini', monthlyBudget: budget, hardLimitEnabled: budget !== null, accessDisabled: false, phpPerUsd: 60 });
  const usage = () => ({ inputTokens: tests * 20, outputTokens: tests * 10, totalTokens: tests * 30, estimatedSpending: tests * .000009, monthlySpending: tests * .000009, reservedSpending: 0, monthlyBudget: budget, budgetPercent: budget ? .001 : null, remainingConfiguredBudget: budget, warning: null, sentimentRequests: 0, unknownCostRequests: 0, daily: [], monthly: [], models: [], history: [], users: connected ? [{ userId: 'u1', fullName: user.fullName, connectionStatus: 'Connected', accessDisabled: false, selectedModel: 'gpt-4o-mini' }] : [], userSpending: [] });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(user => { localStorage.setItem('fe.refreshToken', 'test-only'); localStorage.setItem('fe.currentUser', JSON.stringify(user)); }, user);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { user, accessToken: 'test-only', refreshToken: 'test-only', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z' } });
    if (path.endsWith('/connect')) { expect(route.request().postDataJSON().apiKey).toBe('sk-browser-test'); connected = true; return route.fulfill({ json: settings() }); }
    if (path.endsWith('/test')) { tests++; return route.fulfill({ status: 204 }); }
    if (path.endsWith('/budget')) { budget = route.request().postDataJSON().monthlyBudget; expect(budget).toBe(10); return route.fulfill({ json: settings() }); }
    if (path.endsWith('/models')) return route.fulfill({ json: [{ id: 'gpt-4o-mini', description: 'Small general-purpose model.', inputPerMillion: .15, outputPerMillion: .6 }] });
    if (path.endsWith('/usage')) return route.fulfill({ json: usage() });
    if (path.endsWith('/policy')) return route.fulfill({ json: { studentConnectionUserId: null, monthlyBudget: null, hardLimitEnabled: false, aiDisabled: false } });
    if (path.endsWith('/ai-settings')) return route.fulfill({ json: settings() });
    return route.fulfill({ json: [] });
  });
  await page.goto('/guidance/ai-settings');
  await expect(page.getByRole('heading', { name: 'AI Settings', exact: true })).toBeVisible();
  await page.getByLabel('API key', { exact: true }).fill('sk-browser-test');
  await page.getByRole('button', { name: 'Connect OpenAI', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Update connection' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Test connection', exact: true })).toBeEnabled();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('sk-browser-test');
  await page.getByRole('button', { name: 'Test connection', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Test completed');
  await page.getByLabel('Monthly budget (PHP)', { exact: true }).fill('600');
  await page.getByLabel('Enforce hard spending limit', { exact: true }).check();
  await page.getByRole('button', { name: 'Save budget', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Monthly budget saved');
  await expect(page.getByText('This is not your OpenAI account credit balance.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Monthly budget (PHP)', { exact: true })).toHaveValue('600');
  await expect(page.getByText('₱600.00', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Institutional controls', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Connected accounts & consumption', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Guidance Accounts', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/ai-settings-${info.project.name}.png`, fullPage: true });
});
