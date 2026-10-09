import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FacultyPerformanceRowDto } from '../../../core/models/dean.models';
import { DeanReportingService } from '../services/dean-reporting.service';

@Component({
  selector: 'app-dean-faculty-performance',
  imports: [RouterLink],
  templateUrl: './dean-faculty-performance.html',
})
export class DeanFacultyPerformance implements OnInit {
  private readonly reportingService = inject(DeanReportingService);

  /** Mirrors back/Domain/Constants/EvaluationAnonymity.cs MinimumRespondents. */
  protected readonly minimumRespondents = 5;

  protected readonly rows = signal<FacultyPerformanceRowDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

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
}
