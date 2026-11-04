import { expect, Page, test } from '@playwright/test';

const periods = [
  { id: 'p1', name: 'First Semester 2026', status: 'Active', minimumRespondents: 5, minimumCommentRespondents: 5 },
  { id: 'p2', name: 'Second Semester 2025', status: 'Closed', minimumRespondents: 5, minimumCommentRespondents: 5 },
];
const user = { id: 'u1', email: 'guidance@example.test', fullName: 'Guidance Office', roles: ['Guidance'], departmentId: null, studentId: null, instructorId: null };
const analytics = {
  periodId: 'p1', periodName: periods[0].name, minimumRespondents: 5, minimumCommentRespondents: 5,
  inventoryScore: 100, rapidAppraisalScore: 75, weightedScore: 97.5, eligibleStudents: 20, responseRate: 50,
  positive: 2, neutral: 1, negative: 7, unclassifiedComments: 1, writtenRespondents: 10,
  hasReliableSentiment: true, dominantSentiment: 'Negative', comparison: 'Contradictory', scoreSentiment: 'Positive', balancedSentiment: false,
  interpretation: 'Weighted score 97.50/100 (Positive). Written sentiment: Negative. Contradictory. Guidance review required.',
};
const detail = {
  instructorId: 'i1', instructorName: 'Alex Reyes', employeeNumber: 'F001', departmentId: 'd1', departmentName: 'Computer Studies',
  evaluationsSubmittedCount: 10, respondentCount: 10, meetsAnonymityThreshold: true,
  overallAverageRating: 5, rapidAppraisalAverageRating: 9, isFlagged: true, flagReason: analytics.interpretation,
  categoryRatings: [{ categoryId: 'cat1', categoryName: 'Teaching and Learning', averageRating: 5, ratingCount: 10 }],
  questionRatings: [{ questionId: 'q1', questionText: 'Explains concepts clearly.', averageRating: 5, ratingCount: 10 }],
  comments: [{ commentText: 'Classroom questions need more time.', isFlaggedNegative: true, originalCommentText: 'There is not enough time for questions.' }],
  rapidAppraisalComments: [], ratingDistribution: [0, 0, 0, 0, 10].map((count, i) => ({ rating: i + 1, count })),
  periodPerformance: [], savedSummary: null, analytics,
};
const row = { ...detail, averageRating: 5, hasEvaluationData: true };
const student = { id: 's1', studentNumber: '00123', firstName: 'Jamie', middleName: 'Lee', lastName: 'Santos', evaluationPeriodId: 'p1', isActive: true, isRegistered: true };
const department = { id: 'd1', code: 'CS', name: 'Computer Studies', isActive: true };
const instructor = { id: 'i1', userId: '', employeeNumber: 'F001', firstName: 'Alex', lastName: 'Reyes', departmentId: 'd1', departmentName: department.name, isActive: true };
const subject = { id: 'subject1', code: 'CS101', title: 'Computing', units: 3, isActive: true };
const section = { id: 'sec1', code: 'CS-1A', departmentId: 'd1', departmentName: department.name, isActive: true };
const offering = { id: 'c1', subjectId: subject.id, subjectCode: subject.code, subjectTitle: subject.title,
  sectionId: section.id, sectionCode: section.code, term: '2026', instructorId: 'i1', instructorName: 'Alex Reyes',
  departmentId: 'd1', departmentName: department.name, studentCount: 1, status: 'Active' };
const form = { id: 'f1', name: 'Faculty Evaluation', isActive: true, description: null, categories: [
  { id: 'cat1', name: 'Teaching', displayOrder: 1, questions: [
    { id: 'q1', text: 'Explains concepts clearly.', questionType: 'Likert1to5', displayOrder: 1, isReverseScored: false },
    { id: 'q2', text: 'Overall appraisal', questionType: 'RapidAppraisal', displayOrder: 2, isReverseScored: false },
  ] },
] };

