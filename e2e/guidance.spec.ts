import { expect, Page, test } from '@playwright/test';

const departments = [
  { id: 'd1', name: 'Computer Studies', isActive: true },
  { id: 'd2', name: 'Business Administration', isActive: true },
];
const subjects = [{ id: 's1', code: 'CS101', title: 'Introduction to Computing', units: 3, isActive: true }];
const sections = departments.map((d, index) => ({ id: `sec${index}`, code: `BS-${index + 1}A`, departmentId: d.id, departmentName: d.name, isActive: true }));
const instructors = departments.map((d, index) => ({ id: `i${index}`, firstName: ['Alex', 'Taylor'][index], lastName: 'Reyes', employeeNumber: `F00${index}`, departmentId: d.id, departmentName: d.name, isActive: true }));
const offering = { id: 'c1', subjectId: 's1', subjectCode: 'CS101', subjectTitle: 'Introduction to Computing', sectionId: 'sec0', sectionCode: 'BS-1A', term: 'AY 2026-2027', instructorId: 'i0', instructorName: 'Alex Reyes', status: 'Active', studentCount: 20, departmentId: 'd1', departmentName: departments[0].name };
const form = { id: 'f1', name: 'Faculty Evaluation', description: '', isActive: true, categoryCount: 1, questionCount: 1, categories: [] };

