import { Component, OnInit, inject, signal } from '@angular/core';
import { DeanReportsSummaryDto } from '../../../core/models/dean.models';
import { DeanReportingService } from '../services/dean-reporting.service';

@Component({
  selector: 'app-dean-reports',
  templateUrl: './dean-reports.html',
})
export class DeanReports implements OnInit {
  private readonly reportingService = inject(DeanReportingService);

  protected readonly summary = signal<DeanReportsSummaryDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.reportingService.getReports().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load department reports.');
        this.loading.set(false);
      },
    });
  }
}
