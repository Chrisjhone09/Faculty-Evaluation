import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GuidanceFacultyPerformanceDetailDto, GuidanceFacultySummaryDto, FeedbackSummaryDto } from '../../../../core/models/guidance.models';

const purple = '#6b21a8';
const ink = '#202034';
const muted = '#626279';
const clean = (text: string) => text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2010-\u2014]/g, '-').replace(/\u2026/g, '...');
const number = (value: number | null | undefined) => value == null ? 'Unavailable' : value.toFixed(2);

/** Generates a local PDF from the authorized, unpaginated instructor detail response. */
export function createFacultyReport(
  detail: GuidanceFacultyPerformanceDetailDto,
  summary: GuidanceFacultySummaryDto | null,
  logo?: string,
  feedbackSummary?: FeedbackSummaryDto | null,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const a = detail.analytics;
  const margin = 16;
  const width = 178;
  const bottom = 278;
  let y = 36;
  doc.setProperties({ title: `Faculty evaluation - ${clean(detail.instructorName)} - ${clean(a.periodName)}`, author: 'Guidance Office', subject: 'Individual instructor evaluation report' });

  function page() { doc.addPage(); y = 36; }
  function space(height: number) { if (y + height > bottom) page(); }
  function section(index: string, title: string) {
    space(20);
    doc.setFillColor('#f3e8ff');
    doc.roundedRect(margin, y, width, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(purple);
    doc.text(`${index}   ${title}`, margin + 4, y + 6.6);
    y += 15;
  }
  // Markdown emphasis is rendered as bold text, never as HTML.
  function paragraph(text: string, size = 9.5, color = ink) {
    doc.setFontSize(size).setTextColor(color);
    let bold = false;
    for (const line of clean(text).replace(/^#{1,6}\s+/gm, '').split('\n')) {
      let x = margin;
      space(6);
      for (const token of line.split(/(\*\*|\s+)/).filter(Boolean)) {
        if (token === '**') { bold = !bold; continue; }
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        // Wrap unusually long words as well as normal paragraphs.
        for (const part of doc.splitTextToSize(token, width) as string[]) {
          const length = doc.getTextWidth(part);
          if (x + length > margin + width) { y += 5; space(6); x = margin; }
          if (x === margin && /^\s+$/.test(part)) continue;
          doc.text(part, x, y);
          x += length;
        }
      }
      y += 5;
    }
    y += 3;
  }
  function table(head: string[], body: (string | number)[][], columnStyles = {}) {
    space(22);
    autoTable(doc, {
      startY: y, margin: { top: 36, bottom: 20, left: margin, right: margin },
      head: [head], body, theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: ink, overflow: 'linebreak', lineColor: '#e8e2ee', lineWidth: 0.15 },
      headStyles: { fillColor: purple, textColor: '#ffffff', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#faf7fd' },
      rowPageBreak: 'avoid', columnStyles,
      didDrawPage: data => { y = data.cursor?.y ?? 36; },
    });
    y += 8;
  }

  doc.setFont('helvetica', 'bold').setFontSize(21).setTextColor(ink);
  doc.text('Faculty Evaluation Report', margin, y + 4);
  y += 15;
  paragraph(`**${detail.instructorName}**`, 14);
  paragraph(`${detail.departmentName}\nEmployee no. ${detail.employeeNumber}\n${a.periodName}`, 10, muted);
  paragraph(`Generated ${new Date().toLocaleString('en-PH')} | Guidance Office`, 8, muted);
  y += 2;
  const cards = [
    ['WEIGHTED SCORE', detail.meetsAnonymityThreshold ? number(a.weightedScore) + ' / 100' : 'Withheld'],
    ['INVENTORY SCORE', detail.meetsAnonymityThreshold ? number(a.inventoryScore) + ' / 100' : 'Withheld'],
    ['RAPID APPRAISAL', detail.meetsAnonymityThreshold ? number(detail.rapidAppraisalAverageRating) + ' / 10' : 'Withheld'],
  ];
  space(25);
  cards.forEach(([label, value], i) => {
    const x = margin + i * 61;
    doc.setFillColor('#f6f0fc').roundedRect(x, y, 56, 23, 2, 2, 'F');
    doc.setDrawColor(purple).setLineWidth(0.7).line(x, y + 3, x, y + 20);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(muted).text(label, x + 4, y + 7);
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(ink).text(value, x + 4, y + 16);
  });
  y += 31;
  table(['Respondents', 'Eligible students', 'Response rate', 'Evaluations'], [[detail.respondentCount, a.eligibleStudents, a.responseRate == null ? 'Unavailable' : number(a.responseRate) + '%', detail.evaluationsSubmittedCount]]);

  section('01', 'Numerical results & scoring');
  if (!detail.meetsAnonymityThreshold) {
    paragraph(`**Insufficient Responses:** ${detail.respondentCount} of ${a.minimumRespondents} required respondents. Numerical results are withheld.`);
  } else {
    paragraph(`**Numerical classification:** ${a.scoreSentiment ?? 'Unavailable'}\n**Average inventory item rating:** ${number(detail.overallAverageRating)} / 5`);
    paragraph('Inventory = average of each respondent\'s scored inventory total out of 100. Reverse-scored items use their converted values.\nFinal score = (Inventory score x 0.90) + raw Rapid Appraisal average.\nInventory contributes up to 90 points; Rapid Appraisal contributes up to 10 points. Calculations retain full precision; displayed values use two decimal places.', 9, muted);
    paragraph(`**Numerical rubric:** Negative below ${number(a.neutralScoreMinimum)}; Neutral from ${number(a.neutralScoreMinimum)} to below ${number(a.positiveScoreMinimum)}; Positive from ${number(a.positiveScoreMinimum)} to 100.`, 9, muted);
  }

  section('02', 'Student sentiment & interpretation');
  paragraph(`**Overall sentiment:** ${!detail.meetsAnonymityThreshold ? 'Insufficient Responses' : a.hasReliableSentiment ? a.dominantSentiment ?? 'Unavailable' : 'Insufficient Written Feedback'}\n**Scale-sentiment comparison:** ${a.comparison}`);
  paragraph(a.interpretation);
  if (a.hasReliableSentiment) {
    const total = a.positive + a.neutral + a.negative;
    table(['Sentiment', 'Student contributors', 'Share of classified contributors'], [
      ['Positive', a.positive, total ? number(a.positive / total * 100) + '%' : 'Unavailable'],
      ['Neutral', a.neutral, total ? number(a.neutral / total * 100) + '%' : 'Unavailable'],
      ['Negative', a.negative, total ? number(a.negative / total * 100) + '%' : 'Unavailable'],
    ]);
  }
  paragraph(`Minimum respondents: ${a.minimumRespondents}. Minimum classified-feedback contributors: ${a.minimumCommentRespondents}.\nClassified-feedback contributors: ${a.writtenRespondents}. Unclassified comments: ${a.unclassifiedComments}.\nEach student counts once across this instructor's subjects. Sentiment reflects written feedback; contradictory results require Guidance review.`, 9, muted);

  section('03', 'AI performance summary');
  if (!detail.meetsAnonymityThreshold) paragraph('AI summary is unavailable while the respondent requirement is unmet.');
  else if (!summary) paragraph('No saved AI summary. Generate a summary on the instructor performance page, then download this report again.');
  else {
    paragraph(`Saved ${new Date(summary.generatedAtUtc).toLocaleString('en-PH')} | ${summary.respondentCount} respondents | ${summary.evaluationCount} evaluations`, 8, muted);
    if (summary.isStale || summary.respondentCount !== detail.respondentCount || summary.evaluationCount !== detail.evaluationsSubmittedCount)
      paragraph('**Summary needs regeneration:** This saved interpretation may precede changes to the data or evaluation rules.');
    paragraph(summary.summary);
    paragraph('AI-assisted interpretation for Guidance review.', 8, muted);
  }

  section('04', 'Inventory category performance');
  if (detail.meetsAnonymityThreshold && detail.categoryRatings.length)
    table(['Category', 'Average / 5'], detail.categoryRatings.map(c => [clean(c.categoryName), number(c.averageRating)]), { 0: { cellWidth: 146 }, 1: { cellWidth: 32 } });
  else paragraph('No category results available for this report.');

  section('05', 'Question-level performance');
  if (detail.meetsAnonymityThreshold && detail.questionRatings.length)
    table(['#', 'Inventory statement', 'Average / 5'], detail.questionRatings.map((q, i) => [i + 1, clean(q.questionText), number(q.averageRating)]), { 0: { cellWidth: 10 }, 1: { cellWidth: 136 }, 2: { cellWidth: 32 } });
  else paragraph('Question-level numerical results are unavailable until the respondent requirement is met.');

  section('06', 'Combined student sentiment summary');
  if (feedbackSummary) {
    paragraph(`**Grouped student feedback** | ${feedbackSummary.studentCount} students | ${feedbackSummary.commentCount} comments\nSaved ${new Date(feedbackSummary.generatedAtUtc).toLocaleString('en-PH')}`, 9, muted);
    if (feedbackSummary.isStale) paragraph('**Feedback has changed:** Regenerate the saved feedback summary to include the latest comments.');
    table(['Summarized feedback', 'Students'], feedbackSummary.themes.map(t => [clean(t.summary), t.studentCount]), { 0: { cellWidth: 150 }, 1: { cellWidth: 28 } });
    paragraph('AI groups comments by similar meaning. Counts are distinct students per theme. A student may appear in multiple themes; counts should not be added as a total population. Grouping summarizes perceptions and does not verify claims.', 9, muted);
  } else paragraph('No grouped feedback summary saved. Click Summarize feedback on the instructor page, then download this report again.', 9, muted);
  const comments = [...detail.comments, ...detail.rapidAppraisalComments];
  if (!comments.length) paragraph('No written feedback submitted for this instructor and period.');
  else {
    paragraph(`**Feedback reviewed:** ${comments.length} comments across written and rapid appraisal feedback.`);
    if (!detail.meetsAnonymityThreshold || !a.hasReliableSentiment)
      paragraph('There is insufficient response data or classified written feedback to assign a reliable overall sentiment.');
    else {
      const total = a.positive + a.neutral + a.negative;
      paragraph(`**Overall written sentiment:** ${a.dominantSentiment ?? 'Unavailable'}. Across ${total} classified student contributors, ${a.positive} were Positive (${number(a.positive / total * 100)}%), ${a.neutral} Neutral (${number(a.neutral / total * 100)}%), and ${a.negative} Negative (${number(a.negative / total * 100)}%).`);
      paragraph(`**Interpretation:** ${a.interpretation}`);
      paragraph('The combined sentiment reflects student perceptions across this instructor\'s subjects. Review both positive experiences and negative concerns alongside the numerical results. See the saved AI performance summary for available themes and contextual interpretation.', 9, muted);
    }
    if (a.unclassifiedComments) paragraph(`${a.unclassifiedComments} comments have no available sentiment classification and are excluded from the classified distribution.`, 9, muted);
  }

  const pages = doc.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    doc.setPage(index);
    doc.setFillColor(purple).rect(0, 0, 210, 3, 'F');
    if (logo) doc.addImage(logo, 'PNG', margin, 9, 16, 16);
    const titleX = logo ? 36 : margin;
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(purple).text('COLEGIO DE KIDAPAWAN, INC.', titleX, 15);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(muted).text('Guidance Office | Faculty Evaluation', titleX, 21);
    doc.setDrawColor('#e4d9ef').setLineWidth(0.2).line(margin, 29, 194, 29);
    doc.line(margin, 283, 194, 283);
    doc.setFontSize(7.5).setTextColor(muted).text('Confidential | Guidance evaluation report', margin, 289);
    doc.text(`Page ${index} of ${pages}`, 194, 289, { align: 'right' });
  }
  return doc;
}

export async function downloadFacultyReport(detail: GuidanceFacultyPerformanceDetailDto, summary: GuidanceFacultySummaryDto | null, feedbackSummary?: FeedbackSummaryDto | null): Promise<void> {
  let logo: string | undefined;
  try {
    const response = await fetch(new URL('school-logo.png', document.baseURI));
    if (response.ok) {
      const blob = await response.blob();
      logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch { /* Branding is optional; the report remains available. */ }
  const filename = `Faculty-Report-${detail.instructorName}-${detail.analytics.periodName}`.replace(/[^a-z0-9-]+/gi, '-').replace(/-+$/g, '');
  createFacultyReport(detail, summary, logo, feedbackSummary).save(`${filename}.pdf`);
}
