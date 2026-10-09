import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StudentEvaluationDto, StudentEvaluationsResultDto } from '../../../core/models/evaluation.models';
import { StudentEvaluationsService } from '../services/student-evaluations.service';

/**
 * Real data as of the evaluation-submission phase: GET /api/students/me/evaluations
 * returns the student's own Approved class memberships for the currently
 * Active EvaluationPeriod, split into Pending/Completed. Eligibility is
 * always based on approved class membership, never on picking an instructor
 * yourself (architecture doc §6.1).
 */
@Component({
  selector: 'app-student-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './student-dashboard.html',
})
export class StudentDashboard implements OnInit {
  private readonly evaluationsService = inject(StudentEvaluationsService);

  protected readonly result = signal<StudentEvaluationsResultDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly pending = () => this.result()?.pending ?? [];
  protected readonly completed = () => this.result()?.completed ?? [];

  ngOnInit(): void {
    this.evaluationsService.getMine().subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load your evaluations.');
        this.loading.set(false);
      },
    });
  }

  protected trackByMembership(_: number, item: StudentEvaluationDto): string {
    return item.classMembershipId;
  }
}
