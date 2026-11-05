// Synthetic multi-page report fixture for layout and content verification.
const { buildSync } = require('esbuild');
const { mkdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'tmp/pdfs');
mkdirSync(output, { recursive: true });
buildSync({ entryPoints: [path.join(root, 'src/app/features/guidance/faculty-performance/detail/faculty-report.ts')], outfile: path.join(output, 'faculty-report.cjs'), bundle: true, packages: 'external', platform: 'node', format: 'cjs' });
const { createFacultyReport } = require(path.join(output, 'faculty-report.cjs'));
const detail = {
  instructorId: 'fixture-instructor', instructorName: 'Sample Faculty', employeeNumber: 'DEMO-01', departmentName: 'Information Technology',
  evaluationsSubmittedCount: 60, respondentCount: 60, meetsAnonymityThreshold: true, overallAverageRating: 3.55,
  rapidAppraisalAverageRating: 8, analytics: {
    periodName: 'AY 2026-2027 1st Semester', weightedScore: 71.9, inventoryScore: 71, eligibleStudents: 70,
    responseRate: 60 / 70 * 100, minimumRespondents: 35, minimumCommentRespondents: 18, writtenRespondents: 60,
    hasReliableSentiment: true, dominantSentiment: 'Positive', comparison: 'Contradictory', scoreSentiment: 'Neutral',
    positive: 40, neutral: 15, negative: 5, unclassifiedComments: 0, neutralScoreMinimum: 50, positiveScoreMinimum: 75,
    interpretation: 'Weighted score 71.90/100 (Neutral). Written sentiment: Positive. Review the difference between numerical ratings and written feedback.',
  },
  categoryRatings: [{ categoryName: 'Teaching and learning', averageRating: 3.55, ratingCount: 1200 }],
  questionRatings: Array.from({ length: 40 }, (_, i) => ({ questionId: String(i), questionText: `Statement ${i + 1}: Explains complex concepts clearly and supports students with relevant examples and practical classroom activities.`, averageRating: 3.55, ratingCount: 60 })),
  comments: [], rapidAppraisalComments: Array.from({ length: 60 }, (_, i) => ({ commentText: `Feedback ${i + 1}: The instructor explains lessons clearly. More time for classroom questions and practical examples would help. ` + (i === 59 ? 'FINAL-FEEDBACK-MARKER' : ''), ratingValue: 8, sentiment: 'Positive', isFlaggedNegative: false })),
};
const summary = { generatedAtUtc: new Date().toISOString(), evaluationCount: 60, respondentCount: 60, summary: '**Overall interpretation**\nThe **weighted score of 71.90/100** indicates a neutral numerical rating. Written feedback is **predominantly positive**, so Guidance should review the difference.\n\n**Key strengths**\nClear explanations and relevant examples.\n\n**Important concerns**\nAllow more time for questions.' };
const logo = 'data:image/png;base64,' + readFileSync(path.join(root, 'public/school-logo.png')).toString('base64');
createFacultyReport(detail, summary, logo, { generatedAtUtc: new Date().toISOString(), studentCount: 60, commentCount: 60, isStale: false, themes: [{ summary: 'Clear explanations help students understand the lessons.', studentCount: 40, commentCount: 40 }, { summary: 'Students request more time for questions and practical examples.', studentCount: 20, commentCount: 20 }] }).save(path.join(output, 'instructor-report-sample.pdf'));
createFacultyReport({ ...detail, meetsAnonymityThreshold: false, questionRatings: [], categoryRatings: [], analytics: { ...detail.analytics, weightedScore: null, inventoryScore: null, hasReliableSentiment: false, comparison: 'Insufficient Responses', interpretation: 'Insufficient Responses: 2 of 35 required respondents.' }, respondentCount: 2 }, null, logo).save(path.join(output, 'insufficient-responses-sample.pdf'));
console.log('Created full multi-page and insufficient-response report fixtures in front/tmp/pdfs.');