async function setup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(user => {
    localStorage.setItem('fe.refreshToken', 'e2e-only');
    localStorage.setItem('fe.currentUser', JSON.stringify(user));
  }, user);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api', '');
    let body: unknown = [];
    if (path === '/auth/refresh') body = { user, accessToken: 'e2e-only', refreshToken: 'e2e-only', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z' };
    else if (path === '/evaluation-periods') body = periods;
    else if (path === '/departments') body = [department];
    else if (path === '/subjects') body = [subject];
    else if (path === '/sections') body = [section];
    else if (path === '/instructors') body = [instructor];
    else if (path === '/users') body = [{ ...user, isActive: true }];
    else if (path === '/classes') body = [offering];
    else if (path === '/classes/c1') body = offering;
    else if (path === '/classes/c1/students') body = [];
    else if (path.endsWith('/evaluation-status')) body = { students: [], totalStudents: 0, submittedCount: 0 };
    else if (path === '/evaluation-forms') body = [form];
    else if (path === '/evaluation-forms/f1') body = form;
    else if (path === '/guidance/faculty-performance') body = [row];
    else if (path === '/guidance/faculty-performance/i1/detail') body = detail;
    else if (path === '/guidance/student-masterlist') body = [student];
    else if (path === '/guidance/evaluation-settings') body = { minimumRespondents: 5, minimumCommentRespondents: 5 };
    else if (path.startsWith('/profile-photos/')) { await route.fulfill({ status: 404 }); return; }
    else if (path === '/guidance/analytics') body = {
      periodId: 'p1', periodName: periods[0].name, periods, submittedStudents: 10, eligibleStudents: 20,
      activeClasses: 1, pendingRequests: 0, pendingAccounts: 0, eligible: 20, completed: 10, submitted: 10,
      averageRating: 5, rapidAppraisalAverageRating: 9, weightedScore: 97.5,
      trend: [{ date: '2026-10-10T00:00:00Z', count: 4 }, { date: '2026-10-11T00:00:00Z', count: 6 }],
      departments: [{ id: 'd1', name: department.name, facultyCount: 1, submitted: 10, eligible: 20, completed: 10, averageRating: 5, rapidAppraisalAverageRating: 9, weightedScore: 97.5 }],
    };
    await route.fulfill({ json: body });
  });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('instructor PDF downloads all feedback and saved summary without an AI request', async ({ page }, info) => {
  await setup(page);
  let aiRequests = 0;
  await page.route('**/api/guidance/faculty-performance/i1/summary', async route => {
    aiRequests++;
    await route.fulfill({ status: 503, json: { detail: 'Export must use the saved summary.' } });
  });
  await page.route('**/api/guidance/faculty-performance/i1/detail*', async route => {
    await route.fulfill({ json: {
      ...detail,
      analytics: { ...analytics, neutralScoreMinimum: 50, positiveScoreMinimum: 75, respondentThresholdMode: 'Count', commentThresholdMode: 'Count' },
      savedSummary: { summary: '**Overall interpretation**\n**Saved PDF interpretation.** Results require Guidance review.', generatedAtUtc: '2026-11-04T00:00:00Z', evaluationCount: 10, respondentCount: 10 },
      rapidAppraisalComments: Array.from({ length: 55 }, (_, i) => ({ commentText: `Anonymous feedback ${i + 1}.`, ratingValue: 8, sentiment: 'Positive', isFlaggedNegative: false })),
    } });
  });
  await page.goto('/guidance/faculty/i1?period=p1');
  await page.getByRole('button', { name: 'Close summary', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF report', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toContain('Alex-Reyes');
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await download.failure()).toBeNull();
  await download.saveAs(info.outputPath('instructor-report.pdf'));
  expect(aiRequests).toBe(0);
  await noOverflow(page);
});

test('Guidance labels blindly, saves progress, and reveals versioned validation metrics', async ({ page }, info) => {
  await setup(page);
  let created = false; let completed = false; let saveCalls = 0; let saveAttempts = 0;
  const labels: Record<string, { sentiment: string | null; isExcluded: boolean }> = {};
  const texts = ['Explains every topic clearly.', 'Feedback on assignments arrives too late.', 'Classes meet on Wednesdays.', 'Uninterpretable sample.'];
  const metrics = { total: 3, classified: 2, unclassified: 1, excluded: 1, coverage: 2 / 3, accuracy: .5, macroF1: 2 / 9,
    classes: [{ sentiment: 'Positive', support: 1, predicted: 2, precision: .5, recall: 1, f1: 2 / 3 },
      { sentiment: 'Neutral', support: 0, predicted: 0, precision: null, recall: null, f1: 0 },
      { sentiment: 'Negative', support: 1, predicted: 0, precision: null, recall: 0, f1: 0 }],
    confusion: ['Positive', 'Neutral', 'Negative'].flatMap(human => ['Positive', 'Neutral', 'Negative'].map(ai => ({ human, ai, count: ai === 'Positive' && human !== 'Neutral' ? 1 : 0 }))) };
  const review = () => ({ id: 'v1', name: 'November review', periodName: periods[0].name,
    rubric: 'Positive: favorable. Neutral: factual or balanced. Negative: unfavorable.', completedAtUtc: completed ? '2026-11-03T00:00:00Z' : null,
    items: texts.map((commentText, i) => ({ id: `item${i}`, commentText, humanSentiment: labels[`item${i}`]?.sentiment ?? null,
      isExcluded: labels[`item${i}`]?.isExcluded ?? false,
      aiSentiment: completed ? ['Positive', 'Positive', null, 'Negative'][i] : null,
      method: completed ? 'OpenAI' : null, model: completed ? 'test-model-v1' : null, promptVersion: completed ? 'faculty-comment-v2' : null,
      agreement: completed ? ['Agrees', 'Disagrees', 'Unclassified', 'Excluded'][i] : null })),
    metrics: completed ? metrics : null,
    cohorts: completed ? [{ method: 'OpenAI', model: 'test-model-v1', promptVersion: 'faculty-comment-v2', metrics }] : [],
  });
  await page.route('**/api/guidance/sentiment-validation**', async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === 'POST' && path.endsWith('/sentiment-validation')) {
      expect(route.request().postDataJSON()).toEqual({ evaluationPeriodId: 'p1', name: 'November review', sampleSize: 100 }); created = true;
    } else if (path.endsWith('/labels')) {
      if (++saveAttempts === 1) { await route.fulfill({ status: 503, json: { detail: 'Temporary save failure.' } }); return; }
      saveCalls++; const body = route.request().postDataJSON() as { itemId: string; sentiment: string | null; isExcluded: boolean }[];
      for (const label of body) labels[label.itemId] = label;
      expect(body).toHaveLength(4); expect(labels['item3']).toMatchObject({ sentiment: null, isExcluded: true });
    } else if (path.endsWith('/complete')) { expect(Object.keys(labels)).toHaveLength(4); completed = true; }
    if (method === 'GET' && path.endsWith('/sentiment-validation')) {
      await route.fulfill({ json: created ? [{ id: 'v1', name: 'November review', periodName: periods[0].name,
        total: 4, labeled: Object.keys(labels).length, createdAtUtc: '2026-11-03T00:00:00Z', completedAtUtc: completed ? '2026-11-03T00:00:00Z' : null }] : [] });
    } else await route.fulfill({ json: review() });
  });
  await page.goto('/guidance/sentiment-validation');
  await expect(page.getByRole('heading', { name: 'Sentiment Validation' })).toBeVisible();
  await page.getByLabel('Batch name', { exact: true }).fill('November review');
  await page.getByRole('button', { name: 'Create batch' }).click();
  const completeButton = page.getByRole('button', { name: 'Complete & reveal results' });
  await expect(completeButton).toBeDisabled();
  await expect(page.getByText('AI: Positive', { exact: true })).toHaveCount(0);
  await expect(page.getByText('test-model-v1', { exact: true })).toHaveCount(0);
  for (const [i, label] of ['Positive', 'Negative', 'Neutral', 'Unable to label'].entries())
    await page.locator('.review-item').nth(i).getByRole('radio', { name: label, exact: true }).check();
  await expect(completeButton).toBeDisabled();
  await page.getByRole('button', { name: 'Save labels' }).click();
  await expect(page.getByRole('alert')).toContainText('Temporary save failure.');
  await expect(page.locator('.review-item').first().getByRole('radio', { name: 'Positive', exact: true })).toBeChecked();
  await expect(completeButton).toBeDisabled();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Labels saved.', { exact: true })).toBeVisible();
  await expect(completeButton).toBeEnabled();
  await noOverflow(page); await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/sentiment-review-${info.project.name}.png`, fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Continue review' }).click();
  await expect(page.locator('.review-item').first().getByRole('radio', { name: 'Positive', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Complete & reveal results' }).click();
  await expect(page.getByRole('heading', { name: 'Confusion matrix' })).toBeVisible();
  expect((await page.locator('.confusion').boundingBox())!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(page.getByText('50.0%', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('faculty-comment-v2', { exact: true })).toBeVisible();
  await expect(page.getByText('Disagrees', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0); expect(saveCalls).toBe(1);
  await noOverflow(page); await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/sentiment-results-${info.project.name}.png`, fullPage: true });
});

