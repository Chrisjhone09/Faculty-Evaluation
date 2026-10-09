import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GuidanceFacultyPerformanceRowDto } from '../../../core/models/guidance.models';
import { GuidanceReportingService } from '../services/guidance-reporting.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination, SortHeader, TableSearch } from '../../../shared/tables/table-parts';
import { createTableState } from '../../../shared/tables/table-state';

type FacultyTab = 'all' | 'flagged';
type SortKey = 'name' | 'department' | 'submitted' | 'rating' | 'rapid';

/**
 * Cross-department faculty performance for Guidance.
 *
 * This page absorbed the former standalone "Flagged Faculty" page, which was
 * this same list with `isFlagged` applied - a whole nav entry and route for
 * one predicate. It's now a tab, so the flagged view keeps its own URL
 * (?tab=flagged) and shows a live count, while sharing this page's search,
 * department filter, sorting and pagination instead of reimplementing them.
 */
@Component({
  selector: 'app-guidance-faculty-performance',
  imports: [RouterLink, PageHeader, EmptyState, Icon, SortHeader, TableSearch, Pagination],
  templateUrl: './guidance-faculty-performance.html',
})
export class GuidanceFacultyPerformance implements OnInit {
  private readonly reportingService = inject(GuidanceReportingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Mirrors back/Domain/Constants/EvaluationAnonymity.cs MinimumRespondents. */
  protected readonly minimumRespondents = 5;

  protected readonly rows = signal<GuidanceFacultyPerformanceRowDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedDepartmentId = signal<string>(this.route.snapshot.queryParamMap.get('department') ?? '');

  private readonly queryTab = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly activeTab = computed<FacultyTab>(() =>
    this.queryTab().get('tab') === 'flagged' ? 'flagged' : 'all',
  );

  protected readonly flaggedCount = computed(() => this.rows().filter((r) => r.isFlagged).length);

  protected readonly departments = computed(() => {
    const seen = new Map<string, string>();
    for (const row of this.rows()) {
      seen.set(row.departmentId, row.departmentName);
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /** Tab + department filter feed the shared table state as predicates. */
  private readonly filters = computed(() => {
    const departmentId = this.selectedDepartmentId();
    const flaggedOnly = this.activeTab() === 'flagged';
    return [
      (row: GuidanceFacultyPerformanceRowDto) => !departmentId || row.departmentId === departmentId,
      (row: GuidanceFacultyPerformanceRowDto) => !flaggedOnly || row.isFlagged,
    ];
  });

  protected readonly table = createTableState<GuidanceFacultyPerformanceRowDto, SortKey>(this.rows, {
    searchFields: (row) => [row.instructorName, row.departmentName, row.employeeNumber],
    initialSort: { key: 'name', direction: 'asc' },
    filters: this.filters,
    pageSize: 15,
    comparators: {
      name: (a, b) => a.instructorName.localeCompare(b.instructorName),
      department: (a, b) => a.departmentName.localeCompare(b.departmentName),
      submitted: (a, b) => a.evaluationsSubmittedCount - b.evaluationsSubmittedCount,
      // Instructors without a visible score sort last regardless of direction.
      rating: (a, b) => (a.averageRating ?? -1) - (b.averageRating ?? -1),
      rapid: (a, b) => (a.rapidAppraisalAverageRating ?? -1) - (b.rapidAppraisalAverageRating ?? -1),
    },
  });

  ngOnInit(): void {
    this.reportingService.getFacultyPerformance().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load faculty performance.');
        this.loading.set(false);
      },
    });
  }

  protected selectTab(tab: FacultyTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'all' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.table.goToPage(1);
  }

  protected onDepartmentChange(event: Event): void {
    this.selectedDepartmentId.set((event.target as HTMLSelectElement).value);
    this.table.goToPage(1);
  }

  protected clearFilters(): void {
    this.selectedDepartmentId.set('');
    this.table.clearSearch();
  }

  protected readonly hasActiveFilters = computed(
    () => this.selectedDepartmentId() !== '' || this.table.search().trim() !== '',
  );
}
