import { DatePipe, DecimalPipe } from '@angular/common';
import { ChartConfiguration } from 'chart.js';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReportPeriod } from '../../shared/report-period';
import { AnalyticsChart } from '../../../../shared/charts/analytics-chart';
import { ProfileAvatar } from '../../../../shared/components/profile-avatar/profile-avatar';
import { Icon } from '../../../../shared/components/icon/icon';
import { Pagination } from '../../../../shared/tables/table-parts';
import { createTableState } from '../../../../shared/tables/table-state';
import { GuidanceFacultyPerformanceDetailDto, GuidanceFacultySummaryDto, FeedbackSummaryDto } from '../../../../core/models/guidance.models';
import { GuidanceReportingService } from '../../services/guidance-reporting.service';

/**
 * Anonymized evaluation results for one instructor, across any department
 * (architecture doc §6.3/§13). The API withholds category/question ratings
 * below the minimum-respondent threshold, while Guidance can read written
 * feedback regardless of respondent count.
 */
@Component({
  selector: 'app-guidance-faculty-performance-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, AnalyticsChart, ProfileAvatar, Icon, ReportPeriod, Pagination],
  styleUrls: ['./faculty-detail.css', './faculty-analytics.css', './faculty-feedback.css'],
  templateUrl: './guidance-faculty-performance-detail.html',
})
export class GuidanceFacultyPerformanceDetail implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly feedbackSummary = signal<FeedbackSummaryDto | null>(null);
  protected readonly feedbackSummaryOpen = signal(false);
  protected readonly feedbackSummaryBusy = signal(false);
  protected readonly feedbackSummaryError = signal('');
  protected readonly feedbackSummaryReading = signal(false);
  protected openFeedbackSummary(): void {
    this.feedbackSummaryOpen.set(true);
    if (!this.feedbackSummary() && !this.feedbackSummaryReading()) this.generateFeedbackSummary();
  }
  protected generateFeedbackSummary(): void {
    if (this.feedbackSummaryBusy() || this.feedbackSummaryReading()) return;
    const period = this.periodId();
    this.feedbackSummaryBusy.set(true); this.feedbackSummaryError.set('');
    this.reportingService.generateFeedbackSummary(this.instructorId, period).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => { if (period !== this.periodId()) return; this.feedbackSummary.set(result); this.feedbackSummaryBusy.set(false); },
      error: (e: HttpErrorResponse) => { if (period !== this.periodId()) return; this.feedbackSummaryError.set(e.error?.detail ?? 'Could not summarize feedback. Please try again.'); this.feedbackSummaryBusy.set(false); },
    });
  }
  private readonly route = inject(ActivatedRoute);
  private readonly reportingService = inject(GuidanceReportingService);

  private readonly instructorId = this.route.snapshot.paramMap.get('instructorId')!;

  protected readonly detail = signal<GuidanceFacultyPerformanceDetailDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly reportLoading = signal(false);
  protected readonly reportError = signal<string | null>(null);

  protected async downloadReport(): Promise<void> {
    const detail = this.detail();
    if (!detail || this.loading() || this.reportLoading() || this.summaryLoading() || this.feedbackSummaryBusy() || this.feedbackSummaryReading()) return;
    this.reportLoading.set(true);
    this.reportError.set(null);
    try {
      const { downloadFacultyReport } = await import('./faculty-report');
      await downloadFacultyReport(detail, this.summary(), this.feedbackSummary());
    } catch {
      this.reportError.set('Could not create the PDF report. Please try again.');
    } finally {
      this.reportLoading.set(false);
    }
  }
  protected readonly feedbackRows = computed(() => [
    ...(this.detail()?.comments ?? []).map((comment, index) => ({ ...comment, source: 'Written', key: `written-${index}` })),
    ...(this.detail()?.rapidAppraisalComments ?? []).map((comment, index) => ({ ...comment, source: 'Rapid appraisal', key: `rapid-${index}` })),
  ]);
  protected readonly feedbackCount = computed(() => this.feedbackRows().length);
  protected readonly feedbackTable = createTableState(this.feedbackRows, {
    searchFields: comment => [comment.commentText, comment.questionText, comment.source],
    pageSize: 50,
  });

  /** Keys of comments currently showing their original (unfiltered) text - see toggleOriginal(). */
  protected readonly expandedOriginals = signal<ReadonlySet<string>>(new Set());

  // --- AI summary - generated only when a Guidance user clicks the action. ---
  protected readonly summary = signal<GuidanceFacultySummaryDto | null>(null);
  protected readonly summaryOpen = signal(false);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly summaryHasNewData = computed(() => {
    const saved = this.summary();
    const detail = this.detail();
    return !!saved && !!detail && (saved.evaluationCount !== detail.evaluationsSubmittedCount
      || saved.respondentCount !== detail.respondentCount);
  });

  protected readonly questionSort = signal('original');
  protected readonly sortedQuestions = computed(() => {
    const rows = [...(this.detail()?.questionRatings ?? [])];
    if (this.questionSort() !== 'original') rows.sort((a, b) => this.questionSort() === 'lowest' ? a.averageRating - b.averageRating : b.averageRating - a.averageRating);
    return rows;
  });
  protected readonly ratingsTotal = computed(() => (this.detail()?.ratingDistribution ?? []).reduce((n, r) => n + r.count, 0));
  protected readonly favorable = computed(() => {
    const rows = this.detail()?.ratingDistribution ?? [];
    return this.ratingsTotal() ? Math.round(rows.filter(r => r.rating >= 4).reduce((n, r) => n + r.count, 0) / this.ratingsTotal() * 100) : null;
  });
  protected readonly periodDelta = computed(() => {
    const rows = this.detail()?.periodPerformance ?? [];
    const current = rows.at(-1); const previous = rows.at(-2);
    if (current?.averageRating == null || previous?.averageRating == null) return null;
    return { value: Math.round((current.averageRating - previous.averageRating) * 100) / 100, period: previous.periodName };
  });
  protected readonly categoryChart = computed<ChartConfiguration>(() => {
    const rows = this.detail()?.categoryRatings ?? [];
    return { type: 'bar', data: { labels: rows.map(c => c.categoryName.match(/.{1,24}(?:\\s|$)|.{1,24}/g) ?? [c.categoryName]),
      datasets: [{ label: 'Average / 5', data: rows.map(c => c.averageRating), backgroundColor: '#7e22ce', borderRadius: 4, maxBarThickness: 28 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: {
        x: { min: 0, max: 5, grid: { color: '#eef0f2' }, ticks: { stepSize: 1 } },
        y: { grid: { display: false } } } } };
  });
  protected readonly distributionChart = computed<ChartConfiguration>(() => ({
    type: 'bar', data: { labels: (this.detail()?.ratingDistribution ?? []).map(r => String(r.rating)),
      datasets: [{ label: 'Answers', data: (this.detail()?.ratingDistribution ?? []).map(r => r.count),
        backgroundColor: ['#e06479', '#f0ab62', '#d8bd45', '#4e9db6', '#7e22ce'], borderRadius: 4, maxBarThickness: 42 }] },
    options: { plugins: { legend: { display: false } }, scales: {
      x: { title: { display: true, text: 'Rating / 5' }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef0f2' } } } },
  }));
  protected readonly trendChart = computed<ChartConfiguration>(() => ({
    type: 'line', data: { labels: (this.detail()?.periodPerformance ?? []).map(p => p.periodName),
      datasets: [{ label: 'Average / 5', data: (this.detail()?.periodPerformance ?? []).map(p => p.averageRating),
        borderColor: '#3b82f6', backgroundColor: '#3b82f615', fill: true, tension: 0.2, pointRadius: 5, pointHoverRadius: 7, spanGaps: false }] },
    options: { plugins: { legend: { display: false } }, scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: 4 } },
      y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: '#eef0f2' } } } },
  }));
  protected chartHeight(): number { return Math.min(480, Math.max(220, (this.detail()?.categoryRatings.length ?? 0) * 52)); }
  protected readonly hasTrend = computed(() => this.detail()?.periodPerformance?.some(p => p.averageRating !== null));

  protected readonly periodId = signal<string | undefined>(this.route.snapshot.queryParamMap.get('period') ?? undefined);
  private request?: import('rxjs').Subscription;
  protected readonly sentimentChart = computed<ChartConfiguration>(() => {
    const a = this.detail()?.analytics;
    return { type: 'doughnut', data: { labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{ data: [a?.positive ?? 0, a?.neutral ?? 0, a?.negative ?? 0],
        backgroundColor: ['#7e22ce', '#64748b', '#d14760'], borderWidth: 0 }] },
      options: { plugins: { legend: { position: 'bottom' } } } };
  });
  ngOnInit(): void {}
  protected loadPeriod(periodId: string | undefined): void {
    if (this.feedbackSummaryBusy()) return;
    this.feedbackSummary.set(null); this.feedbackSummaryOpen.set(false); this.feedbackSummaryError.set('');
    this.request?.unsubscribe(); this.periodId.set(periodId);
    this.loading.set(true); this.errorMessage.set(null); this.summary.set(null); this.summaryOpen.set(false);
    this.summaryError.set(null); this.expandedOriginals.set(new Set());
    this.reportError.set(null);
    this.request = this.reportingService.getFacultyPerformanceDetail(this.instructorId, periodId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.summary.set(detail.savedSummary ?? null);
        // A saved result opens once on entry; after it is dismissed it stays closed
        // until Guidance explicitly reopens it from the header action.
        this.summaryOpen.set(!!detail.savedSummary);
        this.loading.set(false);
        this.feedbackSummaryReading.set(true);
        this.reportingService.getFeedbackSummary(this.instructorId, detail.analytics.periodId ?? periodId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: saved => { if (this.periodId() !== periodId) return; this.feedbackSummary.set(saved); this.feedbackSummaryReading.set(false); },
          error: () => { if (this.periodId() !== periodId) return; this.feedbackSummaryReading.set(false); this.feedbackSummaryError.set('Could not load the saved feedback summary. Reopen or regenerate it to try again.'); },
        });
      },
      error: () => {
        this.errorMessage.set('Could not load evaluation results.');
        this.loading.set(false);
      },
    });
  }

  /** key format: "comments-{index}" or "rapid-{index}" - just needs to be unique per comment. */
  protected isOriginalExpanded(key: string): boolean {
    return this.expandedOriginals().has(key);
  }

  protected toggleOriginal(key: string): void {
    this.expandedOriginals.update((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  protected generateSummary(): void {
    if (this.summaryLoading() || !this.detail()?.meetsAnonymityThreshold) return;
    this.summaryLoading.set(true);
    this.summaryError.set(null);
    this.summaryOpen.set(true);

    this.reportingService.generateFacultySummary(this.instructorId, this.periodId()).subscribe({
      next: (result) => {
        this.summary.set(result);
        this.summaryLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.summaryError.set(error.error?.detail ?? 'Could not generate a summary right now.');
        this.summaryLoading.set(false);
      },
    });
  }

  protected openSummary(): void {
    if (this.summary()) this.summaryOpen.set(true);
  }

  protected closeSummary(): void {
    this.summaryOpen.set(false);
  }

  /** Renders only the saved Overall interpretation section. */
  protected formatSummary(summary: string): string {
    const marker = '**Overall interpretation**';
    const markerIndex = summary.indexOf(marker);
    let visible = markerIndex >= 0 ? summary.slice(markerIndex) : summary.split(/\n\s*\n/)[0];
    const separatorIndex = visible.search(/\n\s*---\s*(?:\n|$)/);
    if (separatorIndex >= 0) visible = visible.slice(0, separatorIndex);
    const nextSectionIndex = visible.search(/\n\s*\*\*(?:Quantitative results|Written feedback|Key strengths|Important concerns|Scale-sentiment consistency|Representative anonymous feedback|Data limitations)\*\*/i);
    if (nextSectionIndex >= 0) visible = visible.slice(0, nextSectionIndex);
    return visible.trim()
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  }
}
