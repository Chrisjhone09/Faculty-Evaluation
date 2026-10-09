import { DatePipe, DecimalPipe } from '@angular/common';
import { ChartConfiguration } from 'chart.js';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsChart } from '../../../../shared/charts/analytics-chart';
import { ProfileAvatar } from '../../../../shared/components/profile-avatar/profile-avatar';
import { Icon } from '../../../../shared/components/icon/icon';
import { GuidanceFacultyPerformanceDetailDto, GuidanceFacultySummaryDto } from '../../../../core/models/guidance.models';
import { GuidanceReportingService } from '../../services/guidance-reporting.service';

/**
 * Anonymized evaluation results for one instructor, across any department
 * (architecture doc §6.3/§13). The API withholds category/question ratings
 * below the minimum-respondent threshold, while Guidance can read written
 * feedback regardless of respondent count.
 */
@Component({
  selector: 'app-guidance-faculty-performance-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, AnalyticsChart, ProfileAvatar, Icon],
  styleUrls: ['./faculty-detail.css', './faculty-analytics.css', './faculty-feedback.css'],
  templateUrl: './guidance-faculty-performance-detail.html',
})
export class GuidanceFacultyPerformanceDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportingService = inject(GuidanceReportingService);

  private readonly instructorId = this.route.snapshot.paramMap.get('instructorId')!;

  protected readonly detail = signal<GuidanceFacultyPerformanceDetailDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly feedbackType = signal<'all' | 'comments' | 'rapid'>('all');
  protected readonly feedbackCount = computed(() =>
    (this.detail()?.comments.length ?? 0) + (this.detail()?.rapidAppraisalComments.length ?? 0));
  protected readonly feedbackFilters = computed(() => [
    { key: 'all' as const, label: 'All feedback', count: this.feedbackCount() },
    { key: 'comments' as const, label: 'Written', count: this.detail()?.comments.length ?? 0 },
    { key: 'rapid' as const, label: 'Rapid appraisal', count: this.detail()?.rapidAppraisalComments.length ?? 0 },
  ]);

  /** Keys of comments currently showing their original (unfiltered) text - see toggleOriginal(). */
  protected readonly expandedOriginals = signal<ReadonlySet<string>>(new Set());

  // --- AI summary - generated only when the button below is clicked. ---
  protected readonly summary = signal<GuidanceFacultySummaryDto | null>(null);
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
      datasets: [{ label: 'Average / 5', data: rows.map(c => c.averageRating), backgroundColor: '#0f766e', borderRadius: 4, maxBarThickness: 28 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: {
        x: { min: 0, max: 5, grid: { color: '#eef0f2' }, ticks: { stepSize: 1 } },
        y: { grid: { display: false } } } } };
  });
  protected readonly distributionChart = computed<ChartConfiguration>(() => ({
    type: 'bar', data: { labels: (this.detail()?.ratingDistribution ?? []).map(r => String(r.rating)),
      datasets: [{ label: 'Answers', data: (this.detail()?.ratingDistribution ?? []).map(r => r.count),
        backgroundColor: ['#e06479', '#f0ab62', '#d8bd45', '#4e9db6', '#0f766e'], borderRadius: 4, maxBarThickness: 42 }] },
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

  ngOnInit(): void {
    this.reportingService.getFacultyPerformanceDetail(this.instructorId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.summary.set(detail.savedSummary ?? null);
        this.loading.set(false);
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

  protected selectFeedbackType(type: 'all' | 'comments' | 'rapid'): void {
    if (this.feedbackType() === type) return;
    this.feedbackType.set(type);
    this.expandedOriginals.set(new Set());
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

    this.reportingService.generateFacultySummary(this.instructorId).subscribe({
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
}
