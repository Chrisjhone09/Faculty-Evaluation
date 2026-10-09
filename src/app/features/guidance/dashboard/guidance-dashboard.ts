import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, combineLatest, of, startWith, switchMap, tap } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { GuidanceAnalyticsDto, GuidanceFacultyPerformanceRowDto } from '../../../core/models/guidance.models';
import { DepartmentDto } from '../../../core/models/admin.models';
import { AnalyticsChart } from '../../../shared/charts/analytics-chart';
import { Icon } from '../../../shared/components/icon/icon';
import { GuidanceReportingService } from '../services/guidance-reporting.service';
import { AdminDepartmentsService } from '../../admin/services/admin-departments.service';

const COLORS = ['#0f766e', '#3b82f6', '#f59e0b', '#e06479', '#64748b', '#8b5cf6'];
const AXES = {
  x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 0, maxTicksLimit: 8 } },
  y: { beginAtZero: true, grid: { color: '#eef0f2' }, border: { display: false }, ticks: { color: '#6b7280', precision: 0 } },
};

@Component({
  selector: 'app-guidance-dashboard',
  imports: [RouterLink, DecimalPipe, Icon, AnalyticsChart],
  templateUrl: './guidance-dashboard.html',
  styleUrls: ['./dashboard-charts.css', './guidance-dashboard.css'],
})
export class GuidanceDashboard implements OnInit {
  private readonly reporting = inject(GuidanceReportingService);
  private readonly departmentService = inject(AdminDepartmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshTrigger = new Subject<void>();
  protected readonly analytics = signal<GuidanceAnalyticsDto | null>(null);
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly faculty = signal<GuidanceFacultyPerformanceRowDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedDepartment = signal('');
  protected readonly selectedPeriod = signal('');
  protected readonly updatedAt = signal('');
  protected readonly completion = computed(() => {
    const a = this.analytics();
    return a?.eligible ? Math.round(a.completed / a.eligible * 100) : 0;
  });
  protected readonly flagged = computed(() => this.faculty().filter(f => f.isFlagged &&
    (!this.selectedDepartment() || f.departmentId === this.selectedDepartment())));
  protected readonly facultyCount = computed(() => this.analytics()?.departments.reduce((n, d) => n + d.facultyCount, 0) ?? 0);

  protected readonly trendChart = computed<ChartConfiguration>(() => ({
    type: 'line',
    data: { labels: this.analytics()?.trend.map(p => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) ?? [],
      datasets: [{ label: 'Submissions', data: this.analytics()?.trend.map(p => p.count) ?? [],
        borderColor: COLORS[0], backgroundColor: '#0f766e14', fill: true, tension: 0.25,
        pointRadius: 3, pointHoverRadius: 6, borderWidth: 2 }] },
    options: { plugins: { legend: { display: false } }, scales: AXES },
  }));
  protected readonly completionChart = computed<ChartConfiguration>(() => {
    const a = this.analytics();
    return { type: 'doughnut', data: { labels: ['Completed', 'Awaiting submission'],
      datasets: [{ data: [a?.completed ?? 0, Math.max(0, (a?.eligible ?? 0) - (a?.completed ?? 0))],
        backgroundColor: [COLORS[0], '#e9edf0'], borderWidth: 0, hoverOffset: 4 }] },
      options: { cutout: '78%', plugins: { legend: { display: false } } } };
  });
  protected readonly departmentChart = computed<ChartConfiguration>(() => ({
    type: 'bar', data: { labels: this.analytics()?.departments.map(d => d.name) ?? [],
      datasets: [{ label: 'Submitted', data: this.analytics()?.departments.map(d => d.submitted) ?? [],
        backgroundColor: COLORS, borderRadius: 4, maxBarThickness: 40 }] },
    options: { plugins: { legend: { display: false } }, scales: AXES },
  }));
  protected readonly scoreChart = computed<ChartConfiguration>(() => {
    const rows = this.analytics()?.departments.filter(d => d.averageRating !== null) ?? [];
    return { type: 'bar', data: { labels: rows.map(d => d.name),
      datasets: [{ label: 'Average / 5', data: rows.map(d => d.averageRating), backgroundColor: COLORS[1], borderRadius: 4, maxBarThickness: 32 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, max: 5, grid: { color: '#eef0f2' } }, y: { grid: { display: false } } } } };
  });
  protected readonly hasScores = computed(() => this.analytics()?.departments.some(d => d.averageRating !== null));
  protected readonly hasSubmissions = computed(() => (this.analytics()?.submitted ?? 0) > 0);

  ngOnInit(): void {
    this.departmentService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => this.departments.set(rows),
    });
    this.reporting.getFacultyPerformance().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => this.faculty.set(rows),
    });
    combineLatest([this.route.queryParamMap, this.refreshTrigger.pipe(startWith(undefined))]).pipe(
      tap(([params]) => {
        this.selectedDepartment.set(params.get('department') ?? '');
        this.selectedPeriod.set(params.get('period') ?? '');
        this.loading.set(true); this.error.set(null);
      }),
      switchMap(() => this.reporting.getAnalytics(this.selectedPeriod(), this.selectedDepartment()).pipe(
        catchError(() => { this.error.set('Analytics could not be loaded. Try refreshing.'); return of(null); }),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(data => {
      this.analytics.set(data);
      this.loading.set(false);
      if (data) this.updatedAt.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    });
  }

  protected filter(key: 'department' | 'period', value: string): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { [key]: value || null }, queryParamsHandling: 'merge' });
  }
  protected refresh(): void { this.refreshTrigger.next(); }
  protected exportCsv(): void {
    const a = this.analytics();
    if (!a) return;
    const rows = [
      ['Period', 'Department', 'Faculty', 'Submitted', 'Current eligible memberships', 'Completed', 'Average / 5', 'Rapid appraisal / 10'],
      ...a.departments.map(d => [a.periodName, d.name, d.facultyCount, d.submitted, d.eligible, d.completed, d.averageRating ?? '', d.rapidAppraisalAverageRating ?? '']),
    ];
    const csv = rows.map(row => row.map(value => {
      let text = String(value);
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'guidance-analytics.csv'; link.click();
    URL.revokeObjectURL(url);
  }
}