test('sentiment validation reports an empty-source error without creating a review', async ({ page }) => {
  await setup(page);
  await page.route('**/api/guidance/sentiment-validation**', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 409, json: { detail: 'No written feedback is available for this period.' } }) : route.fulfill({ json: [] }));
  await page.goto('/guidance/sentiment-validation'); await page.getByLabel('Batch name', { exact: true }).fill('Empty sample');
  await page.getByRole('button', { name: 'Create batch' }).click();
  await expect(page.getByRole('alert')).toContainText('No written feedback is available for this period.');
  await expect(page.getByRole('button', { name: 'Complete & reveal results' })).toHaveCount(0);
});
async function chartsRender(page: Page) {
  await expect.poll(() => page.locator('canvas').count()).toBeGreaterThan(0);
  await expect.poll(() => page.locator('canvas').evaluateAll(canvases => canvases.every(canvas => {
    const c = canvas as HTMLCanvasElement;
    return c.width > 0 && c.height > 0 && c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0);
  }))).toBe(true);
}

test('weighted analytics and sentiment stay separate, with saved on-demand summaries', async ({ page }, info) => {
  await setup(page);
  let summaryCalls = 0;
  let saved: null | { summary: string; generatedAtUtc: string; evaluationCount: number; respondentCount: number } = null;
  await page.route('**/api/guidance/faculty-performance/i1/detail*', route => route.fulfill({ json: { ...detail, savedSummary: saved } }));
  await page.route('**/api/guidance/faculty-performance/i1/summary*', async route => {
    summaryCalls++;
    expect(new URL(route.request().url()).searchParams.get('periodId')).toBe('p1');
    saved = { summary: summaryCalls === 1 ? 'Saved faculty performance analysis.' : 'Updated faculty performance analysis.', generatedAtUtc: '2026-10-11T00:00:00Z', evaluationCount: 10, respondentCount: 10 };
    await route.fulfill({ json: saved });
  });
  await page.goto('/guidance/faculty/i1?period=p1');
  await expect(page.getByRole('heading', { name: 'Alex Reyes', exact: true })).toBeVisible();
  await expect(page.getByText('97.50', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scale-Sentiment Matching' })).toBeVisible();
  await expect(page.getByText('Numerical classification: Positive', { exact: false })).toBeVisible();
  await expect(page.getByText('Negative', { exact: true }).first()).toBeVisible();
  expect(summaryCalls).toBe(0);
  await chartsRender(page); await noOverflow(page);
  await page.getByRole('button', { name: 'Show original' }).click();
  await expect(page.getByText('There is not enough time for questions.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Generate summary', exact: true }).click();
  await expect(page.getByText('Saved faculty performance analysis.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Saved faculty performance analysis.', { exact: true })).toBeVisible();
  expect(summaryCalls).toBe(1);
  await page.getByRole('button', { name: 'Regenerate summary', exact: true }).click();
  await expect(page.getByText('Updated faculty performance analysis.', { exact: true })).toBeVisible();
  expect(summaryCalls).toBe(2); await noOverflow(page); await chartsRender(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/faculty-period-${info.project.name}.png`, fullPage: true });
});

test('below-threshold period shows feedback but no scores or definitive sentiment', async ({ page }) => {
  await setup(page);
  await page.route('**/api/guidance/faculty-performance/i1/detail*', route => route.fulfill({ json: {
    ...detail, evaluationsSubmittedCount: 2, respondentCount: 2, meetsAnonymityThreshold: false,
    overallAverageRating: null, rapidAppraisalAverageRating: null, categoryRatings: [], questionRatings: [], ratingDistribution: [],
    analytics: { ...analytics, periodId: 'p2', periodName: periods[1].name, weightedScore: null, inventoryScore: null, rapidAppraisalScore: null,
      hasReliableSentiment: false, dominantSentiment: null, positive: 0, neutral: 0, negative: 0, comparison: 'Insufficient Responses' },
  } }));
  await page.goto('/guidance/faculty/i1');
  await page.getByLabel('Evaluation period', { exact: true }).selectOption('p2');
  await expect(page.getByRole('heading', { name: 'Insufficient Responses' })).toBeVisible();
  await expect(page.getByText('Classroom questions need more time.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate summary', exact: true })).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0); await noOverflow(page);
});

test('period masterlist supports manual IDs, names, edits, validation and import', async ({ page }, info) => {
  await setup(page);
  let students = [student];
  await page.route('**/api/guidance/student-masterlist**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/validate')) {
      await route.fulfill({ json: { totalRows: 3, valid: [{ ...student, studentNumber: '00456', rowNumber: 2 }],
        duplicate: [{ ...student, rowNumber: 3 }], malformed: [{ ...student, studentNumber: '', rowNumber: 4, error: 'Student ID is required.' }] } });
    } else if (path.endsWith('/import')) {
      const request = route.request().postDataJSON();
      expect(request.evaluationPeriodId).toBe('p1'); expect(request.students[0].firstName).toBe('Jamie');
      students.push({ ...student, id: 's2', studentNumber: '00456' });
      await route.fulfill({ json: { importedCount: 1, skippedCount: 0 } });
    } else if (route.request().method() !== 'GET') {
      const record = { ...student, ...route.request().postDataJSON() };
      students = [record]; await route.fulfill({ json: record });
    } else await route.fulfill({ json: students });
  });
  await page.goto('/guidance/student-masterlist');
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  await page.getByLabel('Student ID', { exact: true }).fill('00123');
  await page.getByLabel('First name', { exact: true }).fill('Jamie');
  await page.getByLabel('Middle name', { exact: true }).fill('Lee');
  await page.getByLabel('Last name', { exact: true }).fill('Santos');
  await page.getByRole('button', { name: 'Save student', exact: true }).click();
  await expect(page.getByRole('cell', { name: '00123', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit 00123', exact: true }).click();
  await expect(page.getByLabel('Student ID', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByLabel('First name', { exact: true }).fill('James');
  await page.getByRole('button', { name: 'Save student', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'James', exact: true })).toBeVisible();
  await page.getByLabel('CSV or Excel file').setInputFiles({ name: 'students.csv', mimeType: 'text/csv',
    buffer: Buffer.from('StudentNumber,FirstName,MiddleName,LastName\n00456,Jamie,,Santos') });
  await page.getByRole('button', { name: 'Validate', exact: true }).click();
  await expect(page.getByText('Student ID is required.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import 1 students', exact: true }).click();
  await expect(page.getByRole('cell', { name: '00456', exact: true })).toBeVisible();
  await noOverflow(page); await page.screenshot({ path: `test-results/masterlist-period-${info.project.name}.png`, fullPage: true });
  await page.getByLabel('Evaluation period', { exact: true }).selectOption('p2');
  await expect(page.getByRole('button', { name: 'Add student', exact: true })).toBeDisabled();
  await expect(page.getByLabel('CSV or Excel file')).toHaveCount(0);
});

test('Guidance can configure independent respondent thresholds', async ({ page }) => {
  await setup(page);
  let updated = false;
  await page.route('**/api/guidance/evaluation-settings', async route => {
    if (route.request().method() === 'PUT') {
      expect(route.request().postDataJSON()).toEqual({ minimumRespondents: 7, minimumCommentRespondents: 4 }); updated = true;
    }
    await route.fulfill({ json: { minimumRespondents: 5, minimumCommentRespondents: 5 } });
  });
  await page.goto('/guidance/settings');
  await page.getByLabel('Minimum respondents', { exact: true }).fill('7');
  await page.getByLabel('Minimum written-feedback contributors', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByText('Saved for future evaluation periods.', { exact: true })).toBeVisible();
  expect(updated).toBe(true); await noOverflow(page);
});

test('reverse scoring is editable in question management', async ({ page }) => {
  await setup(page);
  let edited = structuredClone(form);
  await page.route('**/api/evaluation-forms/f1', route => route.fulfill({ json: edited }));
  await page.route('**/api/evaluation-forms/f1/categories/cat1/questions/q1', async route => {
    expect(route.request().postDataJSON().isReverseScored).toBe(true);
    edited.categories[0].questions[0].isReverseScored = true;
    await route.fulfill({ json: edited.categories[0].questions[0] });
  });
  await page.goto('/guidance/evaluations/forms/f1');
  await page.getByRole('row').filter({ hasText: 'Explains concepts clearly.' }).getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Reverse scoring', { exact: true }).check();
  await page.getByRole('button', { name: 'Save question', exact: true }).click();
  await expect(page.getByText('Reverse scored', { exact: true })).toBeVisible(); await noOverflow(page);
});

test('faculty profiles do not need a linked instructor account', async ({ page }) => {
  await setup(page);
  await page.route('**/api/instructors', async route => {
    if (route.request().method() === 'POST') expect(route.request().postDataJSON().userId).toBe('00000000-0000-0000-0000-000000000000');
    await route.fulfill({ json: route.request().method() === 'POST' ? instructor : [instructor] });
  });
  await page.goto('/guidance/academics?tab=instructors');
  await page.getByRole('button', { name: 'New instructor', exact: true }).click();
  await expect(page.getByLabel('User account')).toHaveCount(0);
  await page.getByLabel('Employee number', { exact: true }).fill('F002');
  await page.getByLabel('First name', { exact: true }).fill('Taylor');
  await page.getByLabel('Last name', { exact: true }).fill('Cruz');
  await page.getByLabel('Department', { exact: true }).selectOption('d1');
  await page.getByRole('button', { name: 'Create instructor', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await noOverflow(page);
});

test('overview charts render with weighted scores and selected period links', async ({ page }, info) => {
  await setup(page); await page.goto('/guidance/dashboard');
  await expect(page.getByRole('heading', { name: 'Department Weighted Scores', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '97.50', exact: true })).toBeVisible();
  await chartsRender(page); await noOverflow(page);
  await page.screenshot({ path: `test-results/weighted-overview-${info.project.name}.png`, fullPage: true });
});

for (const [tab, kind, id] of [
  ['departments', 'department', 'd1'], ['subjects', 'subject', 'subject1'],
  ['sections', 'section', 'sec1'], ['instructors', 'instructor', 'i1'],
]) {
  test(`Academic Structure deletes ${kind} and explains linked-record conflicts`, async ({ page }) => {
    await setup(page);
    let blocked = true;
    let deletes = 0;
    await page.route(`**/api/${tab}/${id}`, async route => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      deletes++;
      if (blocked) return route.fulfill({ status: 409, json: { detail: 'This record is linked to classes. Mark it inactive through Edit.' } });
      return route.fulfill({ status: 204 });
    });
    await page.goto(`/guidance/academics?tab=${tab}`);
    const row = page.locator('tbody tr').first();
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(deletes).toBe(0);
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: `Delete ${kind}`, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('linked to classes');
    await expect(row).toBeVisible();
    blocked = false;
    await page.getByRole('button', { name: `Delete ${kind}`, exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(0);
    expect(deletes).toBe(2);
  });
}

test('Guidance accounts do not offer retired roles or student passwords', async ({ page }) => {
  await setup(page); await page.goto('/guidance/users');
  await page.getByRole('button', { name: 'Add Guidance account', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByLabel('Student ID')).toHaveCount(0);
  await noOverflow(page);
});
