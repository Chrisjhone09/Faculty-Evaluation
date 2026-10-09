import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GuidanceFlaggedFacultyDto } from '../../../core/models/guidance.models';
import { GuidanceReportingService } from '../services/guidance-reporting.service';

/**
 * Instructors whose aggregated rating is at/below back/Domain/Constants/
 * FacultyFlagging.cs's thresholds. Never includes anyone below the
 * anonymity threshold - see GuidanceReportingService.IsFlagged.
 */
@Component({
  selector: 'app-guidance-flagged-faculty',
  imports: [RouterLink],
  templateUrl: './guidance-flagged-faculty.html',
})
export class GuidanceFlaggedFaculty implements OnInit {
  private readonly reportingService = inject(GuidanceReportingService);

  protected readonly rows = signal<GuidanceFlaggedFacultyDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.reportingService.getFlaggedFaculty().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load flagged faculty.');
        this.loading.set(false);
      },
    });
  }
}
