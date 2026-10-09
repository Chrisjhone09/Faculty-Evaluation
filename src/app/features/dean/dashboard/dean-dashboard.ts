import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeanReportsSummaryDto } from '../../../core/models/dean.models';
import { DeanReportingService } from '../services/dean-reporting.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/components/icon/icon';
import { HBarChart } from '../../../shared/charts/h-bar-chart';
import { DonutChart } from '../../../shared/charts/donut-chart';
import { ChartDatum } from '../../../shared/charts/chart-models';

/**
 * Department dashboard for the Dean.
 *
 * This page absorbed the former Reports page. Both called
 * `GET /api/dean/reports` and rendered the same DTO - Reports simply showed a
 * couple more fields - so they were the same data presented twice under two
 * nav entries. Everything Reports had (archived offerings, offerings-by-term,
 * the department evaluation summary) now lives here, and /dean/reports
 * redirects to this page.
 *
 * The layout leads with what needs the Dean's attention rather than with
 * counts: a pending-requests callout appears only when there's something to
 * act on, so the dashboard is quiet when nothing is waiting.
 */
@Component({
  selector: 'app-dean-dashboard',
  imports: [RouterLink, PageHeader, EmptyState, Icon, HBarChart, DonutChart],
  templateUrl: './dean-dashboard.html',
})
export class DeanDashboard implements OnInit {
  private readonly reportingService = inject(DeanReportingService);

  /** Mirrors back/Domain/Constants/EvaluationAnonymity.cs MinimumRespondents. */
  protected readonly minimumRespondents = 5;

  protected readonly summary = signal<DeanReportsSummaryDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /** Students per term - a ranking, so a horizontal bar reads best. */
  protected readonly termChartData = computed<ChartDatum[]>(() =>
    (this.summary()?.offeringsByTerm ?? []).map((row) => ({
      label: row.term,
      value: row.studentCount,
      note: `${row.offeringCount} ${row.offeringCount === 1 ? 'offering' : 'offerings'}`,
    })),
  );

  /**
   * Active vs archived offerings - a genuine part-to-whole split, which is
   * the only case a donut earns its place.
   */
  protected readonly offeringMixData = computed<ChartDatum[]>(() => {
    const s = this.summary();
    if (!s) {
      return [];
    }
    return [
      { label: 'Active', value: s.totalActiveOfferings, color: 'var(--color-chart-1)' },
      { label: 'Archived', value: s.totalArchivedOfferings, color: 'var(--color-chart-2)' },
    ];
  });

  protected readonly totalOfferings = computed(() => {
    const s = this.summary();
    return s ? s.totalActiveOfferings + s.totalArchivedOfferings : 0;
  });

  /** How far the department is toward a publishable, anonymised score. */
  protected readonly anonymityProgress = computed(() => {
    const s = this.summary();
    if (!s) {
      return 0;
    }
    return Math.min(100, (s.totalEvaluationsSubmitted / this.minimumRespondents) * 100);
  });

  ngOnInit(): void {
    this.reportingService.getReports().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load your department summary.');
        this.loading.set(false);
      },
    });
  }
}
