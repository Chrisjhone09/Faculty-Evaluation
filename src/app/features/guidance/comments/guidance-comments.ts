import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Icon } from '../../../shared/components/icon/icon';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { QuestionType } from '../../../core/models/evaluation.models';
import { GuidanceCommentDto, GuidanceFacultyPerformanceRowDto } from '../../../core/models/guidance.models';
import { GuidanceReportingService } from '../services/guidance-reporting.service';

/**
 * Guidance can browse written comments at any respondent count.
 * Responses never include the student identity or submission time.
 */
@Component({
  selector: 'app-guidance-comments',
  imports: [Icon, PageHeader],
  templateUrl: './guidance-comments.html',
  styleUrl: './guidance-comments.css',
})
export class GuidanceComments implements OnInit {
  private readonly reportingService = inject(GuidanceReportingService);
  private readonly destroyRef = inject(DestroyRef);
  private commentsRequest?: Subscription;

  protected readonly QuestionType = QuestionType;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly comments = signal<GuidanceCommentDto[]>([]);
  protected readonly filtersError = signal<string | null>(null);

  /** Indices of rows currently showing their original (unfiltered) text. */
  protected readonly expandedOriginals = signal<ReadonlySet<number>>(new Set());

  protected readonly facultyRows = signal<GuidanceFacultyPerformanceRowDto[]>([]);
  protected readonly selectedDepartmentId = signal<string>('');
  protected readonly selectedInstructorId = signal<string>('');

  protected readonly departments = computed(() => {
    const seen = new Map<string, string>();
    for (const row of this.facultyRows()) {
      seen.set(row.departmentId, row.departmentName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly instructors = computed(() =>
    this.facultyRows()
      .filter((r) => !this.selectedDepartmentId() || r.departmentId === this.selectedDepartmentId())
      .map((r) => ({ id: r.instructorId, name: r.instructorName }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.filtersError.set(null);
    this.reportingService.getFacultyPerformance().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => this.facultyRows.set(rows),
      error: () => this.filtersError.set('Could not load comment filters.'),
    });

    this.loadComments();
  }

  protected onDepartmentChange(event: Event): void {
    this.selectedDepartmentId.set((event.target as HTMLSelectElement).value);
    this.selectedInstructorId.set('');
    this.loadComments();
  }

  protected onInstructorChange(event: Event): void {
    this.selectedInstructorId.set((event.target as HTMLSelectElement).value);
    this.loadComments();
  }

  protected isOriginalExpanded(index: number): boolean {
    return this.expandedOriginals().has(index);
  }

  protected toggleOriginal(index: number): void {
    this.expandedOriginals.update((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  protected loadComments(): void {
    this.commentsRequest?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.expandedOriginals.set(new Set());
    this.comments.set([]);

    this.commentsRequest = this.reportingService.getComments(this.selectedDepartmentId() || null, this.selectedInstructorId() || null)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.comments.set(result.comments);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load comments.');
        this.loading.set(false);
      },
    });
  }
}
