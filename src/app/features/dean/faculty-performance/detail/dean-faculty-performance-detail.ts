import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FacultyPerformanceDetailDto } from '../../../../core/models/dean.models';
import { DeanReportingService } from '../../services/dean-reporting.service';

/**
 * Anonymized evaluation results for one instructor (architecture doc §6.3).
 * The API itself withholds category/question ratings and comments below the
 * minimum-respondent threshold - this page just reflects that, it doesn't
 * enforce anything client-side. Comments here are the AI-reconstructed
 * display text when flagged negative - never the raw original (that's
 * Guidance-only, see GuidanceFacultyPerformanceDetail).
 */
@Component({
  selector: 'app-dean-faculty-performance-detail',
  imports: [RouterLink],
  templateUrl: './dean-faculty-performance-detail.html',
})
export class DeanFacultyPerformanceDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportingService = inject(DeanReportingService);

  private readonly instructorId = this.route.snapshot.paramMap.get('instructorId')!;

  protected readonly detail = signal<FacultyPerformanceDetailDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // --- AI summary - generated only when the button below is clicked. ---
  protected readonly summary = signal<string | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);

  ngOnInit(): void {
    this.reportingService.getFacultyPerformanceDetail(this.instructorId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load evaluation results.');
        this.loading.set(false);
      },
    });
  }

  protected generateSummary(): void {
    this.summaryLoading.set(true);
    this.summaryError.set(null);

    this.reportingService.generateFacultySummary(this.instructorId).subscribe({
      next: (result) => {
        this.summary.set(result.summary);
        this.summaryLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.summaryError.set(error.error?.detail ?? 'Could not generate a summary right now.');
        this.summaryLoading.set(false);
      },
    });
  }
}