async function setup(page: Page, role = 'Guidance') {
  const user = { id: 'u1', email: 'guidance@example.test', fullName: 'Jordan Santos', roles: [role], departmentId: null, studentId: null, instructorId: null };
  await page.addInitScript(user => {
    localStorage.setItem('fe.refreshToken', 'e2e-only');
    localStorage.setItem('fe.currentUser', JSON.stringify(user));
  }, user);
  await page.route('https://localhost:7076/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api', '');
    let body: unknown = [];
    if (path === '/auth/refresh') body = { user, accessToken: 'e2e-only', refreshToken: 'e2e-only', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z' };
    else if (path === '/guidance/analytics') {
      const filtered = url.searchParams.get('department') ?? url.searchParams.get('departmentId');
      const rows = departments.filter(d => !filtered || d.id === filtered).map((d, i) => ({ id: d.id, name: d.name, facultyCount: 12 + i, submitted: 120 + i * 30, eligible: 160 + i * 40, completed: 120 + i * 30, averageRating: 4.3 - i * 0.2, rapidAppraisalAverageRating: 8.5 - i * 0.3 }));
      body = { periodId: url.searchParams.get('periodId') || 'p1', periodName: 'First Semester 2026', periods: [{ id: 'p1', name: 'First Semester 2026', status: 'Active' }, { id: 'p2', name: 'Second Semester 2025', status: 'Closed' }], submittedStudents: filtered ? 50 : 90, eligibleStudents: 120, activeClasses: 32, pendingRequests: 3, pendingAccounts: 7, eligible: rows.reduce((n, d) => n + d.eligible, 0), completed: rows.reduce((n, d) => n + d.completed, 0), submitted: rows.reduce((n, d) => n + d.submitted, 0), averageRating: 4.2, rapidAppraisalAverageRating: 8.4, trend: Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`, count: [4, 12, 18, 7, 20, 16, 24, 10, 29, 32, 19, 28, 41, 25][i] })), departments: rows };
    } else if (path === '/guidance/faculty-performance') body = [{ instructorId: 'i0', instructorName: 'Alex Reyes', employeeNumber: 'F001', departmentId: 'd1', departmentName: 'Computer Studies', evaluationsSubmittedCount: 20, averageRating: 2.9, rapidAppraisalAverageRating: 7.2, hasEvaluationData: true, meetsAnonymityThreshold: true, isFlagged: true }];
    else if (path === '/departments') body = departments;
    else if (path === '/subjects') body = subjects;
    else if (path === '/sections') body = sections;
    else if (path === '/instructors') body = instructors;
    else if (path === '/classes' && route.request().method() === 'POST') body = { ...offering, id: 'c2', ...route.request().postDataJSON() };
    else if (path === '/classes') body = [offering];
    else if (path === '/classes/c1') body = offering;
    else if (path.endsWith('/evaluation-status')) body = { classOfferingId: 'c1', evaluationPeriodId: 'p1', evaluationPeriodName: 'First Semester', totalStudents: 0, submittedCount: 0, students: [] };
    else if (path === '/evaluation-forms') body = [form];
    else if (path === '/evaluation-forms/f1') body = form;
    else if (path === '/users') body = [{ ...user, isActive: true, hasPhoto: false }];
    else if (path === '/class-requests' && route.request().method() === 'POST') body = { request: { id: 'r1', ...route.request().postDataJSON(), subjectCode: 'CS101', sectionCode: 'BS-1A', status: 'Pending', proposedStudentCount: 0 }, skippedStudentNumbers: [] };
    await route.fulfill({ json: body });
  });
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

const photoBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5f8AAAAASUVORK5CYII=', 'base64');
const roster = Array.from({ length: 8 }, (_, i) => ({
  id: 'm' + i, studentId: 'student' + i, studentNumber: '2026-00' + i,
  studentName: ['Jamie Santos', 'Casey Dela Cruz', 'Morgan Reyes', 'Sam Rivera', 'Riley Garcia', 'Avery Cruz', 'Charlie Lopez', 'Jordan Tan'][i],
  status: 'Approved', source: 'ManualAdd', removedAtUtc: null, removalReason: null,
}));
const facultyDetail = {
  savedSummary: null,
  instructorId: 'i0', instructorName: 'Alex Reyes', employeeNumber: 'F001', departmentId: 'd1', departmentName: 'Computer Studies',
  evaluationsSubmittedCount: 24, respondentCount: 18, meetsAnonymityThreshold: true, overallAverageRating: 4.15,
  rapidAppraisalAverageRating: 8.6, isFlagged: false, flagReason: null,
  categoryRatings: [
    { categoryId: 'cat1', categoryName: 'Instruction and Learning', averageRating: 4.3, ratingCount: 24 },
    { categoryId: 'cat2', categoryName: 'Classroom Management', averageRating: 4.0, ratingCount: 24 },
    { categoryId: 'cat3', categoryName: 'Student Engagement', averageRating: 4.15, ratingCount: 24 },
  ],
  questionRatings: [
    { questionId: 'q1', questionText: 'Explains concepts clearly and uses relevant examples.', averageRating: 4.3, ratingCount: 24 },
    { questionId: 'q2', questionText: 'Encourages active participation in class discussions.', averageRating: 3.9, ratingCount: 24 },
    { questionId: 'q3', questionText: 'Provides timely and constructive feedback.', averageRating: 4.25, ratingCount: 24 },
  ],
  ratingDistribution: [2, 3, 8, 28, 31].map((count, i) => ({ rating: i + 1, count })),
  periodPerformance: [
    { periodId: 'p0', periodName: 'First Semester 2025', submittedCount: 3, respondentCount: 3, scoresProtected: true, averageRating: null, rapidAppraisalAverageRating: null },
    { periodId: 'p1', periodName: 'Second Semester 2025', submittedCount: 9, respondentCount: 9, scoresProtected: true, averageRating: null, rapidAppraisalAverageRating: null },
    { periodId: 'p2', periodName: 'First Semester 2026', submittedCount: 12, respondentCount: 12, scoresProtected: false, averageRating: 4.3, rapidAppraisalAverageRating: 8.8 },
  ],
  comments: [{ commentText: 'More time for classroom questions would be helpful.', isFlaggedNegative: true, originalCommentText: 'There is not enough time for questions.' }],
  rapidAppraisalComments: [],
};

async function detailSetup(page: Page) {
  await setup(page);
  await page.route('**/api/profile-photos/**', async route => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 204 });
    else await route.fulfill({ contentType: 'image/png', body: photoBytes });
  });
  await page.route('**/api/guidance/faculty-performance/i0/detail', route => route.fulfill({ json: facultyDetail }));
}

async function chartPixels(page: Page) {
  await expect.poll(() => page.locator('canvas').evaluateAll(canvases => canvases.every(canvas => {
    const c = canvas as HTMLCanvasElement;
    return c.width > 0 && c.height > 0 && c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0);
  }))).toBe(true);
}

test('CSV masterlists and removals keep the submission overview current', async ({ page }) => {
  await detailSetup(page);
  let members = [...roster];
  await page.route('**/api/classes/c1/students', route => route.fulfill({ json: members }));
  await page.route('**/api/classes/c1/evaluation-status', route => route.fulfill({ json: {
    classOfferingId: 'c1', evaluationPeriodId: 'p1', evaluationPeriodName: 'First Semester',
    totalStudents: members.length, submittedCount: 4,
    students: members.map((s, i) => ({ ...s, submitted: i < 4, submittedAtUtc: null })),
  } }));
  await page.route('**/api/classes/c1/masterlist/validate', route => route.fulfill({ json: {
    totalRows: 2, valid: [{ rowNumber: 2, studentNumber: '2026-NEW', outcome: 'Valid' }],
    duplicate: [{ rowNumber: 3, studentNumber: '2026-000', outcome: 'Duplicate' }],
    notFound: [], ambiguous: [], malformed: [],
  } }));
  await page.route('**/api/classes/c1/masterlist/import', route => {
    expect(route.request().postDataJSON()).toEqual({ studentNumbers: ['2026-NEW'] });
    members.push({ ...roster[0], id: 'new', studentId: 'new', studentName: 'New Student', studentNumber: '2026-NEW' });
    return route.fulfill({ json: { importedCount: 1, skippedCount: 0 } });
  });
  await page.route('**/api/classes/c1/students/new', route => {
    expect(route.request().method()).toBe('DELETE');
    members = members.filter(s => s.studentId !== 'new');
    return route.fulfill({ status: 204 });
  });
  await page.goto('/guidance/rosters');
  await page.getByRole('link', { name: 'Upload master list', exact: true }).click();
  await expect(page).toHaveURL(/guidance\/rosters\/c1\?upload=true/);
  const dialog = page.getByRole('dialog', { name: 'Import class masterlist' });
  await dialog.getByLabel(/CSV file/).setInputFiles({ name: 'students.csv', mimeType: 'text/csv', buffer: Buffer.from('StudentNumber\n2026-NEW\n2026-000') });
  await dialog.getByRole('button', { name: 'Validate', exact: true }).click();
  await expect(dialog.getByText('2026-000', { exact: true })).toBeVisible();
  await noOverflow(page);
  await dialog.getByRole('button', { name: 'Import 1 valid record(s)', exact: true }).click();
  await expect(dialog.getByText('Imported 1 student(s). Skipped 0.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('.class-metrics strong')).toHaveText(['9', '4', '5', '44%']);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove New Student', exact: true }).click();
  await expect(page.locator('.class-metrics strong')).toHaveText(['8', '4', '4', '50%']);
  await noOverflow(page);
});


test('class overview filters students, uploads photos and refreshes counts after roster changes', async ({ page }, info) => {
  await detailSetup(page);
  let members = [...roster];
  let statusCalls = 0;
  await page.route('**/api/classes/c1/students', async route => {
    if (route.request().method() === 'POST') {
      members = [...members, { ...roster[0], id: 'new', studentId: 'new', studentName: 'New Student', studentNumber: '2026-NEW' }];
      await route.fulfill({ json: members.at(-1) });
    } else await route.fulfill({ json: members });
  });
  await page.route('**/api/classes/c1/evaluation-status', async route => {
    statusCalls++;
    await route.fulfill({ json: { classOfferingId: 'c1', evaluationPeriodId: 'p1', evaluationPeriodName: 'First Semester 2026', totalStudents: members.length, submittedCount: 4,
      students: members.map((s, i) => ({ ...s, submitted: i < 4, submittedAtUtc: i < 4 ? '2026-10-08T02:00:00Z' : null })) } });
  });
  await page.goto('/guidance/rosters/c1');
  await expect(page.getByRole('heading', { name: 'Evaluation Overview' })).toBeVisible();
  await expect(page.locator('.class-metrics strong')).toHaveText(['8', '4', '4', '50%']);
  await expect(page.getByRole('img', { name: 'Alex Reyes photo' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Jamie Santos photo' })).toBeVisible();
  await expect(page.locator('.roster-table tbody tr')).toHaveCount(8);
  await page.getByRole('button', { name: 'Awaiting', exact: true }).click();
  await expect(page.locator('.roster-table tbody tr')).toHaveCount(4);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search students' }).fill('Jamie');
  await expect(page.locator('.roster-table tbody tr')).toHaveCount(1);
  const upload = page.waitForRequest(r => r.url().endsWith('/profile-photos/students/student0') && r.method() === 'POST');
  await page.getByLabel('Photo file for Jamie Santos', { exact: true }).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: photoBytes });
  await upload;
  await page.getByRole('searchbox', { name: 'Search students' }).fill('');
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/class-detail-' + info.project.name + '.png', fullPage: true });
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add student' });
  await dialog.getByLabel('Student number').fill('2026-NEW');
  await noOverflow(page);
  await dialog.getByRole('button', { name: 'Add student', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.class-metrics strong')).toHaveText(['9', '4', '5', '44%']);
  expect(statusCalls).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await noOverflow(page);
});

test('class overview handles missing periods and photo validation', async ({ page }) => {
  await detailSetup(page);
  await page.route('**/api/classes/c1/students', route => route.fulfill({ json: roster }));
  await page.route('**/api/classes/c1/evaluation-status', route => route.fulfill({ status: 409, json: { detail: 'There is no active evaluation period.' } }));
  await page.goto('/guidance/rosters/c1');
  await expect(page.getByText('There is no active evaluation period.', { exact: true })).toBeVisible();
  await expect(page.locator('.class-metrics strong')).toHaveText(['8', '--', '--', '--']);
  await page.getByLabel('Photo file for Jamie Santos', { exact: true }).setInputFiles({ name: 'script.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg />') });
  await expect(page.getByRole('alert')).toContainText('Choose a JPEG or PNG');
  await noOverflow(page);
});

test('faculty detail renders analytics, sorting, photos and anonymous feedback', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await detailSetup(page);
  let summaries = 0;
  await page.route('**/api/guidance/faculty-performance/i0/summary', route => {
    summaries++; return route.fulfill({ json: { summary: 'Teaching ratings improved in the latest period.', generatedAtUtc: '2026-10-09T00:00:00Z', evaluationCount: 24, respondentCount: 18 } });
  });
  await page.goto('/guidance/faculty/i0');
  await expect(page.getByRole('heading', { name: 'Alex Reyes', exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(3);
  await chartPixels(page);
  await expect(page.getByText('Protected', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('img', { name: 'Alex Reyes photo' })).toBeVisible();
  expect(summaries).toBe(0);
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/faculty-detail-' + info.project.name + '.png', fullPage: true });
  await page.getByLabel('Sort by', { exact: true }).selectOption('lowest');
  await expect(page.locator('.question-table tbody tr').first()).toContainText('Encourages active participation');
  await page.getByRole('button', { name: 'Show original', exact: true }).click();
  await expect(page.getByText('There is not enough time for questions.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Generate summary', exact: true }).click();
  await expect(page.getByText('Teaching ratings improved in the latest period.', { exact: true })).toBeVisible();
  expect(summaries).toBe(1);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('faculty detail shows small-group comments while protecting scores and handles a missing photo', async ({ page }, info) => {
  await detailSetup(page);
  await page.route('**/api/guidance/faculty-performance', route => route.fulfill({ json: [{
    instructorId: 'i0', instructorName: 'Alex Reyes', employeeNumber: 'F001', departmentId: 'd1', departmentName: 'Computer Studies',
    evaluationsSubmittedCount: 2, hasEvaluationData: true, meetsAnonymityThreshold: false, averageRating: null, rapidAppraisalAverageRating: null, isFlagged: false,
  }] }));
  await page.route('**/api/profile-photos/**', route => route.fulfill({ status: 404 }));
  await page.route('**/api/guidance/faculty-performance/i0/detail', route => route.fulfill({ json: {
    ...facultyDetail, respondentCount: 2, meetsAnonymityThreshold: false, overallAverageRating: null,
    rapidAppraisalAverageRating: null, categoryRatings: [], questionRatings: [], ratingDistribution: [], periodPerformance: [],
    comments: facultyDetail.comments, rapidAppraisalComments: [{ commentText: 'Clear explanations.', isFlaggedNegative: false, originalCommentText: null }],
  } }));
  await page.goto('/guidance/faculty');
  await page.getByRole('link', { name: 'View feedback', exact: false }).click();
  await expect(page).toHaveURL(/guidance\/faculty\/i0$/);
  await expect(page.getByRole('heading', { name: 'Scores protected' })).toBeVisible();
  await expect(page.getByText('More time for classroom questions would be helpful.', { exact: true })).toBeVisible();
  await expect(page.getByText('Clear explanations.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show original', exact: true }).click();
  await expect(page.getByText('There is not enough time for questions.', { exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Generate summary', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Alex Reyes photo' })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/guidance-small-group-feedback-' + info.project.name + '.png', fullPage: true });
});

test('faculty detail feedback filters handle empty groups, flagged originals and long comments', async ({ page }, info) => {
  await detailSetup(page);
  await page.route('**/api/profile-photos/**', route => route.fulfill({ status: 404 }));
  const detail = {
    ...facultyDetail, evaluationsSubmittedCount: 3, respondentCount: 2, meetsAnonymityThreshold: false,
    overallAverageRating: null, rapidAppraisalAverageRating: null,
    comments: [], rapidAppraisalComments: [
      { commentText: 'The classroom examples were clear and relevant.', isFlaggedNegative: false, originalCommentText: null },
      { commentText: 'More time for questions would improve the lessons.', isFlaggedNegative: true, originalCommentText: 'There is never enough time to ask questions.' },
      { commentText: 'The pace of the discussion could be more consistent.', isFlaggedNegative: true, originalCommentText: 'Lessons move too quickly for me to keep up.' },
    ],
  };
  await page.route('**/api/guidance/faculty-performance/i0/detail', route => route.fulfill({ json: detail }));
  await page.goto('/guidance/faculty/i0');
  const filters = page.getByRole('group', { name: 'Feedback type' });
  await expect(filters.getByRole('button', { name: 'All feedback 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Written Feedback', exact: false })).toHaveCount(0);
  await expect(page.locator('.feedback-item')).toHaveCount(3);
  await expect(page.getByRole('progressbar', { name: 'Student respondents required to display scores' })).toHaveAttribute('value', '2');
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/guidance-feedback-redesign-' + info.project.name + '.png', fullPage: true });

  await filters.getByRole('button', { name: 'Written 0', exact: true }).click();
  await expect(page.getByText('No written comments submitted.', { exact: true })).toBeVisible();
  await expect(page.locator('.feedback-item')).toHaveCount(0);
  await filters.getByRole('button', { name: 'Rapid appraisal 3', exact: true }).focus();
  await page.keyboard.press('Enter');
  const original = page.getByRole('button', { name: 'Show original', exact: true }).first();
  await expect(original).toHaveAttribute('aria-expanded', 'false');
  await original.click();
  await expect(page.getByText('There is never enough time to ask questions.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hide original', exact: true }).click();
  await expect(page.locator('.original-feedback')).toHaveCount(0);
  await original.click();
  await filters.getByRole('button', { name: 'All feedback 3', exact: true }).click();
  await expect(page.locator('.original-feedback')).toHaveCount(0);
  await noOverflow(page);

  detail.rapidAppraisalComments[0].commentText = 'LongStudentFeedback'.repeat(24) + '\nSecond paragraph.';
  await page.reload();
  await expect(page.locator('.feedback-item').first()).toContainText('Second paragraph.');
  await noOverflow(page);
  detail.rapidAppraisalComments = [];
  await page.reload();
  await expect(page.getByText('No feedback submitted.', { exact: true })).toBeVisible();
  await filters.getByRole('button', { name: 'Rapid appraisal 0', exact: true }).click();
  await expect(page.getByText('No rapid appraisal comments submitted.', { exact: true })).toBeVisible();
  await noOverflow(page);
});

test('faculty summary is generated only on click, restored on reload, and replaced only after success', async ({ page }, info) => {
  await detailSetup(page);
  let saved: { summary: string; generatedAtUtc: string; evaluationCount: number; respondentCount: number } | null = null;
  let generations = 0;
  let evaluationCount = 24;
  let releaseGeneration: (() => void) | undefined;
  const initialSummary = 'Students report clear explanations and helpful classroom examples. Teaching ratings are generally favorable, with student engagement offering the most room for improvement.\n\nContinue using relevant examples and reserve more time for student questions.';
  const updatedSummary = 'The latest evaluation results show favorable teaching ratings. More time for classroom discussion remains a useful area of focus.';
  await page.route('**/api/guidance/faculty-performance/i0/detail', route => route.fulfill({ json: {
    ...facultyDetail, evaluationsSubmittedCount: evaluationCount, savedSummary: saved,
  } }));
  await page.route('**/api/guidance/faculty-performance/i0/summary', async route => {
    generations++;
    expect(route.request().method()).toBe('POST');
    if (generations === 1) await new Promise<void>(resolve => releaseGeneration = resolve);
    if (generations === 2) {
      await route.fulfill({ status: 503, json: { detail: 'AI is temporarily unavailable. Your saved summary has not changed.' } });
      return;
    }
    saved = { summary: generations === 1 ? initialSummary : updatedSummary,
      generatedAtUtc: generations === 1 ? '2026-10-09T00:00:00Z' : '2026-10-09T01:00:00Z', evaluationCount, respondentCount: 18 };
    await route.fulfill({ json: saved });
  });

  await page.goto('/guidance/faculty/i0');
  const summary = page.locator('.summary-section');
  await expect(summary.getByText('No performance summary saved.', { exact: true })).toBeVisible();
  expect(generations).toBe(0);
  await summary.getByRole('button', { name: 'Generate summary', exact: true }).click();
  await expect.poll(() => generations).toBe(1);
  await expect(summary.getByRole('button', { name: 'Generating...', exact: true })).toBeDisabled();
  await expect(summary).toHaveAttribute('aria-busy', 'true');
  await expect(summary.getByRole('status')).toContainText('Analyzing student evaluations');
  releaseGeneration!();
  await expect(summary.locator('.summary-text')).toHaveText(initialSummary);
  await expect(summary.locator('.summary-meta')).toContainText('24 evaluations');
  await expect(summary.getByRole('button', { name: 'Regenerate summary', exact: true })).toBeEnabled();

  await page.reload();
  await expect(summary.locator('.summary-text')).toHaveText(initialSummary);
  expect(generations).toBe(1);
  evaluationCount = 25;
  await page.reload();
  await expect(summary.getByText('Evaluation data has changed', { exact: true })).toBeVisible();
  await expect(summary.locator('.summary-text')).toHaveText(initialSummary);
  expect(generations).toBe(1);
  await summary.getByRole('button', { name: 'Regenerate summary', exact: true }).click();
  await expect(summary.getByRole('alert')).toContainText('Your saved summary has not changed');
  await expect(summary.locator('.summary-text')).toHaveText(initialSummary);
  await expect(summary.getByRole('button', { name: 'Regenerate summary', exact: true })).toBeEnabled();
  await noOverflow(page);
  await summary.screenshot({ path: 'test-results/guidance-summary-preserved-' + info.project.name + '.png' });

  await summary.getByRole('button', { name: 'Regenerate summary', exact: true }).click();
  await expect(summary.locator('.summary-text')).toHaveText(updatedSummary);
  await expect(summary.getByRole('alert')).toHaveCount(0);
  await expect(summary.getByText('Evaluation data has changed', { exact: true })).toHaveCount(0);
  await expect(summary.locator('.summary-meta')).toContainText('25 evaluations');
  await page.reload();
  await expect(summary.locator('.summary-text')).toHaveText(updatedSummary);
  expect(generations).toBe(3);
  await noOverflow(page);
  await summary.screenshot({ path: 'test-results/guidance-saved-summary-' + info.project.name + '.png' });
});


test('dashboard renders charts, filters, export and responsive navigation', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  await page.goto('/guidance/dashboard');
  await expect(page.getByRole('heading', { name: 'System Overview' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(4);
  await expect(page.locator('.metric-value').first()).toHaveText('90');
  await expect.poll(() => page.locator('canvas').evaluateAll(canvases => canvases.every(canvas => {
    const pixels = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, (canvas as HTMLCanvasElement).width, (canvas as HTMLCanvasElement).height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  }))).toBe(true);
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `test-results/guidance-${info.project.name}.png`, fullPage: true });
  await page.getByLabel('Department', { exact: true }).selectOption('d1');
  await expect(page).toHaveURL(/department=d1/);
  await expect(page.locator('.metric-value').first()).toHaveText('50');
  await page.getByLabel('Evaluation period', { exact: true }).selectOption('p2');
  await expect(page).toHaveURL(/period=p2/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('guidance-analytics.csv');
  if ((page.viewportSize()?.width ?? 0) <= 1024) await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Users & Access' })).toBeVisible();
  await page.getByRole('link', { name: 'Users & Access' }).click();
  await expect(page).toHaveURL(/guidance\/users/);
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('Guidance selects rosters across departments without class request controls', async ({ page }, info) => {
  await setup(page);
  const other = { ...offering, id: 'c2', departmentId: 'd2', departmentName: departments[1].name, sectionCode: 'BS-2A', instructorName: 'Taylor Reyes' };
  await page.route('**/api/classes', route => route.fulfill({ json: [offering, other] }));
  await page.goto('/guidance/classes?tab=requests');
  await expect(page).toHaveURL(/guidance\/rosters/);
  await expect(page.getByRole('heading', { name: 'Subjects & Rosters', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Upload master list', exact: true })).toHaveCount(2);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /New offering|Submit request/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Classes & Requests', exact: true })).toHaveCount(0);
  await page.getByLabel('Department', { exact: true }).selectOption('d2');
  await expect(page.getByRole('link', { name: 'Open roster', exact: true })).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Taylor Reyes');
  await page.getByLabel('Department', { exact: true }).selectOption('');
  await page.getByRole('searchbox', { name: 'Search subjects' }).fill('Alex');
  await expect(page.getByRole('link', { name: 'Open roster', exact: true })).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search subjects' }).fill('');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV template', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('class-masterlist-template.csv');
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/guidance-rosters-' + info.project.name + '.png', fullPage: true });
  await page.getByRole('link', { name: 'Open roster', exact: true }).first().click();
  await expect(page).toHaveURL(/guidance\/rosters\/c1/);
  await page.getByRole('link', { name: 'Back to subjects & rosters', exact: true }).click();
  await expect(page).toHaveURL(/guidance\/rosters$/);
  await noOverflow(page);
});

test('Guidance assigns a subject instructor then uploads that subjects enrolled students', async ({ page }, info) => {
  await setup(page);
  const assigned = { ...offering, id: 'new-assignment', studentCount: 0 };
  let members: typeof roster = [];
  let creates = 0;
  let classRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/class-requests')) classRequests++; });
  await page.route('**/api/classes', async route => {
    if (route.request().method() === 'POST') {
      creates++;
      expect(route.request().postDataJSON()).toEqual({ subjectId: 's1', sectionId: 'sec0', instructorId: 'i0', term: 'AY 2026-2027' });
      await route.fulfill({ json: assigned });
    } else await route.fulfill({ json: [] });
  });
  await page.route('**/api/classes/new-assignment', route => route.fulfill({ json: { ...assigned, studentCount: members.length } }));
  await page.route('**/api/classes/new-assignment/students', route => route.fulfill({ json: members }));
  await page.route('**/api/classes/new-assignment/masterlist/validate', route => route.fulfill({ json: {
    totalRows: 1, valid: [{ rowNumber: 2, studentNumber: '2026-000', outcome: 'Valid' }], duplicate: [], notFound: [], ambiguous: [], malformed: [],
  } }));
  await page.route('**/api/classes/new-assignment/masterlist/import', route => {
    expect(route.request().postDataJSON()).toEqual({ studentNumbers: ['2026-000'] });
    members = [{ ...roster[0], source: 'GuidanceImport' }];
    return route.fulfill({ json: { importedCount: 1, skippedCount: 0 } });
  });
  await page.goto('/guidance/rosters');
  await expect(page.getByText('No subject assignments yet.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Assign subject', exact: true }).click();
  const assignment = page.getByRole('dialog', { name: 'Assign instructor to subject', exact: true });
  await assignment.getByLabel('Section', { exact: true }).selectOption('sec1');
  await expect(assignment.locator('#assignment-instructor option')).toHaveCount(2);
  await expect(assignment.locator('#assignment-instructor')).toContainText('Taylor Reyes');
  await expect(assignment.locator('#assignment-instructor')).not.toContainText('Alex Reyes');
  await assignment.getByLabel('Instructor', { exact: true }).selectOption('i1');
  await assignment.getByLabel('Section', { exact: true }).selectOption('sec0');
  await expect(assignment.getByLabel('Instructor', { exact: true })).toHaveValue('');
  await assignment.getByLabel('Subject', { exact: true }).selectOption('s1');
  await assignment.getByLabel('Term', { exact: true }).fill('AY 2026-2027');
  await assignment.getByRole('button', { name: 'Save & upload master list', exact: true }).click();
  await expect(assignment.getByText('Select an instructor.', { exact: true })).toBeVisible();
  expect(creates).toBe(0);
  await assignment.getByLabel('Instructor', { exact: true }).selectOption('i0');
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/guidance-subject-assignment-' + info.project.name + '.png', fullPage: true });
  await assignment.getByRole('button', { name: 'Save & upload master list', exact: true }).click();
  await expect(page).toHaveURL(/guidance\/rosters\/new-assignment\?upload=true/);
  const upload = page.getByRole('dialog', { name: 'Import class masterlist', exact: true });
  await upload.getByLabel(/CSV file/).setInputFiles({ name: 'enrolled.csv', mimeType: 'text/csv', buffer: Buffer.from('StudentNumber\n2026-000') });
  await upload.getByRole('button', { name: 'Validate', exact: true }).click();
  await upload.getByRole('button', { name: 'Import 1 valid record(s)', exact: true }).click();
  await expect(upload.getByText('Imported 1 student(s). Skipped 0.', { exact: true })).toBeVisible();
  await upload.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText('Jamie Santos', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Alex Reyes', exact: false })).toBeVisible();
  expect(creates).toBe(1);
  expect(classRequests).toBe(0);
  await noOverflow(page);
});

test('Guidance assigns an instructor to an existing subject before uploading its roster', async ({ page }) => {
  await setup(page);
  await page.route('**/api/classes', route => route.fulfill({ json: [{ ...offering, instructorId: null, instructorName: null }] }));
  await page.route('**/api/classes/c1/assign-instructor', route => {
    expect(route.request().postDataJSON()).toEqual({ instructorId: 'i0' });
    return route.fulfill({ json: offering });
  });
  await page.goto('/guidance/rosters');
  await expect(page.getByRole('link', { name: 'Upload master list', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Assign instructor', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Assign instructor', exact: true });
  await expect(dialog.getByRole('button', { name: 'Save instructor', exact: true })).toBeDisabled();
  await expect(dialog.locator('option')).toHaveCount(2);
  await expect(dialog.getByLabel('Instructor', { exact: true })).not.toContainText('Taylor Reyes');
  await dialog.getByLabel('Instructor', { exact: true }).selectOption('i0');
  await dialog.getByRole('button', { name: 'Save instructor', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Upload master list', exact: true })).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Alex Reyes');
  await noOverflow(page);
});

test('roster uploads reject empty files and recover from server validation errors', async ({ page }) => {
  await setup(page);
  await page.goto('/guidance/rosters/c1?upload=true');
  const dialog = page.getByRole('dialog', { name: 'Import class masterlist' });
  const file = dialog.getByLabel(/CSV file/);
  await file.setInputFiles({ name: 'empty.csv', mimeType: 'text/csv', buffer: Buffer.from('') });
  await expect(dialog.getByRole('alert')).toContainText('Choose a non-empty CSV file.');
  await expect(dialog.getByRole('button', { name: 'Validate', exact: true })).toBeDisabled();
  let failed = true;
  await page.route('**/api/classes/c1/masterlist/validate', route => route.fulfill({
    status: failed ? 400 : 200,
    json: failed ? { errors: { file: ['Invalid CSV formatting at row 2.'] } } : {
      totalRows: 1, valid: [], duplicate: [], notFound: [], ambiguous: [], malformed: [{ rowNumber: 2, studentNumber: '1234567890123456789012345678901', outcome: 'Malformed' }],
    },
  }));
  await file.setInputFiles({ name: 'students.csv', mimeType: 'text/csv', buffer: Buffer.from('StudentNumber\n1234567890123456789012345678901') });
  await dialog.getByRole('button', { name: 'Validate', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Invalid CSV formatting at row 2.');
  failed = false;
  await dialog.getByRole('button', { name: 'Validate', exact: true }).click();
  await expect(dialog.getByText('row 2', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Import \d/ })).toHaveCount(0);
  await noOverflow(page);
});

test('Guidance saves student numbers before registration and can withdraw them', async ({ page }, info) => {
  await setup(page);
  let entries: { id: string; studentNumber: string; isRegistered: boolean }[] = [];
  await page.route('**/api/classes/c1/masterlist', route => route.fulfill({ json: entries }));
  await page.route('**/api/classes/c1/masterlist/validate', route => route.fulfill({ json: {
    totalRows: 1, valid: [{ rowNumber: 2, studentNumber: '00123', outcome: 'Valid' }],
    duplicate: [], notFound: [], ambiguous: [], malformed: [],
  } }));
  await page.route('**/api/classes/c1/masterlist/import', route => {
    expect(route.request().postDataJSON()).toEqual({ studentNumbers: ['00123'] });
    entries = [{ id: 'entry1', studentNumber: '00123', isRegistered: false }];
    return route.fulfill({ json: { importedCount: 1, skippedCount: 0, pendingRegistrationCount: 1 } });
  });
  await page.route('**/api/classes/c1/masterlist/entry1', route => {
    expect(route.request().method()).toBe('DELETE');
    entries = [];
    return route.fulfill({ status: 204 });
  });
  await page.goto('/guidance/rosters/c1?upload=true');
  const dialog = page.getByRole('dialog', { name: 'Import class masterlist' });
  await dialog.getByLabel(/CSV file/).setInputFiles({ name: 'masterlist.csv', mimeType: 'text/csv', buffer: Buffer.from('StudentNumber\n00123') });
  await dialog.getByRole('button', { name: 'Validate', exact: true }).click();
  await dialog.getByRole('button', { name: 'Import 1 valid record(s)', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('1 student number(s) saved, awaiting registration.');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  const pending = page.getByRole('region', { name: 'Awaiting registration' });
  await expect(pending).toContainText('00123');
  const remove = pending.getByRole('button', { name: 'Remove student number 00123', exact: true });
  const bounds = await remove.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/masterlist-pending-' + info.project.name + '.png', fullPage: true });
  page.on('dialog', dialog => dialog.accept());
  await pending.getByRole('button', { name: 'Remove student number 00123', exact: true }).click();
  await expect(pending).not.toBeVisible();
});

test('roster list retries failed loads and filters archived classes', async ({ page }) => {
  await setup(page);
  let failed = true;
  await page.route('**/api/classes', route => route.fulfill({
    status: failed ? 503 : 200,
    json: failed ? { detail: 'Roster service unavailable.' } : [{ ...offering, status: 'Archived' }],
  }));
  await page.goto('/guidance/rosters');
  await expect(page.getByRole('alert')).toContainText('Roster service unavailable.');
  failed = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('No rosters match your filters.', { exact: true })).toBeVisible();
  await page.getByLabel('Status', { exact: true }).selectOption('Archived');
  await expect(page.getByRole('link', { name: 'Open roster', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Upload master list', exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('Guidance form editor links stay in the Guidance workspace', async ({ page }) => {
  await setup(page);
  await page.goto('/guidance/evaluations');
  await page.getByRole('link', { name: 'Manage', exact: true }).click();
  await expect(page).toHaveURL(/guidance\/evaluations\/forms\/f1/);
  await page.getByRole('link', { name: /Back/ }).click();
  await expect(page).toHaveURL(/guidance\/evaluations\?tab=forms/);
  await noOverflow(page);
  await page.goto('/guidance/academics');
  await expect(page.getByRole('tab', { name: 'Departments', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Instructors', exact: true }).click();
  await expect(page.getByText('Alex Reyes', { exact: false }).first()).toBeVisible();
  await noOverflow(page);
});

test('Guidance comments show feedback below five respondents while filtering', async ({ page }, info) => {
  await setup(page);
  await page.route('**/api/guidance/faculty-performance', route => route.fulfill({ json: [
    { instructorId: 'i0', instructorName: 'Alex Reyes', departmentId: 'd1', departmentName: 'Computer Studies', hasEvaluationData: true, meetsAnonymityThreshold: true },
    { instructorId: 'i1', instructorName: 'Taylor Reyes', departmentId: 'd2', departmentName: 'Business Administration', hasEvaluationData: true, meetsAnonymityThreshold: false },
  ] }));
  const comments = [
    { instructorId: 'i0', instructorName: 'Alex Reyes', departmentId: 'd1', departmentName: 'Computer Studies', questionText: 'Teaching feedback', questionType: 'Text', commentText: 'More classroom discussion would help.', isFlaggedNegative: true, originalCommentText: 'Not enough classroom discussion.' },
    { instructorId: 'i0', instructorName: 'Alex Reyes', departmentId: 'd1', departmentName: 'Computer Studies', questionText: 'Overall feedback', questionType: 'RapidAppraisal', commentText: 'Clear and helpful explanations.', isFlaggedNegative: false, originalCommentText: null },
  ];
  const smallGroupComment = { ...comments[1], instructorId: 'i1', instructorName: 'Taylor Reyes', departmentId: 'd2', departmentName: 'Business Administration', commentText: 'Useful examples.' };
  await page.route('**/api/guidance/comments*', route => {
    const params = new URL(route.request().url()).searchParams;
    const smallGroupOnly = params.get('departmentId') === 'd2' || params.get('instructorId') === 'i1';
    return route.fulfill({ json: { comments: smallGroupOnly ? [smallGroupComment] : params.get('departmentId') ? comments : [...comments, smallGroupComment], minimumRespondents: 0, hasProtectedComments: false } });
  });
  await page.goto('/guidance/comments');
  await expect(page.getByText('More classroom discussion would help.', { exact: true })).toBeVisible();
  await expect(page.getByText('Comments protected', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Rapid Appraisal', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Show original', exact: true }).click();
  await expect(page.getByText('Original: Not enough classroom discussion.', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/guidance-comments-' + info.project.name + '.png', fullPage: true });
  await page.getByLabel('Department', { exact: true }).selectOption('d2');
  await expect(page.getByText('Useful examples.', { exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Instructor', { exact: true }).selectOption('i1');
  await expect(page.getByText('Useful examples.', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/guidance-comments-below-five-' + info.project.name + '.png', fullPage: true });
  await page.getByLabel('Department', { exact: true }).selectOption('d1');
  await expect(page.getByLabel('Instructor', { exact: true })).toHaveValue('');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText('Clear and helpful explanations.', { exact: true })).toBeVisible();
  await expect(page.getByText('Original: Not enough classroom discussion.', { exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('Guidance comments retry errors and refresh newly submitted feedback', async ({ page }) => {
  await setup(page);
  let failed = true;
  let hasComment = false;
  const comment = { instructorId: 'i0', instructorName: 'Alex Reyes', departmentId: 'd1', departmentName: 'Computer Studies', questionText: 'Teaching feedback', questionType: 'Text', commentText: 'Helpful feedback.', isFlaggedNegative: false, originalCommentText: null };
  await page.route('**/api/guidance/comments*', route => route.fulfill({ status: failed ? 503 : 200, json: failed ? { detail: 'Unavailable' } : { comments: hasComment ? [comment] : [], minimumRespondents: 0, hasProtectedComments: false } }));
  await page.goto('/guidance/comments');
  await expect(page.getByRole('alert')).toContainText('Could not load comments.');
  await expect(page.getByText('No comments available for the current filters.', { exact: true })).toHaveCount(0);
  failed = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('No comments available for the current filters.', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  hasComment = true;
  await page.getByRole('button', { name: 'Refresh comments', exact: true }).click();
  await expect(page.getByText('Helpful feedback.', { exact: true })).toBeVisible();
  await expect(page.getByText('No comments available for the current filters.', { exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('Guidance creates a student with a student number and preserves nonstudent creation', async ({ page }, info) => {
  await setup(page);
  const requests: any[] = [];
  await page.route('**/api/users', async route => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: [] });
    const body = route.request().postDataJSON();
    requests.push(body);
    return route.fulfill({ json: { id: 'created' + requests.length, ...body, isActive: true, hasPhoto: false, departmentName: 'Computer Studies' } });
  });
  await page.goto('/guidance/users');
  await page.getByRole('button', { name: 'New user', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'New user', exact: true });
  await modal.getByLabel('Student', { exact: true }).check();
  await expect(modal.getByLabel('Student number', { exact: true })).toBeVisible();
  await modal.getByLabel('Email', { exact: true }).fill('manual@example.test');
  await modal.getByLabel('Temporary password', { exact: true }).fill('E2eOnly!123');
  await modal.getByLabel('First name', { exact: true }).fill('Jamie');
  await modal.getByLabel('Last name', { exact: true }).fill('Santos');
  await modal.getByLabel('Department', { exact: true }).selectOption('d1');
  await modal.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(modal.getByText('Enter a student number (up to 30 characters).', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(0);
  await modal.getByLabel('Student number', { exact: true }).fill('00123');
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/manual-student-' + info.project.name + '.png', fullPage: true });
  await modal.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(requests[0]).toMatchObject({ studentNumber: '00123', firstName: 'Jamie', lastName: 'Santos', fullName: 'Jamie Santos', departmentId: 'd1', roles: ['Student'] });
  await expect(page.locator('tbody')).toContainText('00123');
  await page.getByRole('button', { name: 'New user', exact: true }).click();
  await modal.getByLabel('Student', { exact: true }).check();
  await modal.getByLabel('Student', { exact: true }).uncheck();
  await modal.getByLabel('Guidance', { exact: true }).check();
  await expect(modal.getByLabel('Student number', { exact: true })).toHaveCount(0);
  await modal.getByLabel('Email', { exact: true }).fill('new-guidance@example.test');
  await modal.getByLabel('Full name', { exact: true }).fill('Jordan Santos');
  await modal.getByLabel('Temporary password', { exact: true }).fill('E2eOnly!123');
  await modal.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(requests[1]).toEqual({ email: 'new-guidance@example.test', fullName: 'Jordan Santos', password: 'E2eOnly!123', roles: ['Guidance'] });
});

test('school-wide master list uploads without selecting a class and supports filtering and removal', async ({ page }, info) => {
  await setup(page);
  let entries: { id: string; studentNumber: string; isRegistered: boolean }[] = [];
  let classCalls = 0;
  page.on('request', request => { if (request.url().includes('/api/classes')) classCalls++; });
  await page.route('**/api/guidance/student-masterlist', route => route.fulfill({ json: entries }));
  await page.route('**/api/guidance/student-masterlist/validate', route => route.fulfill({ json: {
    totalRows: 3, valid: [{ rowNumber: 2, studentNumber: '00123' }, { rowNumber: 3, studentNumber: '00456' }],
    duplicate: [{ rowNumber: 4, studentNumber: '00123' }], malformed: [],
  } }));
  await page.route('**/api/guidance/student-masterlist/import', route => {
    expect(route.request().postDataJSON()).toEqual({ studentNumbers: ['00123', '00456'] });
    entries = [{ id: 'e1', studentNumber: '00123', isRegistered: false }, { id: 'e2', studentNumber: '00456', isRegistered: true }];
    return route.fulfill({ json: { importedCount: 2, skippedCount: 0 } });
  });
  await page.route('**/api/guidance/student-masterlist/e1', route => {
    expect(route.request().method()).toBe('DELETE');
    entries = entries.filter(e => e.id !== 'e1');
    return route.fulfill({ status: 204 });
  });
  await page.goto('/guidance/student-masterlist');
  await expect(page.getByRole('heading', { name: 'Student Master List', exact: true })).toBeVisible();
  await expect(page.getByText('No student numbers uploaded yet.', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV template', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('student-masterlist-template.csv');
  await page.getByLabel('CSV file - StudentNumber', { exact: true }).setInputFiles({ name: 'school.csv', mimeType: 'text/csv', buffer: Buffer.from('StudentNumber\n00123\n00456\n00123') });
  await page.getByRole('button', { name: 'Validate', exact: true }).click();
  await expect(page.getByText('3 row(s) · 2 valid · 1 duplicate · 0 malformed', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/school-masterlist-preview-' + info.project.name + '.png', fullPage: true });
  await page.getByRole('button', { name: 'Import 2 student number(s)', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved 2 student number(s). Skipped 0.');
  const saved = page.getByRole('region', { name: 'Saved student numbers' });
  await expect(saved.locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('Registration status', { exact: true }).selectOption('registered');
  await expect(saved.locator('tbody tr')).toHaveCount(1);
  await expect(saved).toContainText('00456');
  await page.getByLabel('Registration status', { exact: true }).selectOption('');
  await page.getByRole('searchbox', { name: 'Search student numbers' }).fill('00123');
  await expect(saved.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search student numbers' }).fill('');
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/school-masterlist-saved-' + info.project.name + '.png', fullPage: true });
  const bounds = await saved.getByRole('button', { name: 'Remove student number 00123', exact: true }).boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  page.on('dialog', dialog => dialog.accept());
  await saved.getByRole('button', { name: 'Remove student number 00123', exact: true }).click();
  await expect(saved.getByText('00123', { exact: true })).toHaveCount(0);
  expect(classCalls).toBe(0);
});

test('school-wide upload recovers from CSV and list errors', async ({ page }) => {
  await setup(page);
  let failed = true;
  await page.route('**/api/guidance/student-masterlist', route => route.fulfill({ status: failed ? 503 : 200, json: failed ? { detail: 'List unavailable.' } : [] }));
  await page.goto('/guidance/student-masterlist');
  await expect(page.getByRole('alert')).toContainText('List unavailable.');
  failed = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const file = page.getByLabel('CSV file - StudentNumber', { exact: true });
  await file.setInputFiles({ name: 'empty.csv', mimeType: 'text/csv', buffer: Buffer.from('') });
  await expect(page.getByRole('alert')).toContainText('Choose a non-empty CSV file.');
  await expect(page.getByRole('button', { name: 'Validate', exact: true })).toBeDisabled();
  await file.setInputFiles({ name: 'students.csv', mimeType: 'text/csv', buffer: Buffer.from('StudentNumber\n00123') });
  await page.route('**/api/guidance/student-masterlist/validate', route => route.fulfill({ status: 400, json: { errors: { file: ['Invalid CSV formatting at row 2.'] } } }));
  await page.getByRole('button', { name: 'Validate', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid CSV formatting at row 2.');
  await expect(page.getByRole('button', { name: /Import \d/ })).toHaveCount(0);
  await noOverflow(page);
});

test('Instructor cannot enter the Guidance workspace', async ({ page }) => {
  await setup(page, 'Instructor');
  await page.goto('/guidance/dashboard');
  await expect(page).toHaveURL(/unauthorized/);
});
test('analytics recovers from a failed request and handles an empty system', async ({ page }) => {
  await setup(page);
  let failed = true;
  await page.route('**/api/guidance/analytics*', route => route.fulfill({
    status: failed ? 503 : 200,
    json: failed ? { detail: 'Unavailable' } : {
      periodId: null, periodName: 'No evaluation periods', periods: [],
      submittedStudents: 0, eligibleStudents: 0, activeClasses: 0, pendingRequests: 0, pendingAccounts: 0,
      eligible: 0, completed: 0, submitted: 0, averageRating: null,
      rapidAppraisalAverageRating: null, trend: [], departments: [],
    },
  }));
  await page.goto('/guidance/dashboard');
  await expect(page.getByRole('alert')).toContainText('Analytics could not be loaded');
  failed = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('No submissions in this period', { exact: true })).toBeVisible();
  await expect(page.getByText('No eligible memberships', { exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await noOverflow(page);
});
